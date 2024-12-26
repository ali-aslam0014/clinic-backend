const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getPatientHistory,
  addPatientHistory,
  updatePatientHistory,
  deletePatientHistory,
  getReceptionistPatientHistory
} = require('../controllers/patientHistoryController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get(
  '/receptionist',
  authorize('receptionist'),
  getReceptionistPatientHistory
);

router.route('/')
  .get(authorize('doctor', 'admin'), getPatientHistory)
  .post(authorize('doctor'), addPatientHistory);

router.route('/:id')
  .put(authorize('doctor'), updatePatientHistory)
  .delete(authorize('admin'), deletePatientHistory);

module.exports = router;