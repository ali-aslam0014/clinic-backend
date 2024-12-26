const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Doctor = require('../models/doctorModel');
const { protect, authorize } = require('../middleware/auth');
const {
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  searchDoctors,
  getSpecializations,
  getDoctorAvailability,
  getDoctorSchedule,
  getDoctorAppointments,
  updateDoctorSchedule
} = require('../controllers/doctorController');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../public/uploads/doctors');
fs.mkdirSync(uploadDir, { recursive: true });

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doctor-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Create multer instance
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// Admin routes
router.post(
  '/admin/doctors',
  protect,
  authorize('admin'),
  upload.single('image'),  // Use upload.single instead of just upload
  async (req, res) => {
    try {
      console.log('Request received:', {
        body: req.body,
        file: req.file
      });

      const doctor = new Doctor({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        specialization: req.body.specialization,
        experience: Number(req.body.experience),
        qualifications: req.body.qualifications,
        address: req.body.address,
        consultationFee: Number(req.body.consultationFee),
        image: req.file ? `/uploads/doctors/${req.file.filename}` : '',
        status: 'active'
      });

      const savedDoctor = await doctor.save();
      console.log('Doctor saved:', savedDoctor);

      res.status(201).json({
        success: true,
        message: 'Doctor added successfully',
        data: savedDoctor
      });
    } catch (error) {
      console.error('Error saving doctor:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error adding doctor'
      });
    }
  }
);

// Other routes
router.get('/admin/doctors', protect, authorize('admin'), getAllDoctors);
router.get('/admin/doctors/:id', protect, authorize('admin'), getDoctorById);
router.put(
  '/admin/doctors/:id', 
  protect, 
  authorize('admin'), 
  upload.single('image'),  // Use upload.single here too
  updateDoctor
);
router.delete('/admin/doctors/:id', protect, authorize('admin'), deleteDoctor);

// Public routes
router.get('/doctors/search', searchDoctors);
router.get('/doctors/specializations', getSpecializations);
router.get('/doctors/:id/availability', getDoctorAvailability);

// Protected routes
router.get('/:id/schedule', protect, authorize('receptionist', 'doctor'), getDoctorSchedule);
router.get('/:id/appointments', protect, authorize('receptionist', 'doctor'), getDoctorAppointments);
router.put('/:id/schedule', protect, authorize('admin'), updateDoctorSchedule);

// Add this new route for medical records
router.get('/', protect, async (req, res) => {
  try {
    const doctors = await Doctor.find({ status: 'active' })
      .select('name email specialization');
    
    res.status(200).json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching doctors'
    });
  }
});

module.exports = router;