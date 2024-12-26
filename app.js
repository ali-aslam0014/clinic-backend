const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
require('dotenv').config();
const path = require('path');

// Route imports
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');  // New import
const appointmentRoutes = require('./routes/appointmentRoutes');
const documentRoutes = require('./routes/documentRoutes');
const billRoutes = require('./routes/billRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const labReportRoutes = require('./routes/labReportRoutes');
const timeSlotRoutes = require('./routes/timeSlotRoutes');
const staffRoutes = require('./routes/staffRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const stockRoutes = require('./routes/stockRoutes');
const saleRoutes = require('./routes/saleRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const expiryTrackingRoutes = require('./routes/expiryTrackingRoutes');
const stockAlertRoutes = require('./routes/stockAlertRoutes');
const smsRoutes = require('./routes/smsRoutes');
const emailReminderRoutes = require('./routes/emailReminderRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const messageRoutes = require('./routes/messageRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const roleRoutes = require('./routes/roleRoutes');
const backupRoutes = require('./routes/backupRoutes');
const profileRoutes = require('./routes/profileRoutes');
// const settingRoutes = require('./routes/settingRoutes');
const profileSettingsRoutes = require('./routes/profileSettingsRoutes');
const doctorDashboardRoutes = require('./routes/doctor/dashboardRoutes');
const treatmentPlanRoutes = require('./routes/treatmentPlanRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const patientDetailsRoutes = require('./routes/patientDetailsRoutes');
const billingRoutes = require('./routes/billingRoutes');
const communication = require('./routes/communicationRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const pharmacyProfileRoutes = require('./routes/pharmacyProfileRoutes');

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));  // Allow frontend to connect
app.use(express.json());  // Parse JSON bodies

// Routes
app.use('/api/users', userRoutes);  // User routes like login/register
app.use('/api/admin', adminRoutes);  // Admin routes like dashboard stats
app.use('/api/v1/admin/appointments', appointmentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/lab-reports', labReportRoutes);
app.use('/api/v1/admin/time-slots', timeSlotRoutes);
app.use('/api/v1/admin/staff', staffRoutes);
app.use('/api/v1/admin/invoices', invoiceRoutes);
app.use('/api/v1/admin/payments', paymentRoutes);
app.use('/api/v1/admin/reports', reportRoutes);
app.use('/api/v1/admin/pharmacy/medicines', medicineRoutes);
app.use('/api/v1/admin/pharmacy/stock', stockRoutes);
app.use('/api/v1/admin/pharmacy/sales', saleRoutes);
app.use('/api/v1/admin/pharmacy/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/admin/pharmacy', expiryTrackingRoutes);
app.use('/api/v1/admin/pharmacy', stockAlertRoutes);
app.use('/api/v1/admin/communications', smsRoutes);
app.use('/api/v1/admin/communications', emailReminderRoutes);
app.use('/api/v1/admin/communications', feedbackRoutes);
app.use('/api/v1/admin/communications', messageRoutes);
app.use('/api/v1/admin/settings', clinicRoutes);
app.use('/api/v1/admin/users', userRoutes);
app.use('/api/v1/admin/roles', roleRoutes);
app.use('/api/v1/admin/settings/backups', backupRoutes);
app.use('/api/v1/admin/profile', profileRoutes);
// app.use('/api/v1/admin/settings', settingRoutes);
app.use('/api/v1/profile/settings', profileSettingsRoutes);
app.use('/api/v1/doctor/dashboard', doctorDashboardRoutes);
app.use('/api/v1/treatment-plans', treatmentPlanRoutes);
app.use('/api/v1/patients/:patientId/medical-records', medicalRecordRoutes);
app.use('/api/v1/patients/:patientId/details', patientDetailsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/communication', communication);
app.use('/api/v1/pharmacy', pharmacyRoutes);
app.use('/api/pharmacy/profile', pharmacyProfileRoutes);

// File Upload Middleware
const fileUpload = require('express-fileupload');
app.use(fileUpload());

// Set static folder
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Set static folder for avatars
app.use('/uploads/avatars', express.static(path.join(__dirname, 'public/uploads/avatars')));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;