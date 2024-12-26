const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Patient name is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  age: {
    type: Number,
    required: [true, 'Age is required']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['male', 'female', 'other']
  },
  bloodGroup: {
    type: String,
    required: [true, 'Blood group is required']
  },
  address: {
    type: String,
    required: [true, 'Address is required']
  },
  image: {
    type: String
  },
  emergencyContact: {
    name: String,
    relation: String,
    phone: String
  },
  medicalHistory: [{
    condition: String,
    diagnosis: String,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['active', 'resolved', 'ongoing']
    }
  }],
  allergies: [{
    type: String
  }],
  currentMedications: [{
    medicine: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date
  }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    validUntil: Date,
    coverageDetails: String
  }
}, {
  timestamps: true
});

// Virtual for medical records
patientSchema.virtual('medicalRecords', {
  ref: 'MedicalRecord',
  localField: '_id',
  foreignField: 'patient'
});

// Ensure virtuals are included in JSON
patientSchema.set('toJSON', { virtuals: true });
patientSchema.set('toObject', { virtuals: true });

// Check if model exists before creating
const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
module.exports = Patient;