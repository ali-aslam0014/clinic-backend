const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadDocument: uploadMiddleware } = require('../middleware/upload');
const {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  getPatientDocuments,
  scanDocument,
  getScanners
} = require('../controllers/documentController');

// Protect all routes
router.use(protect);

// Document routes
router.route('/')
  .get(getDocuments)
  .post(uploadMiddleware, uploadDocument);

router.route('/:id')
  .get(getDocumentById)
  .delete(authorize('admin', 'receptionist', 'doctor'), deleteDocument);

// Patient document routes
router.get('/patient/:patientId', getPatientDocuments);

// Scanner routes
router.post('/scan', authorize('admin', 'receptionist'), scanDocument);
router.get('/scanners', authorize('admin', 'receptionist'), getScanners);

module.exports = router;