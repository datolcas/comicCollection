import express from 'express';
import {
  getAllComics,
  getComic,
  createComic,
  updateComic,
  deleteComic,
  getStatistics,
  exportComics,
  importComics,
} from '../controllers/comicController.js';
import { fetchComicFromUrl, loadComicsFromList } from '../controllers/whakoomController.js';

const router = express.Router();

// Routes
router.get('/', getAllComics);
router.get('/statistics', getStatistics);
router.get('/export', exportComics);
router.post('/import', importComics);
router.post('/fetch-from-url', fetchComicFromUrl);
router.post('/load-from-list', loadComicsFromList);
router.post('/', createComic);
router.get('/:id', getComic);
router.put('/:id', updateComic);
router.delete('/:id', deleteComic);

export default router;
