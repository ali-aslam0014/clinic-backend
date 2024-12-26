const User = require('../models/User');
const Appointment = require('../models/Appointment');

const getDashboardStats = async (req, res) => {
    try {
        const totalDoctors = await User.countDocuments({ role: 'doctor' });
        const totalPatients = await User.countDocuments({ role: 'patient' });
        const totalAppointments = await Appointment.countDocuments();

        res.json({
            success: true,
            data: {
                totalDoctors,
                totalPatients,
                totalAppointments,
                recentAppointments: []
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard stats'
        });
    }
};

module.exports = {
    getDashboardStats
};