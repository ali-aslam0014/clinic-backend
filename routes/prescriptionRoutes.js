const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  updatePrescription,
  deletePrescription,
  getPatientPrescriptions,
  getActivePrescriptions,
  dispensePrescription,
  createFromTemplate,
  saveAsTemplate,
  generatePDF,
  sendToPharmacy,
  getPrescriptionStats,
  getMyPrescriptions,
  getMyPrescriptionDetail,
  downloadMyPrescription
} = require('../controllers/prescriptionController');

// Protect all routes
router.use(protect);

// Main prescription routes
router
  .route('/')
  .post(authorize('doctor', 'admin'), createPrescription)
  .get(authorize('doctor', 'admin', 'pharmacist'), getPrescriptions);

router
  .route('/:id')
  .get(authorize('doctor', 'admin', 'pharmacist'), getPrescriptionById)
  .put(authorize('doctor', 'admin'), updatePrescription)
  .delete(authorize('doctor', 'admin'), deletePrescription);

// Patient specific routes
router
  .route('/patient/:patientId')
  .get(authorize('doctor', 'admin', 'pharmacist'), getPatientPrescriptions);

router
  .route('/patient/:patientId/active')
  .get(authorize('doctor', 'admin', 'pharmacist'), getActivePrescriptions);

// Dispensing route
router
  .route('/:id/dispense')
  .put(authorize('pharmacist', 'admin'), dispensePrescription);

// Template routes
router
  .route('/templates')
  .get(authorize('doctor', 'admin'), getPrescriptions);

router
  .route('/template/:id')
  .post(authorize('doctor', 'admin'), createFromTemplate);

router
  .route('/:id/template')
  .post(authorize('doctor', 'admin'), saveAsTemplate);

// PDF generation route
router
  .route('/:id/pdf')
  .get(authorize('doctor', 'admin', 'pharmacist'), generatePDF);

// Pharmacy route
router
  .route('/:id/send-to-pharmacy')
  .post(authorize('doctor', 'admin'), sendToPharmacy);

// Statistics route
router
  .route('/stats')
  .get(authorize('doctor', 'admin'), getPrescriptionStats);

// Version history route
router
  .route('/:id/history')
  .get(authorize('doctor', 'admin'), async (req, res) => {
    const prescription = await Prescription.findById(req.params.id)
      .populate('modificationHistory.modifiedBy', 'name');
    res.json({ success: true, data: prescription.modificationHistory });
  });

// Patient prescription routes
router.get(
  '/my-prescriptions',
  protect,
  authorize('patient'),
  getMyPrescriptions
);

router.get(
  '/my-prescriptions/:id',
  protect,
  authorize('patient'),
  getMyPrescriptionDetail
);

router.get(
  '/my-prescriptions/:id/download',
  protect,
  authorize('patient'),
  downloadMyPrescription
);

module.exports = router;