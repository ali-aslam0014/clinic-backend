const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientAppointments,
  getPatientBills,
  getPatientDocuments,
  getPatientMedicalRecords,
  addMedicalRecord,
  uploadDocument,
  updateMedicalRecord,
  getMyProfile,
  updateMyProfile,
  updateProfileImage,
  updateMedicalHistory,
  searchPatients,
  getPatientDetails,
  generatePatientCard,
  getPatientCard,
  getDoctorPatients
} = require('../controllers/patientController');

const {
  getPatientHistory,
  createPatientHistory,
  updatePatientHistory,
  addAllergy,
  addMedication,
  updateAllergy,
  updateMedication,
  deleteAllergy,
  deleteMedication
} = require('../controllers/patientHistoryController');

const {
  getDiagnosisRecords,
  getDiagnosisRecord,
  createDiagnosisRecord,
  updateDiagnosisRecord,
  deleteDiagnosisRecord,
  addDiagnosisAttachment
} = require('../controllers/diagnosisRecordController');

const {
  createLabReport,
  getLabReports,
  getLabReportById,
  updateLabReport,
  deleteLabReport,
  getPatientLabReports,
  verifyLabReport,
  downloadLabReport,
  addTestResults
} = require('../controllers/labReportController');

const {
  getPatientTreatments,
  getTreatment,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  addTreatmentAttachment
} = require('../controllers/treatmentHistoryController');

const { uploadProfile } = require('../middleware/upload');

// Protect all routes
router.use(protect);

// Patient routes
router.route('/')
  .get(authorize(['admin', 'doctor', 'nurse']), async (req, res) => {
    if (req.user.role === 'doctor') {
      return getDoctorPatients(req, res);
    }
    return getPatients(req, res);
  })
  .post(authorize('admin', 'doctor'), uploadProfile, createPatient);

router
  .route('/:id')
  .get(authorize('admin', 'doctor', 'nurse'), getPatientById)
  .put(authorize('admin', 'doctor'), updatePatient)
  .delete(authorize('admin'), deletePatient);

// Related data routes
router.get('/:id/appointments', authorize('admin', 'doctor', 'nurse'), getPatientAppointments);
router.get('/:id/bills', authorize('admin', 'doctor', 'accountant'), getPatientBills);
router.get('/:id/documents', authorize('admin', 'doctor', 'nurse'), getPatientDocuments);

// Medical Records routes
router
  .route('/:id/medical-records')
  .get(authorize('admin', 'doctor', 'nurse'), getPatientMedicalRecords)
  .post(authorize('admin', 'doctor'), addMedicalRecord);

router
  .route('/:patientId/medical-records/:id')
  .put(authorize('admin', 'doctor'), updateMedicalRecord);

// Documents routes
router.route('/:id/documents')
  .get(authorize('admin', 'doctor', 'nurse'), getPatientDocuments)
  .post(authorize('admin', 'doctor'), uploadDocument);

// Patient History routes
router
  .route('/:patientId/history')
  .get(authorize('admin', 'doctor', 'nurse'), getPatientHistory)
  .post(authorize('doctor'), createPatientHistory)
  .put(authorize('doctor'), updatePatientHistory);

// Allergy routes
router
  .route('/:patientId/history/allergies')
  .post(authorize('doctor'), addAllergy);

router
  .route('/:patientId/history/allergies/:allergyId')
  .put(authorize('doctor'), updateAllergy)
  .delete(authorize('doctor'), deleteAllergy);

// Medication routes
router
  .route('/:patientId/history/medications')
  .post(authorize('doctor'), addMedication);

router
  .route('/:patientId/history/medications/:medicationId')
  .put(authorize('doctor'), updateMedication)
  .delete(authorize('doctor'), deleteMedication);

// Diagnosis Record routes
router
  .route('/:patientId/diagnosis')
  .get(authorize('admin', 'doctor', 'nurse'), getDiagnosisRecords)
  .post(authorize('doctor'), createDiagnosisRecord);

router
  .route('/:patientId/diagnosis/:id')
  .get(authorize('admin', 'doctor', 'nurse'), getDiagnosisRecord)
  .put(authorize('doctor'), updateDiagnosisRecord)
  .delete(authorize('doctor', 'admin'), deleteDiagnosisRecord);

router
  .route('/:patientId/diagnosis/:id/attachment')
  .post(authorize('doctor'), addDiagnosisAttachment);

// Lab Report routes
router
  .route('/:patientId/lab-reports')
  .get(authorize('admin', 'doctor', 'nurse'), getPatientLabReports)
  .post(authorize('doctor', 'admin'), createLabReport);

router
  .route('/:patientId/lab-reports/:id')
  .get(authorize('admin', 'doctor', 'nurse'), getLabReportById)
  .put(authorize('doctor', 'admin'), updateLabReport)
  .delete(authorize('doctor', 'admin'), deleteLabReport);

router
  .route('/:patientId/lab-reports/:id/verify')
  .put(authorize('doctor'), verifyLabReport);

router
  .route('/:patientId/lab-reports/:id/results')
  .put(authorize('lab_technician'), addTestResults);

router
  .route('/:patientId/lab-reports/:id/download')
  .get(authorize('admin', 'doctor', 'nurse'), downloadLabReport);

// Treatment History routes
router
  .route('/:patientId/treatments')
  .get(authorize('admin', 'doctor', 'nurse'), getPatientTreatments)
  .post(authorize('doctor'), createTreatment);

router
  .route('/:patientId/treatments/:id')
  .get(authorize('admin', 'doctor', 'nurse'), getTreatment)
  .put(authorize('doctor'), updateTreatment)
  .delete(authorize('doctor', 'admin'), deleteTreatment);

router
  .route('/:patientId/treatments/:id/attachment')
  .post(authorize('doctor'), addTreatmentAttachment);

// Patient Profile routes
router
  .route('/profile')
  .get(authorize('patient'), getMyProfile)
  .put(authorize('patient'), updateMyProfile);

router
  .route('/profile/image')
  .put(
    authorize('patient'),
    uploadProfile,
    updateProfileImage
  );

router
  .route('/profile/medical-history')
  .put(authorize('patient'), updateMedicalHistory);

// Search routes
router.get(
  '/search',
  authorize('admin', 'receptionist', 'doctor'),
  searchPatients
);

// Patient details routes
router.get(
  '/:id/details',
  authorize('admin', 'receptionist', 'doctor'),
  getPatientDetails
);

// Patient card routes
router.get(
  '/:id/card',
  protect,
  authorize('receptionist', 'admin'),
  getPatientCard
);

router.get(
  '/:id/card/pdf',
  protect,
  authorize('receptionist', 'admin'),
  generatePatientCard
);

module.exports = router;