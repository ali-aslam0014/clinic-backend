const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  items: [{
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
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
    total: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'card', 'insurance']
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'partial'],
    default: 'paid'
  },
  paidAmount: {
    type: Number,
    required: true,
    min: 0
  },
  patientName: String,
  patientPhone: String,
  saleBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invoiceNumber: {
    type: String,
    unique: true
  },
  notes: String,
  status: {
    type: String,
    enum: ['completed', 'returned'],
    default: 'completed'
  },
  returnDate: {
    type: Date
  },
  returnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  returnReason: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate invoice number before saving
saleSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const lastSale = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    const lastNumber = lastSale ? parseInt(lastSale.invoiceNumber.split('-')[1]) : 0;
    this.invoiceNumber = `INV-${(lastNumber + 1).toString().padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Sale', saleSchema);