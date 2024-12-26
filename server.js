require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');
const ErrorResponse = require('./utils/errorResponse');
const createDefaultAdmin = require('./seeder/adminSeeder');
const fs = require('fs');
const mongoose = require('mongoose');
const User = require('./models/User');

// Import routes
const userRoutes = require('./routes/api/users');
const appointmentRoutes = require('./routes/appointmentRoutes');
const adminRoutes = require('./routes/api/admin');
const doctorRoutes = require('./routes/doctorRoutes');
const specializationRoutes = require('./routes/specializationRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const patientRoutes = require('./routes/patientRoutes');
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const treatmentPlanRoutes = require('./routes/treatmentPlanRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const labReportRoutes = require('./routes/labReportRoutes');

// Import Doctor Dashboard Routes
const doctorDashboardRoutes = require('./routes/doctor/dashboardRoutes');
// Remove or comment out missing routes until they're created
// const doctorPatientRoutes = require('./routes/doctor/patientRoutes');
// const doctorAppointmentRoutes = require('./routes/doctor/appointmentRoutes');
// const doctorPrescriptionRoutes = require('./routes/doctor/prescriptionRoutes');
// const doctorProfileRoutes = require('./routes/doctor/profileRoutes');

// Import models
require('./models/billModel');
// require('./models/patientModel');

// Connect to database
connectDB();

// Run admin seeder after DB connection
const runSeeder = async () => {
  try {
    await createDefaultAdmin();
  } catch (error) {
    console.error('Seeder Error:', error);
  }
};
runSeeder();

const app = express();

// Add this before any routes
app.use((req, res, next) => {
    console.log('Incoming request from:', req.headers.origin);
    console.log('Method:', req.method);
    
    const allowedOrigins = [
        'http://localhost:5173',
        'https://myclinic-app.vercel.app'
    ];
    
    const origin = req.headers.origin;
    
    // Log pattern matching
    allowedOrigins.forEach(pattern => {
        const regexPattern = pattern.replace('*', '.*');
        const regex = new RegExp(regexPattern);
        console.log('Testing pattern:', pattern);
        console.log('Matches:', regex.test(origin));
    });
    
    // Check if origin matches any pattern
    const isAllowed = allowedOrigins.some(pattern => {
        // Convert pattern to regex
        const regexPattern = pattern.replace('*', '.*');
        const regex = new RegExp(regexPattern);
        return regex.test(origin);
    });

    if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    // Essential CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create temp directories for Vercel
const uploadDirs = ['avatars', 'doctors', 'reports', 'prescriptions'];
uploadDirs.forEach((dir) => {
    try {
        const uploadPath = path.join('/tmp', dir);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
    } catch (error) {
        console.log(`Warning: Could not create directory ${dir}`, error);
    }
});

// Serve static files from temp directory
app.use('/uploads', express.static('/tmp'));
app.use('/uploads/avatars', express.static(path.join('/tmp', 'avatars')));
app.use('/uploads/doctors', express.static(path.join('/tmp', 'doctors')));

// API Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/specializations', specializationRoutes);
app.use('/api/v1/schedules', scheduleRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/user', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/v1/medical-records', medicalRecordRoutes);
app.use('/api/v1/doctor/medical-records', medicalRecordRoutes);

// Doctor Dashboard Routes
app.use('/api/v1/doctor/dashboard', doctorDashboardRoutes);
// Comment out routes that don't exist yet
// app.use('/api/v1/doctor/patients', doctorPatientRoutes);
app.use('/api/v1/doctor/patients', patientRoutes);
// app.use('/api/v1/doctor/appointments', doctorAppointmentRoutes);
// app.use('/api/v1/doctor/prescriptions', doctorPrescriptionRoutes);
// app.use('/api/v1/doctor/profile', doctorProfileRoutes);

// Update the route registration
app.use('/api/v1/doctor/treatment-plans', treatmentPlanRoutes);
app.use('/api/v1/prescriptions', prescriptionRoutes);
app.use('/api/v1/medicines', medicineRoutes);
app.use('/api/v1/lab-reports', labReportRoutes);

// Welcome Route
app.get('/', (req, res) => {
    res.json({ 
        success: true,
        message: 'Welcome to Clinic Management System API',
        version: '1.0.0'
    });
});

// 404 Handler
app.use((req, res, next) => {
    next(new ErrorResponse(`Route not found: ${req.originalUrl}`, 404));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Server Error'
    });
});

const PORT = process.env.PORT || 8080;

// Start server with error handling
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
    } else {
        console.error('Server error:', error);
    }
});

// Database connection logging
mongoose.connection.on('connected', async () => {
    console.log('MongoDB Connected');
    try {
        const user = await User.findById('674fdfd463ad25835cb69a5e');
        console.log('Test user query:', user);
        
        // Check admin user
        const admin = await User.findOne({ role: 'admin' });
        console.log('Admin user in database:', admin);
    } catch (error) {
        console.error('Error querying user:', error);
    }
});
