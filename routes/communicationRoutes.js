const express = require('express');
const {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  getTemplates,
  createTemplate,
  processReminders
} = require('../controllers/communicationController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Reminder routes
router.route('/reminders')
  .get(authorize('admin', 'receptionist'), getReminders)
  .post(authorize('admin', 'receptionist'), createReminder);

router.route('/reminders/:id')
  .put(authorize('admin', 'receptionist'), updateReminder)
  .delete(authorize('admin', 'receptionist'), deleteReminder);

// Template routes
router.route('/templates')
  .get(authorize('admin', 'receptionist'), getTemplates)
  .post(authorize('admin', 'receptionist'), createTemplate);

// Process reminders (can be called by cron job)
router.route('/process-reminders')
  .post(authorize('admin', 'system'), processReminders);

module.exports = router; 