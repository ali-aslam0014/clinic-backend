const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  visitDate: {
    type: Date,
    required: true
  },
  diagnosis: {
    type: String,
    required: true
  },
  symptoms: [{
    type: String
  }],
  vitalSigns: {
    bloodPressure: String,
    temperature: String,
    heartRate: String,
    respiratoryRate: String,
    weight: Number,
    height: Number
  },
  prescription: [{
    medicine: String,
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String
  }],
  labTests: [{
    testName: String,
    testDate: Date,
    result: String,
    reportFile: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled']
    }
  }],
  notes: String,
  followUpDate: Date,
  attachments: [{
    fileName: String,
    fileType: String,
    filePath: String,
    uploadDate: Date
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);