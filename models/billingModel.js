const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  services: [{
    serviceName: String,
    serviceDate: Date,
    amount: Number,
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'insurance']
  },
  paymentDate: Date,
  dueDate: Date,
  insuranceClaim: {
    claimNumber: String,
    status: String,
    approvedAmount: Number,
    rejectionReason: String
  },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Billing', billingSchema);