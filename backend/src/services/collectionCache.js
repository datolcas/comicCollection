// In-memory, write-through cache of whole Firestore collections.
//
// This backend is the only writer of these collections, so once a collection is
// loaded (one read per document) every later request is served from memory and
// every write updates the cache in place instead of invalidating it. Firestore
// reads only happen again after a process restart.

let DB = null;

// Convert Firestore Timestamps to JS Dates so cached data is consistent with
// values written by this process (both serialize to ISO strings in JSON).
const normalizeValue = (v) => {
  if (v && typeof v === 'object' && typeof v.toDate === 'function') return v.toDate();
  return v;
};

const normalizeDoc = (data) => {
  const out = {};
  for (const [k, v] of Object.entries(data || {})) out[k] = normalizeValue(v);
  return out;
};

export class CollectionCache {
  constructor(name) {
    this.name = name;
    this.items = null; // Map<id, doc>
    this.loading = null; // Promise while the initial load is in flight
    this.pendingOps = []; // writes that happened during the initial load
  }

  ref() {
    return DB.collection(this.name);
  }

  async load() {
    if (this.items) return this.items;
    if (!this.loading) {
      this.pendingOps = [];
      this.loading = this.ref()
        .get()
        .then((snapshot) => {
          const map = new Map();
          snapshot.forEach((doc) => map.set(doc.id, { _id: doc.id, ...normalizeDoc(doc.data()) }));
          this.items = map;
          // Replay writes made while the snapshot was loading (they are idempotent)
          this.pendingOps.forEach((op) => op());
          this.pendingOps = [];
          console.log(`[cache] ${this.name}: loaded ${map.size} docs from Firestore`);
          return map;
        })
        .finally(() => {
          this.loading = null;
        });
    }
    return this.loading;
  }

  async all() {
    return Array.from((await this.load()).values());
  }

  async get(id) {
    return (await this.load()).get(id) || null;
  }

  // Apply a mutation now if loaded, or queue it if a load is in flight.
  // If nothing is loaded, the next load will read the fresh data anyway.
  apply(op) {
    if (this.items) op();
    else if (this.loading) this.pendingOps.push(op);
  }

  set(id, data) {
    const doc = { _id: id, ...normalizeDoc(data) };
    this.apply(() => this.items.set(id, doc));
    return doc;
  }

  merge(id, partial) {
    const normalized = normalizeDoc(partial);
    this.apply(() => {
      const prev = this.items.get(id);
      if (prev) this.items.set(id, { ...prev, ...normalized });
    });
  }

  remove(id) {
    this.apply(() => this.items.delete(id));
  }

  invalidate() {
    this.items = null;
  }
}

export const comicsCache = new CollectionCache('comics');
export const lecturasCache = new CollectionCache('lecturas');
export const usVolumesCache = new CollectionCache('usaVolumes');

const ALL_CACHES = [comicsCache, lecturasCache, usVolumesCache];

export const setCacheDb = (db) => {
  DB = db;
  ALL_CACHES.forEach((c) => c.invalidate());
};

// Duplicate = same title (case-insensitive) and, if provided, same issue number.
export const isDuplicateComic = async (title, issueNumber, excludeId = null) => {
  if (!title) return false;
  const wanted = String(title).trim().toLowerCase();
  const hasIssue = issueNumber !== undefined && issueNumber !== null && issueNumber !== '';
  const comics = await comicsCache.all();
  return comics.some((c) => {
    if (c._id === excludeId) return false;
    if (String(c.title || '').trim().toLowerCase() !== wanted) return false;
    return hasIssue ? String(c.issueNumber) === String(issueNumber) : true;
  });
};
