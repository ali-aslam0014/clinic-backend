// const express = require('express');
// const router = express.Router();
// const {
//   getSettings,
//   updateSettings,
//   resetSettings,
//   getSetting,
//   updateSetting
// } = require('../controllers/settingController');
// const { protect, authorize } = require('../middleware/authMiddleware');

// router.use(protect);
// router.use(authorize('admin'));

// router.route('/')
//   .get(getSettings)
//   .put(updateSettings);

// router.post('/reset', resetSettings);

// router.route('/:section')
//   .get(getSetting)
//   .put(updateSetting);

// module.exports = router;