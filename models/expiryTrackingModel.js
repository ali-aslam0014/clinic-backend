const mongoose = require('mongoose');

const expiryHistorySchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  action: {
    type: String,
    enum: ['disposed', 'extended'],
    required: true
  },
  previousExpiryDate: {
    type: Date,
    required: true
  },
  newExpiryDate: {
    type: Date
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  batchNumber: String,
  disposalMethod: {
    type: String,
    enum: ['return', 'destroy', 'other'],
    required: function() {
      return this.action === 'disposed';
    }
  },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('ExpiryHistory', expiryHistorySchema);