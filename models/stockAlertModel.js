const mongoose = require('mongoose');

const stockAlertSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  type: {
    type: String,
    enum: ['out_of_stock', 'low_stock'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'resolved'],
    default: 'active'
  },
  threshold: {
    type: Number,
    required: true
  },
  currentStock: {
    type: Number,
    required: true
  },
  notifiedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notifiedAt: Date
  }],
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('StockAlert', stockAlertSchema);