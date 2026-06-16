// DB is injected from server startup or tests via __setDb
let DB = null;
export const __setDb = (mockDb) => {
  DB = mockDb;
};

const COLLECTION = 'comics';

// Simple in-memory cache
let comicsCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const isCacheValid = () => {
  return comicsCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_TTL;
};

const getCachedComics = () => {
  if (isCacheValid()) {
    console.log('Returning cached comics');
    return comicsCache;
  }
  return null;
};

const setCachedComics = (comics) => {
  comicsCache = comics;
  cacheTimestamp = Date.now();
  console.log('Comics cached');
};

const invalidateCache = () => {
  comicsCache = null;
  cacheTimestamp = null;
};

const checkDuplicateComic = async (title, issueNumber) => {
  try {
    // Query by title (case-insensitive comparison will be done in JavaScript)
    const query = DB.collection(COLLECTION).where('title', '==', title);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return false; // No duplicate found
    }

    // If issueNumber is provided (including 0), check for exact match with same issue number
    if (issueNumber !== undefined && issueNumber !== null) {
      const exactMatch = snapshot.docs.some((doc) => doc.data().issueNumber === issueNumber);
      return exactMatch;
    }

    // If no issueNumber provided, any comic with same title is a duplicate
    return true;
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return false;
  }
};

const applySortToQuery = (query, sort) => {
  if (sort === 'rating') {
    return query.orderBy('rating', 'desc');
  }
  if (sort === 'title') {
    return query.orderBy('title', 'asc');
  }
  return query.orderBy('createdAt', 'desc');
};

const sortComicsInMemory = (comics, sort) => {
  if (sort === 'rating') {
    return comics.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
  if (sort === 'title') {
    return comics.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }
  return comics.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

// Get all comics with filtering and search
export const getAllComics = async (req, res) => {
  try {
      const { search, author, series, status, genre, sort } = req.query;
      const pageParam = req.query.page ? Math.max(parseInt(req.query.page, 10), 1) : null;
    const rawLimit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const limit = rawLimit || (pageParam ? 50 : null);
    const page = pageParam || 1;
    const offset = limit ? (page - 1) * limit : 0;

    let comics = null;
    // Only use cache for the default collection view (no search/genre/pagination/limit/sold filter)
    const useCache = !search && !genre && !limit && !req.query.page && !req.query.sold;
    if (useCache) {
      comics = getCachedComics();
    }

    if (!comics) {
      let query = DB.collection(COLLECTION);

      if (status) {
        query = query.where('readingStatus', '==', status);
      }
      if (author) {
        query = query.where('author', '==', author);
      }
      if (series) {
        query = query.where('series', '==', series);
      }
      if (genre) {
        query = query.where('genre', 'array-contains', genre);
      }

      if (limit && !search) {
        query = applySortToQuery(query, sort).offset(offset).limit(limit + 1);
      } else {
        query = applySortToQuery(query, sort);
      }

      const snapshot = await query.get();
      comics = [];

      snapshot.forEach((doc) => {
        comics.push({ _id: doc.id, ...doc.data() });
      });

      // Cache only the default (non-sold) collection view
      if (useCache) {
        const nonSold = comics.filter((c) => c.sold !== true);
        setCachedComics(nonSold);
        // Keep in-memory result as the full list but further below we'll filter sold out
      }
    }

    let filtered = comics;

    // Exclude sold comics by default unless the client explicitly requests sold items
    const includeSold = req.query.sold === 'true' || req.query.sold === '1';
    if (!includeSold) {
      filtered = filtered.filter((c) => c.sold !== true);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title?.toLowerCase().includes(lowerSearch) ||
          c.author?.toLowerCase().includes(lowerSearch)
      );
    }

    let hasMore = false;
    if (limit) {
      if (search || genre) {
        const pageItems = filtered.slice(offset, offset + limit);
        hasMore = filtered.length > offset + limit;
        filtered = pageItems;
      } else if (filtered.length > limit) {
        hasMore = true;
        filtered = filtered.slice(0, limit);
      }
    }

    if (limit) {
      return res.json({ data: filtered, hasMore });
    }

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comics', error: error.message });
  }
};

// Get single comic
export const getComic = async (req, res) => {
  try {
    const doc = await DB.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Comic not found' });
    }
    res.json({ _id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comic', error: error.message });
  }
};

// Create comic
export const createComic = async (req, res) => {
  try {
    const { title, issueNumber } = req.body;

    // Check for duplicate comic
    const isDuplicate = await checkDuplicateComic(title, issueNumber);
    if (isDuplicate) {
      const issueInfo = issueNumber ? ` #${issueNumber}` : '';
      return res.status(409).json({ 
        message: `Este cómic ya existe en tu colección: "${title}"${issueInfo}. No se pueden agregar duplicados.`
      });
    }

    const { normalizeComicForInsert } = await import('../utils/normalizeComic.js');
    const normalized = normalizeComicForInsert(req.body);
    const comicData = {
      ...normalized,
      createdAt: new Date(),
      updatedAt: new Date(),
      sold: normalized.sold === true,
    };
    const docRef = await DB.collection(COLLECTION).add(comicData);
    invalidateCache();
    res.status(201).json({ _id: docRef.id, ...comicData });
  } catch (error) {
    res.status(400).json({ message: 'Error creating comic', error: error.message });
  }
};

// Update comic
export const updateComic = async (req, res) => {
  try {
    const { normalizeComicForInsert } = await import('../utils/normalizeComic.js');
    const normalized = normalizeComicForInsert(req.body);
    const updateData = {
      ...normalized,
      updatedAt: new Date(),
    };
    await DB.collection(COLLECTION).doc(req.params.id).update(updateData);
    invalidateCache();
    const doc = await DB.collection(COLLECTION).doc(req.params.id).get();
    res.json({ _id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(400).json({ message: 'Error updating comic', error: error.message });
  }
};

// Delete comic
export const deleteComic = async (req, res) => {
  try {
    await DB.collection(COLLECTION).doc(req.params.id).delete();
    invalidateCache();
    res.json({ message: 'Comic deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting comic', error: error.message });
  }
};

// Get statistics
export const getStatistics = async (req, res) => {
  try {
    const snapshot = await DB.collection(COLLECTION).get();
    const comics = [];

    // Exclude sold comics from statistics (they shouldn't count towards series/authors/locations)
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data?.sold !== true) {
        comics.push(data);
      }
    });

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
    const snapshot = await DB.collection(COLLECTION).get();
    const comics = [];

    snapshot.forEach((doc) => {
      comics.push({ _id: doc.id, ...doc.data() });
    });

    // Normalize exported comics for consistency
    const { normalizeComicForInsert } = await import('../utils/normalizeComic.js');
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

// Import comics from JSON
export const importComics = async (req, res) => {
  try {
    const comics = req.body;
    if (!Array.isArray(comics)) {
      return res.status(400).json({ message: 'Invalid format, expected an array of comics' });
    }

    let importedCount = 0;
    for (const comic of comics) {
        const { _id, ...comicData } = comic;
        // Normalize before inserting
        const { normalizeComicForInsert } = await import('../utils/normalizeComic.js');
        const normalized = normalizeComicForInsert(comicData);
        await DB.collection(COLLECTION).add({
          ...normalized,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      importedCount++;
    }

    res.status(201).json({ message: `${importedCount} comics imported successfully` });
  } catch (error) {
    res.status(400).json({ message: 'Error importing comics', error: error.message });
  }
};
