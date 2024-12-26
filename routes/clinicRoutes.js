const express = require('express');
const router = express.Router();
const {
  getClinicDetails,
  updateClinicDetails,
  uploadLogo
} = require('../controllers/clinicController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/clinic')
  .get(getClinicDetails)
  .put(updateClinicDetails);

router.route('/upload-logo')
  .post(uploadLogo);

module.exports = router;