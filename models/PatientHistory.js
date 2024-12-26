const mongoose = require('mongoose');

const patientHistorySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  chiefComplaint: {
    type: String,
    required: [true, 'Chief complaint is required']
  },
  historyOfPresentIllness: {
    type: String,
    required: [true, 'Present illness history is required']
  },
  pastMedicalHistory: [{
    condition: String,
    diagnosisDate: Date,
    status: {
      type: String,
      enum: ['Active', 'Resolved', 'Ongoing'],
      default: 'Active'
    },
    notes: String
  }],
  familyHistory: [{
    relationship: String,
    condition: String,
    notes: String
  }],
  socialHistory: {
    smoking: {
      status: {
        type: String,
        enum: ['Never', 'Current', 'Former'],
        default: 'Never'
      },
      frequency: String,
      startDate: Date,
      quitDate: Date
    },
    alcohol: {
      status: {
        type: String,
        enum: ['Never', 'Current', 'Former'],
        default: 'Never'
      },
      frequency: String,
      notes: String
    },
    occupation: String,
    lifestyle: String
  },
  allergies: [{
    allergen: String,
    reaction: String,
    severity: {
      type: String,
      enum: ['Mild', 'Moderate', 'Severe'],
      default: 'Moderate'
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    }
  }],
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['Current', 'Discontinued', 'Completed'],
      default: 'Current'
    },
    prescribedBy: String
  }],
  immunizations: [{
    vaccine: String,
    date: Date,
    dueDate: Date,
    status: {
      type: String,
      enum: ['Completed', 'Due', 'Overdue'],
      default: 'Due'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
patientHistorySchema.index({ patientId: 1 });
patientHistorySchema.index({ createdAt: -1 });
patientHistorySchema.index({ 'medications.status': 1 });
patientHistorySchema.index({ 'allergies.status': 1 });

// Add this index for receptionist queries
patientHistorySchema.index({ 
  'patientId': 1, 
  'updatedAt': -1,
  'isActive': 1 
});

module.exports = mongoose.model('PatientHistory', patientHistorySchema);