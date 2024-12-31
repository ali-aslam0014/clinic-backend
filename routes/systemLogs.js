const express = require('express');
const {
  getLogs,
  createLog,
  cleanupLogs
} = require('../controllers/systemLogController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router
  .route('/')
  .get(getLogs)
  .post(createLog);

router.delete('/cleanup', cleanupLogs);

module.exports = router;