const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  updateProfileImage,
  changePassword
} = require('../controllers/pharmacyProfileController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);
router.use(authorize('pharmacist'));

router.route('/')
  .get(getProfile)
  .put(updateProfile);

router.put('/image', updateProfileImage);
router.put('/password', changePassword);

module.exports = router; 