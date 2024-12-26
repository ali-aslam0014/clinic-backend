const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  refundMethod: {
    type: String,
    enum: ['cash', 'card', 'bank'],
    required: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  refundDate: {
    type: Date,
    default: Date.now
  },
  notes: String,
  refundReference: {
    type: String,
    unique: true
  }
}, {
  timestamps: true
});

// Generate refund reference before saving
refundSchema.pre('save', async function(next) {
  if (!this.refundReference) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Find last refund reference for today
    const lastRefund = await this.constructor.findOne({
      refundDate: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      }
    }).sort({ refundReference: -1 });

    let sequence = '001';
    if (lastRefund && lastRefund.refundReference) {
      const lastSequence = parseInt(lastRefund.refundReference.slice(-3));
      sequence = String(lastSequence + 1).padStart(3, '0');
    }

    this.refundReference = `REF${year}${month}${day}${sequence}`;
  }
  next();
});

module.exports = mongoose.model('Refund', refundSchema); 