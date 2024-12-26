const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Doctor name is required']
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
  specialization: {
    type: String,
    required: [true, 'Specialization is required']
  },
  experience: {
    type: Number,
    required: [true, 'Years of experience is required']
  },
  qualifications: {
    type: String,
    required: [true, 'Qualifications are required']
  },
  address: {
    type: String,
    required: [true, 'Address is required']
  },
  image: {
    type: String
  },
  consultationFee: {
    type: Number,
    required: [true, 'Consultation fee is required']
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Doctor', doctorSchema);