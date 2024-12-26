const mongoose = require('mongoose');

const smsTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    maxLength: 160
  },
  category: {
    type: String,
    enum: ['appointment', 'reminder', 'promotion', 'other'],
    default: 'other'
  },
  variables: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const smsLogSchema = new mongoose.Schema({
  recipient: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'failed'],
    default: 'pending'
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SMSTemplate'
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  error: String,
  deliveredAt: Date,
  provider: String,
  messageId: String,
  cost: Number
}, {
  timestamps: true
});

const SMSTemplate = mongoose.model('SMSTemplate', smsTemplateSchema);
const SMSLog = mongoose.model('SMSLog', smsLogSchema);

module.exports = { SMSTemplate, SMSLog };