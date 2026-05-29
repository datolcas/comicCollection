import { db } from '../server.js';

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

// Check if a comic with the same title and issue number already exists
const checkDuplicateComic = async (title, issueNumber) => {
  try {
    // Query by title (case-insensitive comparison will be done in JavaScript)
    const query = db.collection(COLLECTION).where('title', '==', title);
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return false; // No duplicate found
    }

    // If issueNumber is provided, check for exact match with same issue number
    if (issueNumber) {
      const exactMatch = snapshot.docs.some(doc => doc.data().issueNumber === issueNumber);
      return exactMatch;
    }

    // If no issueNumber provided, any comic with same title is a duplicate
    return true;
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return false;
  }
};

// Get all comics with filtering and search
export const getAllComics = async (req, res) => {
  try {
    const { search, author, series, status, genre, sort } = req.query;
    
    // Try to get from cache first
    let comics = getCachedComics();
    
    if (!comics) {
      // Fetch from Firestore if not cached
      let query = db.collection(COLLECTION);

      // Apply filters
      if (status) {
        query = query.where('readingStatus', '==', status);
      }
      if (author) {
        query = query.where('author', '==', author);
      }
      if (series) {
        query = query.where('series', '==', series);
      }

      const snapshot = await query.get();
      comics = [];

      snapshot.forEach((doc) => {
        comics.push({ _id: doc.id, ...doc.data() });
      });
      
      // Cache the results
      setCachedComics(comics);
    }

    // Client-side filtering for search and genre (Firestore limitations)
    let filtered = comics;
    
    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.title?.toLowerCase().includes(search.toLowerCase()) ||
          c.author?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (genre) {
      filtered = filtered.filter((c) => c.genre?.includes(genre));
    }

    // Sorting
    if (sort === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'title') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      // Default: recent
      filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comics', error: error.message });
  }
};

// Get single comic
export const getComic = async (req, res) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
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

    const comicData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const docRef = await db.collection(COLLECTION).add(comicData);
    invalidateCache();
    res.status(201).json({ _id: docRef.id, ...comicData });
  } catch (error) {
    res.status(400).json({ message: 'Error creating comic', error: error.message });
  }
};

// Update comic
export const updateComic = async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };
    await db.collection(COLLECTION).doc(req.params.id).update(updateData);
    invalidateCache();
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    res.json({ _id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(400).json({ message: 'Error updating comic', error: error.message });
  }
};

// Delete comic
export const deleteComic = async (req, res) => {
  try {
    await db.collection(COLLECTION).doc(req.params.id).delete();
    invalidateCache();
    res.json({ message: 'Comic deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting comic', error: error.message });
  }
};

// Get statistics
export const getStatistics = async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION).get();
    const comics = [];

    snapshot.forEach((doc) => {
      comics.push(doc.data());
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
    const snapshot = await db.collection(COLLECTION).get();
    const comics = [];

    snapshot.forEach((doc) => {
      comics.push({ _id: doc.id, ...doc.data() });
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=comics-export.json');
    res.send(JSON.stringify(comics, null, 2));
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
      await db.collection(COLLECTION).add({
        ...comicData,
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
