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
  updatePharmacistDutyStatus
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

module.exports = router;