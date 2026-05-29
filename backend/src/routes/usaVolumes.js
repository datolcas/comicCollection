import express from 'express';
import {
  fetchVolumeFromUrl,
  createOrUpdateUsVolume,
  getUsVolumes,
  updateUsVolume,
  deleteUsVolume,
  getVolumeIssueList,
} from '../controllers/whakoomController.js';

const router = express.Router();

router.get('/', getUsVolumes);
router.get('/issues', getVolumeIssueList);
router.post('/fetch-from-url', fetchVolumeFromUrl);
router.post('/', createOrUpdateUsVolume);
router.put('/:id', updateUsVolume);
router.delete('/:id', deleteUsVolume);

export default router;
