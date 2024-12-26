const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const User = require('../../models/User');
const Appointment = require('../../models/Appointment');

// @route   GET api/patients
// @desc    Get all patients
// @access  Private (Admin/Doctor only)
router.get('/', protect, async (req, res) => {
    try {
        const patients = await User.find({ role: 'patient' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: patients
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET api/patients/:id
// @desc    Get patient by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const patient = await User.findById(req.params.id).select('-password');
        
        if (!patient || patient.role !== 'patient') {
            return res.status(404).json({ message: 'Patient not found' });
        }

        res.json({
            success: true,
            data: patient
        });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Patient not found' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET api/patients/:id/appointments
// @desc    Get patient's appointments
// @access  Private
router.get('/:id/appointments', protect, async (req, res) => {
    try {
        const appointments = await Appointment.find({ patientId: req.params.id })
            .populate('doctorId', 'name specialization')
            .sort({ appointmentDate: -1 });

        res.json({
            success: true,
            data: appointments
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT api/patients/:id
// @desc    Update patient profile
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const { name, phone, address, medicalHistory } = req.body;

        const patient = await User.findById(req.params.id);
        if (!patient || patient.role !== 'patient') {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Make sure user is the patient
        if (patient._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Update fields
        if (name) patient.name = name;
        if (phone) patient.phone = phone;
        if (address) patient.address = address;
        if (medicalHistory) patient.medicalHistory = medicalHistory;

        await patient.save();

        res.json({
            success: true,
            data: patient
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;