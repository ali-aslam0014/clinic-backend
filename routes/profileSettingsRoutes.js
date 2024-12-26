const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  updateNotificationSettings,
  updateAppearanceSettings,
  resetSettings
} = require('../controllers/profileSettingsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getSettings)
  .put(updateSettings);

router.put('/notifications', updateNotificationSettings);
router.put('/appearance', updateAppearanceSettings);
router.post('/reset', resetSettings);

module.exports = router;