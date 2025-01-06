const express = require('express');
const router = express.Router();
const {
  getReceptionists,
  addReceptionist,
  updateReceptionist,
  deleteReceptionist,
  updateReceptionistStatus,
  getPharmacists,
  addPharmacist,
  updatePharmacist,
  deletePharmacist,
  updatePharmacistDutyStatus,
  getProfile,
  updateProfile,
  getSettings,
  updateSettings,
  changePassword,
  uploadProfileImage
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.route('/receptionists')
  .get(getReceptionists)
  .post(addReceptionist);

router.route('/receptionists/:id')
  .put(updateReceptionist)
  .delete(deleteReceptionist);

router.route('/receptionists/:id/status')
  .patch(updateReceptionistStatus);

router.route('/pharmacists')
  .get(getPharmacists)
  .post(addPharmacist);

router.route('/pharmacists/:id')
  .put(updatePharmacist)
  .delete(deletePharmacist);

router.route('/pharmacists/:id/duty-status')
  .patch(updatePharmacistDutyStatus);

const profileRouter = express.Router();
profileRouter.use(protect);

profileRouter.route('/profile')
  .get(getProfile)
  .put(updateProfile);

profileRouter.post('/profile/image', uploadProfileImage);

profileRouter.route('/settings')
  .get(getSettings)
  .put(updateSettings);

profileRouter.put('/change-password', changePassword);

router.use('/staff', profileRouter);

module.exports = router;