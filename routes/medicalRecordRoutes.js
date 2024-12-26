const express = require('express');
const router = express.Router();
const {
  getMedicalRecords,
  getDoctorMedicalRecords,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  updateStatus
} = require('../controllers/medicalRecordController');

const { protect, authorize } = require('../middleware/auth');

// Apply authentication middleware
router.use(protect);
router.use(authorize('doctor'));

// Doctor specific routes
router.get('/', getDoctorMedicalRecords);
router.post('/', createMedicalRecord);
router.put('/:id', updateMedicalRecord);
router.delete('/:id', deleteMedicalRecord);
router.patch('/:id/status', updateStatus);

module.exports = router;