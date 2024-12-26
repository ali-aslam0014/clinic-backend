const express = require('express');
const router = express.Router();
const {
  getFeedback,
  getFeedbackById,
  respondToFeedback,
  exportFeedback
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/feedback')
  .get(getFeedback);

router.route('/feedback/export')
  .get(exportFeedback);

router.route('/feedback/:id')
  .get(getFeedbackById);

router.route('/feedback/:id/respond')
  .post(respondToFeedback);

module.exports = router;