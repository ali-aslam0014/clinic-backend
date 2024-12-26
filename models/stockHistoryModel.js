const mongoose = require('mongoose');

const stockHistorySchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  type: {
    type: String,
    enum: ['add', 'remove'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  reason: {
    type: String,
    required: true,
    enum: ['purchase', 'sale', 'expired', 'damaged', 'return', 'adjustment']
  },
  batchNumber: {
    type: String,
    required: function() {
      return this.type === 'add';
    }
  },
  expiryDate: {
    type: Date,
    required: function() {
      return this.type === 'add';
    }
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('StockHistory', stockHistorySchema);