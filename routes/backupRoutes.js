const express = require('express');
const router = express.Router();
const {
  getBackups,
  createBackup,
  restoreBackup,
  downloadBackup,
  deleteBackup,
  uploadBackup
} = require('../controllers/backupController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getBackups)
  .post(createBackup);

router.route('/upload')
  .post(uploadBackup);

router.route('/:id')
  .delete(deleteBackup);

router.route('/:id/restore')
  .post(restoreBackup);

router.route('/:id/download')
  .get(downloadBackup);

module.exports = router;