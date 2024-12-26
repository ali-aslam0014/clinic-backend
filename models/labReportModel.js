const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  testName: {
    type: String,
    required: true
  },
  result: {
    type: String,
    required: true
  },
  normalRange: String,
  unit: String,
  remarks: String,
  isAbnormal: {
    type: Boolean,
    default: false
  }
});

const labReportSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  testDate: {
    type: Date,
    required: true
  },
  reportDate: {
    type: Date,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  testResults: [testResultSchema],
  summary: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  reportFile: {
    fileName: String,
    fileType: String,
    filePath: String,
    uploadDate: Date
  },
  technician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  verifiedAt: Date,
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('LabReport', labReportSchema);