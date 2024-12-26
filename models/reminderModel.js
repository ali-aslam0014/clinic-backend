const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['appointment', 'followup', 'medication']
  },
  method: [{
    type: String,
    required: true,
    enum: ['email', 'sms']
  }],
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: true
  },
  timing: {
    type: Number,
    required: true,
    default: 24 // hours before
  },
  status: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
reminderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Reminder', reminderSchema); 