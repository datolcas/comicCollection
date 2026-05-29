const express = require('express');
const router = express.Router();
const { db } = require('../server.js');

const COLLECTION = 'lecturas';

// Crear lectura
router.post('/', async (req, res) => {
  try {
    const { comic, startDate, endDate } = req.body;
    
    if (!comic || !startDate) {
      return res.status(400).json({ error: 'Se requieren comic y startDate' });
    }

    const lecturaData = {
      comic,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection(COLLECTION).add(lecturaData);
    
    // Obtener el documento creado con la información del cómic
    const comicDoc = await db.collection('comics').doc(comic).get();
    const comicData = comicDoc.exists ? { _id: comicDoc.id, ...comicDoc.data() } : null;

    res.status(201).json({
      _id: docRef.id,
      ...lecturaData,
      comic: comicData,
    });
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
      const comicDoc = await db.collection('comics').doc(lecturaData.comic).get();
      const comicData = comicDoc.exists ? { _id: comicDoc.id, ...comicDoc.data() } : null;

      lecturas.push({
        _id: doc.id,
        ...lecturaData,
        comic: comicData,
      });
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

module.exports = router;
