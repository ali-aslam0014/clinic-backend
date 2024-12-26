const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const Appointment = require('../../models/Appointment');

// @route   GET api/appointments
// @desc    Get all appointments
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate('patientId', 'name')
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

// @route   POST api/appointments
// @desc    Create a new appointment
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { doctorId, appointmentDate, reason } = req.body;

        const newAppointment = new Appointment({
            patientId: req.user.id,
            doctorId,
            appointmentDate,
            reason,
            status: 'pending'
        });

        const appointment = await newAppointment.save();

        res.json({
            success: true,
            data: appointment
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT api/appointments/:id
// @desc    Update appointment status
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const { status } = req.body;

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Only doctor or admin can update status
        if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        appointment.status = status;
        await appointment.save();

        res.json({
            success: true,
            data: appointment
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE api/appointments/:id
// @desc    Cancel appointment
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Check if user is authorized to cancel
        if (appointment.patientId.toString() !== req.user.id && 
            req.user.role !== 'admin' && 
            req.user.role !== 'doctor') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await appointment.remove();

        res.json({
            success: true,
            message: 'Appointment cancelled'
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;