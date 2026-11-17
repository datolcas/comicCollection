// Minimal in-memory Firestore mock covering the API used by the backend.
// It counts billed operations so tests can assert how many reads each action costs.

export class MockTimestamp {
  constructor(date) {
    this.date = new Date(date);
  }
  toDate() {
    return this.date;
  }
}

export const createMockFirestore = (initial = {}) => {
  const store = {};
  for (const [name, docs] of Object.entries(initial)) {
    store[name] = new Map(Object.entries(docs));
  }
  const stats = { reads: 0, writes: 0, collectionGets: {} };
  let seq = 0;
  const nextId = () => `auto${++seq}`;
  const col = (name) => (store[name] ??= new Map());

  const docRef = (name, id = nextId()) => ({
    id,
    async get() {
      stats.reads += 1;
      const data = col(name).get(id);
      return { id, exists: data !== undefined, data: () => data };
    },
    async set(data) {
      stats.writes += 1;
      col(name).set(id, { ...data });
    },
    async update(data) {
      stats.writes += 1;
      if (!col(name).has(id)) throw new Error(`NOT_FOUND: ${name}/${id}`);
      col(name).set(id, { ...col(name).get(id), ...data });
    },
    async delete() {
      stats.writes += 1;
      col(name).delete(id);
    },
  });

  const db = {
    collection(name) {
      return {
        async get() {
          const entries = [...col(name).entries()];
          stats.reads += entries.length;
          stats.collectionGets[name] = (stats.collectionGets[name] || 0) + 1;
          const docs = entries.map(([id, data]) => ({ id, data: () => data }));
          return { docs, empty: docs.length === 0, size: docs.length, forEach: (fn) => docs.forEach(fn) };
        },
        async add(data) {
          stats.writes += 1;
          const id = nextId();
          col(name).set(id, { ...data });
          return { id };
        },
        doc(id) {
          return docRef(name, id);
        },
      };
    },
    batch() {
      const ops = [];
      return {
        set(ref, data) {
          ops.push(() => ref.set(data));
        },
        async commit() {
          for (const op of ops) await op();
        },
      };
    },
  };

  return { db, store, stats };
};
