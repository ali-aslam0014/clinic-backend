const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add clinic name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add email address'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please add phone number'],
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Please add address']
  },
  logo: {
    type: String,
    default: 'default-logo.png'
  },
  openingTime: {
    type: String,
    required: [true, 'Please add opening time']
  },
  closingTime: {
    type: String,
    required: [true, 'Please add closing time']
  },
  workingDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Clinic', clinicSchema);