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
  recordType: {
    type: String,
    enum: ['Diagnosis', 'Lab Report', 'Prescription', 'Treatment', 'Follow-up', 'Other'],
    required: true
  },
  visitDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  diagnosis: {
    condition: String,
    notes: String,
    symptoms: [String],
    severity: {
      type: String,
      enum: ['Mild', 'Moderate', 'Severe']
    },
    diagnosisDate: Date,
    followUpRequired: Boolean
  },
  treatment: {
    name: String,
    description: String,
    duration: String,
    instructions: String,
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      startDate: Date,
      endDate: Date,
      specialInstructions: String
    }],
    procedures: [{
      name: String,
      date: Date,
      notes: String
    }]
  },
  vitalSigns: {
    bloodPressure: String,
    temperature: String,
    heartRate: String,
    respiratoryRate: String,
    weight: Number,
    height: Number,
    bmi: Number,
    oxygenSaturation: String,
    bloodSugar: String,
    recordedAt: {
      type: Date,
      default: Date.now
    }
  },
  labResults: [{
    testName: String,
    result: String,
    normalRange: String,
    unit: String,
    testDate: Date,
    reportDate: Date,
    labName: String,
    notes: String,
    isAbnormal: Boolean
  }],
  attachments: [{
    fileName: String,
    filePath: String,
    fileType: String,
    description: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  notes: {
    clinical: String,
    private: String,
    followUp: String
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled', 'Pending', 'Under Review'],
    default: 'Active'
  },
  followUp: {
    required: Boolean,
    date: Date,
    reason: String,
    instructions: String,
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Missed', 'Cancelled'],
      default: 'Scheduled'
    }
  },
  billing: {
    charged: Number,
    paid: Number,
    pending: Number,
    insurance: {
      provider: String,
      policyNumber: String,
      status: String,
      claimAmount: Number
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
medicalRecordSchema.index({ patient: 1, visitDate: -1 });
medicalRecordSchema.index({ doctorId: 1 });
medicalRecordSchema.index({ recordType: 1 });
medicalRecordSchema.index({ 'diagnosis.condition': 'text' });
medicalRecordSchema.index({ status: 1 });

// Virtual for age calculation at the time of record
medicalRecordSchema.virtual('patientAgeAtRecord').get(function() {
  if (this.patient && this.patient.dateOfBirth && this.visitDate) {
    return Math.floor((this.visitDate - this.patient.dateOfBirth) / (1000 * 60 * 60 * 24 * 365.25));
  }
  return null;
});

// Calculate BMI when height and weight are provided
medicalRecordSchema.pre('save', function(next) {
  if (this.vitalSigns.height && this.vitalSigns.weight) {
    const heightInMeters = this.vitalSigns.height / 100;
    this.vitalSigns.bmi = (this.vitalSigns.weight / (heightInMeters * heightInMeters)).toFixed(2);
  }
  next();
});

// Check if model exists before creating
const MedicalRecord = mongoose.models.MedicalRecord || mongoose.model('MedicalRecord', medicalRecordSchema);
module.exports = MedicalRecord;