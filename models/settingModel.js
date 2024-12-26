const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    system: {
      type: Boolean,
      default: true
    },
    appointments: {
      type: Boolean,
      default: true
    },
    updates: {
      type: Boolean,
      default: true
    }
  },
  appearance: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium'
    },
    colorScheme: {
      type: String,
      enum: ['blue', 'green', 'purple', 'red'],
      default: 'blue'
    }
  },
  system: {
    language: {
      type: String,
      enum: ['en', 'es', 'fr', 'de'],
      default: 'en'
    },
    timeZone: {
      type: String,
      default: 'UTC'
    },
    dateFormat: {
      type: String,
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      default: 'DD/MM/YYYY'
    },
    timeFormat: {
      type: String,
      enum: ['12', '24'],
      default: '24'
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'PKR'],
      default: 'USD'
    }
  },
  security: {
    twoFactorAuth: {
      type: Boolean,
      default: false
    },
    sessionTimeout: {
      type: Number,
      enum: [15, 30, 60, 120],
      default: 30
    },
    passwordExpiry: {
      type: Number,
      enum: [30, 60, 90, 180],
      default: 90
    },
    loginAttempts: {
      type: Number,
      enum: [3, 5, 10],
      default: 5
    }
  },
  workingHours: {
    start: {
      type: String,
      default: '09:00'
    },
    end: {
      type: String,
      default: '17:00'
    },
    workingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Setting', settingSchema);