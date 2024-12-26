const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    unique: true,
    required: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: [true, 'Gender is required']
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required']
  },
  email: {
    type: String,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  medicalHistory: [{
    condition: String,
    diagnosedDate: Date,
    notes: String
  }],
  allergies: [{
    type: String
  }],
  currentMedications: [{
    name: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date
  }],
  profileImage: {
    type: String,
    default: 'uploads/default-avatar.png'
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields for appointments, bills, and documents
patientSchema.virtual('appointments', {
  ref: 'Appointment',
  localField: '_id',
  foreignField: 'patient'
});

patientSchema.virtual('bills', {
  ref: 'Bill',
  localField: '_id',
  foreignField: 'patient'
});

patientSchema.virtual('documents', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'patient'
});

// Generate Patient ID before saving
patientSchema.pre('save', async function(next) {
  if (!this.patientId) {
    const count = await this.constructor.countDocuments();
    this.patientId = `P${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Index for better search performance
patientSchema.index({ 
  firstName: 'text', 
  lastName: 'text', 
  patientId: 'text', 
  contactNumber: 'text' 
});

module.exports = mongoose.model('Patient', patientSchema);