const mongoose = require('mongoose');

const notificationSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  emailNotifications: {
    type: Boolean,
    default: true
  },
  smsNotifications: {
    type: Boolean,
    default: true
  },
  appointmentReminders: {
    type: Boolean,
    default: true
  },
  reminderTime: {
    type: Number,
    default: 30, // minutes
    enum: [15, 30, 60, 120, 1440] // Available reminder times
  },
  dailySchedule: {
    type: Boolean,
    default: true
  },
  scheduleTime: {
    type: String,
    default: '08:00'
  },
  newPatientAlerts: {
    type: Boolean,
    default: true
  },
  cancelationAlerts: {
    type: Boolean,
    default: true
  },
  emergencyAlerts: {
    type: Boolean,
    default: true
  },
  marketingEmails: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('NotificationSettings', notificationSettingsSchema);