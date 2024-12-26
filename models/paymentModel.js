const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
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
  receiptNumber: {
    type: String,
    unique: true,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank'],
    required: true
  },
  transactionId: {
    type: String,
    unique: true
  },
  cardDetails: {
    cardType: String,
    lastFourDigits: String,
    bankName: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String
}, {
  timestamps: true
});

// Generate receipt number before saving
paymentSchema.pre('save', async function(next) {
  if (!this.receiptNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Find last receipt number for today
    const lastPayment = await this.constructor.findOne({
      paymentDate: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999))
      }
    }).sort({ receiptNumber: -1 });

    let sequence = '001';
    if (lastPayment && lastPayment.receiptNumber) {
      const lastSequence = parseInt(lastPayment.receiptNumber.slice(-3));
      sequence = String(lastSequence + 1).padStart(3, '0');
    }

    this.receiptNumber = `RCP${year}${month}${day}${sequence}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);