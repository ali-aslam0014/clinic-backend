const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateGeneralSettings,
  updateNotificationSettings,
  updateSecuritySettings,
  resetSettings
} = require('../controllers/pharmacySettingsController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);
router.use(authorize('pharmacist'));

router.route('/')
  .get(getSettings);

router.route('/general')
  .put(updateGeneralSettings);

router.route('/notifications')
  .put(updateNotificationSettings);

router.route('/security')
  .put(updateSecuritySettings);

router.route('/reset')
  .post(resetSettings);

module.exports = router; 