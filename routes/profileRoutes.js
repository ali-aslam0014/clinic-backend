const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  updatePassword,
  uploadAvatar,
  updatePreferences,
  getLoginHistory,
  getSettings,
  updateSettings,
  resetSettings
} = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getProfile)
  .put(updateProfile);

router.put('/password', updatePassword);
router.put('/avatar', uploadAvatar);
router.put('/preferences', updatePreferences);
router.get('/login-history', getLoginHistory);
router.route('/settings')
  .get(getSettings)
  .put(updateSettings);

router.post('/settings/reset', resetSettings);

module.exports = router;