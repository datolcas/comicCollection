import express from 'express';
import { comicsCache, lecturasCache, getDb } from '../services/collectionCache.js';

const router = express.Router();
const COLLECTION = 'lecturas';

const toIso = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object' && (v._seconds || v.seconds)) {
    return new Date((v._seconds || v.seconds) * 1000).toISOString();
  }
  return v;
};

// Build the client representation: dates as ISO strings and the comic resolved
// from the in-memory comics cache (no extra Firestore reads).
const toClient = async (lectura) => {
  const stored = lectura.comic;
  let comicData = null;
  if (typeof stored === 'string') {
    comicData = await comicsCache.get(stored);
  } else if (stored && typeof stored === 'object') {
    comicData = stored;
  }
  return {
    ...lectura,
    comic: comicData,
    startDate: toIso(lectura.startDate),
    endDate: toIso(lectura.endDate),
    createdAt: toIso(lectura.createdAt),
    updatedAt: toIso(lectura.updatedAt),
  };
};

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

    const docRef = await getDb().collection(COLLECTION).add(lecturaData);
    const cached = lecturasCache.set(docRef.id, lecturaData);

    res.status(201).json(await toClient(cached));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Obtener lecturas
router.get('/', async (req, res) => {
  try {
    const lecturas = await lecturasCache.all();
    res.json(await Promise.all(lecturas.map(toClient)));
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

    const existing = await lecturasCache.get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Lectura no encontrada' });
    }

    const updateData = {
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      updatedAt: new Date(),
    };

    await getDb().collection(COLLECTION).doc(req.params.id).update(updateData);
    lecturasCache.merge(req.params.id, updateData);

    const updated = (await lecturasCache.get(req.params.id)) || { ...existing, ...updateData };
    res.json(await toClient(updated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar lectura
router.delete('/:id', async (req, res) => {
  try {
    await getDb().collection(COLLECTION).doc(req.params.id).delete();
    lecturasCache.remove(req.params.id);
    res.json({ message: 'Lectura eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
