const express = require('express');
const router = express.Router();
const {
  getDoctorFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  updateFollowUpStatus,
  getUpcomingFollowUps
} = require('../controllers/followUpController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Follow-up routes
router.route('/')
  .get(authorize('admin', 'doctor'), getDoctorFollowUps)
  .post(authorize('admin', 'doctor'), createFollowUp);

router.route('/:id')
  .put(authorize('admin', 'doctor'), updateFollowUp)
  .delete(authorize('admin', 'doctor'), deleteFollowUp);

router.put('/:id/status', authorize('admin', 'doctor'), updateFollowUpStatus);

router.get('/upcoming', authorize('admin', 'doctor'), getUpcomingFollowUps);

module.exports = router;