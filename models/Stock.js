const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['add', 'remove'],
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: ['purchase', 'sale', 'return', 'expired', 'damaged', 'adjustment']
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String
}, {
  timestamps: true
});

// Indexes for better query performance
stockSchema.index({ medicine: 1, createdAt: -1 });
stockSchema.index({ type: 1 });
stockSchema.index({ updatedBy: 1 });

module.exports = mongoose.model('Stock', stockSchema); 