import { fetchComicFromUrl } from '../src/controllers/whakoomController.js';
import { normalizeComicForInsert } from '../src/utils/normalizeComic.js';
import { db } from '../src/server.js';

const url = 'https://www.whakoom.com/ediciones/529737/la_balada_de_halo_jones-cartone_228_pp';

const fetchData = () => new Promise((resolve, reject) => {
  const req = { body: { url } };
  const res = {
    json: (data) => resolve({ status: 200, data }),
    status(code) { this._status = code; return this; },
    send: (d) => resolve({ status: this._status || 200, data: d }),
  };

  try {
    const p = fetchComicFromUrl(req, res);
    // In case controller throws synchronously
    if (p && typeof p.then === 'function') p.then(() => {}).catch(reject);
  } catch (e) { reject(e); }
});

(async () => {
  try {
    console.log('Fetching and extracting from URL:', url);
    const result = await fetchData();
    if (!result || !result.data) {
      console.error('No data returned', result);
      process.exit(1);
    }
    const comic = result.data;
    console.log('Extracted:', comic.title, comic.issueNumber);
    console.log('Debug authors:', comic._debugAuthors || {});

    // Duplicate check
    const query = db.collection('comics').where('title', '==', comic.title);
    const snapshot = await query.get();
    let isDuplicate = false;
    if (!snapshot.empty) {
      if (comic.issueNumber !== undefined && comic.issueNumber !== null) {
        isDuplicate = snapshot.docs.some(doc => doc.data().issueNumber === comic.issueNumber);
      } else {
        isDuplicate = true;
      }
    }

    if (isDuplicate) {
      console.log('Aborting import: duplicate found');
      process.exit(0);
    }

    const normalized = normalizeComicForInsert(comic);
    const toInsert = { ...normalized, createdAt: new Date(), updatedAt: new Date() };
    const docRef = await db.collection('comics').add(toInsert);
    console.log('Inserted with id:', docRef.id);
    process.exit(0);
  } catch (err) {
    console.error('Error during import:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
