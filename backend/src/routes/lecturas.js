import express from 'express';
import { db } from '../server.js';

const router = express.Router();
const COLLECTION = 'lecturas';

// Crear lectura
router.post('/', async (req, res) => {
  try {
    const { comic, startDate, endDate } = req.body;
    
    if (!comic || !startDate) {
      return res.status(400).json({ error: 'Se requieren comic y startDate' });
    }

    // Accept comic as id string or embedded object
    const comicId = typeof comic === 'string' ? comic : (comic._id || comic.id || null);

    const lecturaData = {
      comic: comicId || comic,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection(COLLECTION).add(lecturaData);
    
    // Obtener el documento creado con la información del cómic
    let comicData = null;
    if (comicId) {
      const comicDoc = await db.collection('comics').doc(comicId).get();
      comicData = comicDoc.exists ? { _id: comicDoc.id, ...comicDoc.data() } : null;
    } else if (typeof comic === 'object') {
      comicData = comic;
    }

    const resp = {
      _id: docRef.id,
      ...lecturaData,
      comic: comicData,
    };
    // Normalize date fields to ISO strings for the client
    resp.startDate = resp.startDate instanceof Date ? resp.startDate.toISOString() : resp.startDate;
    resp.endDate = resp.endDate instanceof Date ? resp.endDate.toISOString() : resp.endDate;
    resp.createdAt = resp.createdAt instanceof Date ? resp.createdAt.toISOString() : resp.createdAt;
    resp.updatedAt = resp.updatedAt instanceof Date ? resp.updatedAt.toISOString() : resp.updatedAt;

    res.status(201).json(resp);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Obtener lecturas
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION).get();
    const lecturas = [];

    for (const doc of snapshot.docs) {
      const lecturaData = doc.data();
      // lecturaData.comic may be an id string or an embedded object
      let comicData = null;
      const storedComic = lecturaData.comic;
      if (typeof storedComic === 'string') {
        const comicDoc = await db.collection('comics').doc(storedComic).get();
        comicData = comicDoc.exists ? { _id: comicDoc.id, ...comicDoc.data() } : null;
      } else if (typeof storedComic === 'object') {
        comicData = storedComic;
      }

      const item = { _id: doc.id, ...lecturaData, comic: comicData };
      // Normalize Firestore Timestamp objects to ISO strings
      const norm = (v) => {
        if (!v) return null;
        if (v instanceof Date) return v.toISOString();
        if (v._seconds || v.seconds) {
          const secs = v._seconds || v.seconds;
          return new Date(secs * 1000).toISOString();
        }
        return v;
      };
      item.startDate = norm(item.startDate);
      item.endDate = norm(item.endDate);
      item.createdAt = norm(item.createdAt);
      item.updatedAt = norm(item.updatedAt);

      lecturas.push(item);
    }

    res.json(lecturas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar lectura
router.put('/:id', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate) {
      return res.status(400).json({ error: 'Se requiere startDate' });
    }

    const updateData = {
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      updatedAt: new Date(),
    };

    await db.collection(COLLECTION).doc(req.params.id).update(updateData);
    
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    const lecturaData = doc.data();
    const comicDoc = await db.collection('comics').doc(lecturaData.comic).get();
    const comicData = comicDoc.exists ? { _id: comicDoc.id, ...comicDoc.data() } : null;

    res.json({
      _id: doc.id,
      ...lecturaData,
      comic: comicData,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar lectura
router.delete('/:id', async (req, res) => {
  try {
    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.json({ message: 'Lectura eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
