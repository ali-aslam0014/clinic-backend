const express = require('express');
const router = express.Router();
const {
  createReminder,
  getReminders,
  updateReminder,
  deleteReminder,
  sendReminder,
  getTemplates,
  createTemplate
} = require('../controllers/emailReminderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/email-reminders')
  .get(getReminders)
  .post(createReminder);

router.route('/email-reminders/:id')
  .put(updateReminder)
  .delete(deleteReminder);

router.route('/email-reminders/:id/send')
  .post(sendReminder);

router.route('/email/templates')
  .get(getTemplates)
  .post(createTemplate);

module.exports = router;