const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    unique: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
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
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true
    },
    receivedQuantity: {
      type: Number,
      default: 0
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'received', 'cancelled'],
    default: 'pending'
  },
  expectedDeliveryDate: {
    type: Date,
    required: true
  },
  receivedDate: Date,
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Generate PO number before saving
purchaseOrderSchema.pre('save', async function(next) {
  if (!this.poNumber) {
    const lastPO = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    const lastNumber = lastPO ? parseInt(lastPO.poNumber.split('-')[1]) : 0;
    this.poNumber = `PO-${(lastNumber + 1).toString().padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);