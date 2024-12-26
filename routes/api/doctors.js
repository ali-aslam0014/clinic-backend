const express = require('express');
const router = express.Router();
const Doctor = require('../../models/Doctor');
const { protect } = require('../../middleware/auth');
const multer = require('multer');
const path = require('path');

// Setup multer for file upload
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/doctors/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// @route   GET api/admin/doctors
// @desc    Get all doctors
// @access  Private (Admin)
router.get('/', protect, async (req, res) => {
  try {
    const doctors = await Doctor.find().select('-password');
    res.json({
      success: true,
      data: doctors
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   POST api/admin/doctors
// @desc    Add new doctor
// @access  Private (Admin)
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    const { name, email, password, phone, specialization, experience, fee } = req.body;

    // Check if doctor exists
    let doctor = await Doctor.findOne({ email });
    if (doctor) {
      return res.status(400).json({
        success: false,
        message: 'Doctor already exists'
      });
    }

    // Create new doctor
    doctor = new Doctor({
      name,
      email,
      password, // Note: In production, hash the password
      phone,
      specialization,
      experience,
      fee,
      image: req.file ? `/uploads/doctors/${req.file.filename}` : null
    });

    await doctor.save();

    res.status(201).json({
      success: true,
      data: doctor
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   GET api/admin/dashboard-stats
// @desc    Get dashboard statistics
// @access  Private (Admin)
router.get('/dashboard-stats', protect, async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    const recentDoctors = await Doctor.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        totalDoctors,
        recentDoctors
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

module.exports = router;