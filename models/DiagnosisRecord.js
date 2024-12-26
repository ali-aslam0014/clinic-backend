const mongoose = require('mongoose');

const diagnosisRecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  diagnosisDate: {
    type: Date,
    default: Date.now
  },
  diagnosis: {
    type: String,
    required: [true, 'Please add a diagnosis']
  },
  symptoms: [{
    type: String,
    required: true
  }],
  findings: {
    type: String,
    required: [true, 'Please add clinical findings']
  },
  diagnosisType: {
    type: String,
    enum: ['Preliminary', 'Final', 'Working'],
    default: 'Preliminary'
  },
  severity: {
    type: String,
    enum: ['Mild', 'Moderate', 'Severe', 'Critical'],
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Resolved', 'Chronic', 'In Treatment'],
    default: 'Active'
  },
  treatment: {
    plan: String,
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String
    }],
    instructions: String
  },
  followUp: {
    required: {
      type: Boolean,
      default: false
    },
    date: Date,
    notes: String
  },
  attachments: [{
    name: String,
    fileUrl: String,
    fileType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
diagnosisRecordSchema.index({ patientId: 1, diagnosisDate: -1 });
diagnosisRecordSchema.index({ doctorId: 1 });
diagnosisRecordSchema.index({ status: 1 });

module.exports = mongoose.model('DiagnosisRecord', diagnosisRecordSchema);