const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const User = require('../../models/User');
const Appointment = require('../../models/Appointment');

// Get dashboard stats
router.get('/dashboard-stats', protect, async (req, res) => {
    try {
        // Get counts
        const totalDoctors = await User.countDocuments({ role: 'doctor' });
        const totalPatients = await User.countDocuments({ role: 'patient' });
        const totalAppointments = await Appointment.countDocuments();

        // Get recent appointments
        const recentAppointments = await Appointment.find()
            .populate('patientId', 'name')
            .populate('doctorId', 'name')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            success: true,
            data: {
                totalDoctors,
                totalPatients,
                totalAppointments,
                recentAppointments
            }
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard stats'
        });
    }
});

module.exports = router;