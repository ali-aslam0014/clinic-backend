const mongoose = require('mongoose');

// Check if model already exists before defining
const Document = mongoose.models.Document || mongoose.model('Document', new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Lab Report', 'X-Ray', 'MRI', 'Prescription', 'Other'],
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileType: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: String,
  tags: [String],
  isPrivate: {
    type: Boolean,
    default: false
  },
  // New fields for scan & upload
  scanSource: {
    type: String,
    enum: ['scanner', 'upload', 'mobile'],
    default: 'upload'
  },
  scanQuality: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  scanResolution: {
    type: String,
    default: '300dpi'
  },
  scanDate: {
    type: Date,
    default: Date.now
  },
  scannerDetails: {
    deviceName: String,
    deviceId: String,
    settings: {
      colorMode: {
        type: String,
        enum: ['color', 'grayscale', 'blackwhite'],
        default: 'color'
      },
      duplex: {
        type: Boolean,
        default: false
      }
    }
  }
}, {
  timestamps: true
}));

module.exports = Document;