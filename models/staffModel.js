const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    match: [/^[0-9]{11}$/, 'Please add a valid phone number']
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['receptionist', 'pharmacist'],
    default: 'receptionist'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  avatar: {
    type: String,
    default: null
  },
  licenseNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  experience: {
    type: Number,
    min: 0
  },
  specialization: String,
  isOnDuty: {
    type: Boolean,
    default: false
  },
  address: {
    type: String,
    default: ''
  },
  profileImage: {
    type: String,
    default: 'default.jpg'
  },
  settings: {
    notifications: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      smsNotifications: {
        type: Boolean,
        default: true
      },
      desktopNotifications: {
        type: Boolean,
        default: true
      },
      soundAlerts: {
        type: Boolean,
        default: true
      }
    },
    display: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
      },
      language: {
        type: String,
        enum: ['en', 'es', 'fr'],
        default: 'en'
      },
      timezone: {
        type: String,
        default: 'UTC'
      }
    }
  }
}, {
  timestamps: true
});

// Encrypt password using bcrypt
staffSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password
staffSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Staff', staffSchema);