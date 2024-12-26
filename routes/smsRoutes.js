const express = require('express');
const router = express.Router();
const {
  sendSMS,
  getSMSLogs,
  createTemplate,
  getTemplates,
  updateTemplate,
  deleteTemplate
} = require('../controllers/smsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/sms/send')
  .post(sendSMS);

router.route('/sms')
  .get(getSMSLogs);

router.route('/sms/templates')
  .get(getTemplates)
  .post(createTemplate);

router.route('/sms/templates/:id')
  .put(updateTemplate)
  .delete(deleteTemplate);

module.exports = router;