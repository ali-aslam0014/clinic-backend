const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  pharmacyName: {
    type: String,
    required: [true, 'Please add a pharmacy name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  operatingHours: {
    openTime: {
      type: String,
      required: [true, 'Please add opening time'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please add valid time']
    },
    closeTime: {
      type: String,
      required: [true, 'Please add closing time'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please add valid time']
    }
  },
  currency: {
    type: String,
    enum: ['PKR', 'USD', 'EUR', 'GBP'],
    default: 'PKR'
  },
  language: {
    type: String,
    enum: ['en', 'ur', 'ar'],
    default: 'en'
  },
  timeZone: {
    type: String,
    enum: ['PKT', 'GMT', 'EST'],
    default: 'PKT'
  },
  notifications: {
    lowStock: {
      type: Boolean,
      default: true
    },
    expiry: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: true
    },
    stockThreshold: {
      type: Number,
      default: 10,
      min: [1, 'Threshold must be at least 1']
    },
    expiryDays: {
      type: Number,
      default: 30,
      min: [1, 'Days must be at least 1']
    }
  },
  security: {
    twoFactor: {
      type: Boolean,
      default: false
    },
    sessionTimeout: {
      type: Number,
      default: 30,
      min: [5, 'Timeout must be at least 5 minutes'],
      max: [120, 'Timeout cannot be more than 120 minutes']
    },
    passwordExpiry: {
      type: Number,
      default: 90,
      min: [30, 'Password expiry must be at least 30 days'],
      max: [180, 'Password expiry cannot be more than 180 days']
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', SettingsSchema); 