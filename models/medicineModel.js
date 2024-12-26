const mongoose = require('mongoose');
const moment = require('moment');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add medicine name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  genericName: {
    type: String,
    required: [true, 'Please add generic name'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please add category'],
    enum: ['tablets', 'capsules', 'syrup', 'injection', 'cream']
  },
  description: {
    type: String,
    trim: true
  },
  manufacturer: {
    type: String,
    required: [true, 'Please add manufacturer'],
    trim: true
  },
  stock: {
    type: Number,
    required: [true, 'Please add stock quantity'],
    min: [0, 'Stock cannot be negative']
  },
  minStockLevel: {
    type: Number,
    required: [true, 'Please add minimum stock level'],
    min: [0, 'Minimum stock level cannot be negative']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Please add unit price'],
    min: [0, 'Price cannot be negative']
  },
  expiryDate: {
    type: Date,
    required: [true, 'Please add expiry date']
  },
  batchNumber: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  status: {
    type: String,
    enum: ['active', 'discontinued', 'out_of_stock'],
    default: 'active'
  },
  notes: String,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual for expiry status
medicineSchema.virtual('expiryStatus').get(function() {
  const months = moment(this.expiryDate).diff(moment(), 'months');
  if (months <= 3) return 'critical';
  if (months <= 6) return 'warning';
  return 'good';
});

// Add virtual for stock status
medicineSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= this.minStockLevel) return 'low';
  return 'adequate';
});

// Add middleware to update lastUpdated
medicineSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model('Medicine', medicineSchema);