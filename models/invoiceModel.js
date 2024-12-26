const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [invoiceItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  invoiceDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  notes: String,
  paymentHistory: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer'],
      required: true
    },
    paymentDate: {
      type: Date,
      required: true
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: String
  }],
  reminders: [{
    sentAt: {
      type: Date,
      required: true
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }]
}, {
  timestamps: true
});

// Generate invoice number before saving
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    this.invoiceNumber = `INV-${moment().format('YYYYMM')}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Update status based on payments
invoiceSchema.pre('save', function(next) {
  this.updateStatus();
  next();
});

// Add method to update status
invoiceSchema.methods.updateStatus = function() {
  if (this.paidAmount >= this.totalAmount) {
    this.status = 'paid';
  } else if (this.paidAmount > 0) {
    this.status = 'partial';
  } else if (moment(this.dueDate).isBefore(moment())) {
    this.status = 'overdue';
  } else {
    this.status = 'pending';
  }
};

module.exports = mongoose.model('Invoice', invoiceSchema);