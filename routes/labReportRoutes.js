const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, authorize } = require('../middleware/auth');
const {
  createLabReport,
  getLabReports,
  getLabReportById,
  updateLabReport,
  deleteLabReport,
  getPatientLabReports,
  verifyLabReport,
  downloadLabReport,
  getMyLabReports,
  getMyLabReportDetail,
  downloadMyLabReport,
  getPendingReports,
  uploadLabReport,
  addTestResults
} = require('../controllers/labReportController');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/lab-reports');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and images are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Patient specific routes (need to be before /:id routes to avoid conflicts)
router.get('/my-reports',
  protect,
  authorize('patient'),
  getMyLabReports
);

router.get('/my-reports/:id',
  protect,
  authorize('patient'),
  getMyLabReportDetail
);

router.get('/my-reports/:id/download',
  protect,
  authorize('patient'),
  downloadMyLabReport
);

router.get('/pending',
  protect,
  authorize('patient'),
  getPendingReports
);

// Admin and Doctor routes for patient lab reports
router.get('/patients/:patientId/lab-reports', 
  protect, 
  authorize('admin', 'doctor'), 
  getPatientLabReports
);

router.post('/upload', 
  protect, 
  authorize('admin', 'doctor'), 
  upload.single('reportFile'),
  uploadLabReport
);

// Base routes
router.route('/')
  .post(protect, upload.single('reportFile'), createLabReport)
  .get(protect, getLabReports);

// Special routes
router.put('/:id/verify', 
  protect, 
  authorize('doctor'), 
  verifyLabReport
);

router.get('/:id/download', 
  protect, 
  downloadLabReport
);

// ID specific routes (keep these last)
router.route('/:id')
  .get(protect, getLabReportById)
  .put(protect, upload.single('reportFile'), updateLabReport)
  .delete(protect, deleteLabReport);

module.exports = router;