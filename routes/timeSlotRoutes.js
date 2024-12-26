const express = require('express');
const router = express.Router();
const {
  getAllTimeSlots,
  addTimeSlot,
  updateTimeSlot,
  deleteTimeSlot
} = require('../controllers/timeSlotController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getAllTimeSlots)
  .post(addTimeSlot);

router.route('/:id')
  .put(updateTimeSlot)
  .delete(deleteTimeSlot);

module.exports = router;