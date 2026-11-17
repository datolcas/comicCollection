import { normalizeComicForInsert } from '../utils/normalizeComic.js';
import { comicsCache, setCacheDb, isDuplicateComic } from '../services/collectionCache.js';

// DB is injected from server startup or tests via __setDb
let DB = null;
export const __setDb = (db) => {
  DB = db;
  setCacheDb(db);
};

const COLLECTION = 'comics';

// Fields the client must never overwrite on update
const PROTECTED_FIELDS = ['_id', 'createdAt'];

const toMillis = (v) => {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'object' && (v.seconds || v._seconds)) return (v.seconds || v._seconds) * 1000;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const sortComicsInMemory = (comics, sort) => {
  if (sort === 'rating') {
    return comics.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
  if (sort === 'title') {
    return comics.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }
  return comics.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
};

// Get all comics with filtering and search (served from the in-memory cache)
export const getAllComics = async (req, res) => {
  try {
    const { search, author, series, status, genre, sort } = req.query;
    const pageParam = req.query.page ? Math.max(parseInt(req.query.page, 10), 1) : null;
    const rawLimit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const limit = rawLimit || (pageParam ? 50 : null);
    const page = pageParam || 1;
    const offset = limit ? (page - 1) * limit : 0;

    let filtered = await comicsCache.all();

    // Exclude sold comics by default unless the client explicitly requests sold items
    const includeSold = req.query.sold === 'true' || req.query.sold === '1';
    if (!includeSold) filtered = filtered.filter((c) => c.sold !== true);

    if (status) filtered = filtered.filter((c) => c.readingStatus === status);
    if (author) filtered = filtered.filter((c) => c.author === author);
    if (series) filtered = filtered.filter((c) => c.series === series);
    if (genre) filtered = filtered.filter((c) => Array.isArray(c.genre) && c.genre.includes(genre));

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title?.toLowerCase().includes(lowerSearch) ||
          c.author?.toLowerCase().includes(lowerSearch)
      );
    }

    filtered = sortComicsInMemory(filtered, sort);

    if (limit) {
      const data = filtered.slice(offset, offset + limit);
      return res.json({ data, hasMore: filtered.length > offset + limit });
    }

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comics', error: error.message });
  }
};

// Get single comic
export const getComic = async (req, res) => {
  try {
    const comic = await comicsCache.get(req.params.id);
    if (!comic) {
      return res.status(404).json({ message: 'Comic not found' });
    }
    res.json(comic);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comic', error: error.message });
  }
};

// Create comic
export const createComic = async (req, res) => {
  try {
    const { title, issueNumber } = req.body;

    if (await isDuplicateComic(title, issueNumber)) {
      const issueInfo = issueNumber ? ` #${issueNumber}` : '';
      return res.status(409).json({
        message: `Este cómic ya existe en tu colección: "${title}"${issueInfo}. No se pueden agregar duplicados.`
      });
    }

    const { _id, ...body } = req.body;
    const normalized = normalizeComicForInsert(body);
    const comicData = {
      ...normalized,
      createdAt: new Date(),
      updatedAt: new Date(),
      sold: normalized.sold === true,
    };
    const docRef = await DB.collection(COLLECTION).add(comicData);
    res.status(201).json(comicsCache.set(docRef.id, comicData));
  } catch (error) {
    res.status(400).json({ message: 'Error creating comic', error: error.message });
  }
};

// Update comic
export const updateComic = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await comicsCache.get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Comic not found' });
    }

    const body = { ...req.body };
    PROTECTED_FIELDS.forEach((f) => delete body[f]);
    const updateData = {
      ...normalizeComicForInsert(body),
      updatedAt: new Date(),
    };
    await DB.collection(COLLECTION).doc(id).update(updateData);
    comicsCache.merge(id, updateData);
    res.json((await comicsCache.get(id)) || { ...existing, ...updateData });
  } catch (error) {
    res.status(400).json({ message: 'Error updating comic', error: error.message });
  }
};

// Delete comic
export const deleteComic = async (req, res) => {
  try {
    await DB.collection(COLLECTION).doc(req.params.id).delete();
    comicsCache.remove(req.params.id);
    res.json({ message: 'Comic deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting comic', error: error.message });
  }
};

// Get statistics
export const getStatistics = async (req, res) => {
  try {
    // Exclude sold comics from statistics (they shouldn't count towards series/authors/locations)
    const comics = (await comicsCache.all()).filter((c) => c.sold !== true);

    const totalComics = comics.length;
    const completedComics = comics.filter((c) => c.readingStatus === 'completed').length;
    const avgRating =
      comics.filter((c) => c.rating).reduce((sum, c) => sum + (c.rating || 0), 0) /
        (comics.filter((c) => c.rating).length || 1) || 0;

    // Genre statistics
    const genreStats = {};
    comics.forEach((c) => {
      c.genre?.forEach((g) => {
        genreStats[g] = (genreStats[g] || 0) + 1;
      });
    });

    const genreArray = Object.entries(genreStats)
      .map(([genre, count]) => ({ _id: genre, count }))
      .sort((a, b) => b.count - a.count);

    // Author statistics
    const authorStats = {};
    comics.forEach((c) => {
      if (c.author) {
        authorStats[c.author] = (authorStats[c.author] || 0) + 1;
      }
    });

    const authorArray = Object.entries(authorStats)
      .map(([author, count]) => ({ _id: author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      totalComics,
      completedComics,
      readingPercentage: totalComics > 0 ? ((completedComics / totalComics) * 100).toFixed(2) : 0,
      avgRating: avgRating.toFixed(2),
      genreStats: genreArray,
      topAuthors: authorArray,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
};

// Export comics as JSON
export const exportComics = async (req, res) => {
  try {
    const comics = await comicsCache.all();

    // Normalize exported comics for consistency
    const normalized = comics.map(c => normalizeComicForInsert(c));

    // Support CSV export when ?format=csv is provided
    const format = req.query.format;
    if (format === 'csv') {
      // We must produce 12 columns. Relevant fields (1,2,4,6,12) are filled.
      const header = [
        'ID', // 1
        'Título de la serie', // 2
        '', // 3
        'Número de volumen', // 4
        '', // 5
        'Editorial', // 6
        '', // 7
        '', // 8
        '', // 9
        '', // 10
        '', // 11
        'Fecha de lectura', // 12
      ];

      const toDate = (v) => {
        if (!v) return null;
        // Firestore Timestamp-like
        if (typeof v === 'object' && v.seconds) {
          return new Date(v.seconds * 1000);
        }
        // Date instance
        if (v instanceof Date) return v;
        // numeric (ms) or ISO string
        const n = Number(v);
        if (!Number.isNaN(n)) return new Date(n);
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
      };

      const rows = [];
      // CSV header
      const escapeCell = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
      rows.push(header.map(h => escapeCell(h)).join(','));

      normalized.forEach((c, idx) => {
        const cols = new Array(12).fill('');
        // Column 1: numeric ID (sequential export ID)
        cols[0] = String(idx + 1);
        // Column 2: series name (exact collection name)
        cols[1] = c.series || '';
        // Column 4: volume / issue number
        cols[3] = (c.issueNumber !== undefined && c.issueNumber !== null) ? String(c.issueNumber) : '';
        // Column 6: publisher/editorial
        cols[5] = c.publisher || '';
        // Column 12: reading date formatted dd/mm/yyyy (use readingEndDate if present)
        const date = toDate(c.readingEndDate || c.readingDate || c.reading_end_date || c.readDate);
        if (date) {
          const dd = String(date.getDate()).padStart(2, '0');
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const yyyy = date.getFullYear();
          cols[11] = `${dd}/${mm}/${yyyy}`;
        }

        rows.push(cols.map(escapeCell).join(','));
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=comics-export.csv');
      return res.send(rows.join('\n'));
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=comics-export.json');
    res.send(JSON.stringify(normalized, null, 2));
  } catch (error) {
    res.status(500).json({ message: 'Error exporting comics', error: error.message });
  }
};

// Import comics from JSON (batched writes, cache updated in place)
export const importComics = async (req, res) => {
  try {
    const comics = req.body;
    if (!Array.isArray(comics)) {
      return res.status(400).json({ message: 'Invalid format, expected an array of comics' });
    }

    const BATCH_SIZE = 400; // Firestore allows up to 500 writes per batch
    let importedCount = 0;
    for (let i = 0; i < comics.length; i += BATCH_SIZE) {
      const batch = DB.batch();
      const created = [];
      for (const comic of comics.slice(i, i + BATCH_SIZE)) {
        const { _id, ...comicData } = comic;
        const data = {
          ...normalizeComicForInsert(comicData),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const ref = DB.collection(COLLECTION).doc();
        batch.set(ref, data);
        created.push([ref.id, data]);
      }
      await batch.commit();
      created.forEach(([id, data]) => comicsCache.set(id, data));
      importedCount += created.length;
    }

    res.status(201).json({ message: `${importedCount} comics imported successfully` });
  } catch (error) {
    res.status(400).json({ message: 'Error importing comics', error: error.message });
  }
};
