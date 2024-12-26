const medicalRecords = require('./medicalRecordRoutes');

// In your app.js or index.js
app.use('/api/patients/:patientId/medical-records', medicalRecords);
