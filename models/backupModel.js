const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'failed', 'in_progress'],
    default: 'completed'
  },
  type: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'manual'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Backup', backupSchema);