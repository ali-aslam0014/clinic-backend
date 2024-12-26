const mongoose = require('mongoose');
const moment = require('moment');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add medicine name'],
    trim: true,
    unique: true
  },
  category: {
    type: String,
    required: [true, 'Please select category'],
    enum: ['Tablets', 'Capsules', 'Syrup', 'Injection', 'Cream', 'Drops']
  },
  stock: {
    type: Number,
    required: [true, 'Please add stock quantity'],
    min: 0
  },
  price: {
    type: Number,
    required: [true, 'Please add price']
  },
  minStockLevel: {
    type: Number,
    required: [true, 'Please add minimum stock level'],
    min: 0
  },
  expiryDate: {
    type: Date,
    required: [true, 'Please add expiry date']
  },
  genericName: {
    type: String,
    required: [true, 'Please add generic name'],
    trim: true
  },
  manufacturer: {
    type: String,
    required: [true, 'Please add manufacturer']
  },
  supplier: {
    type: String,
    required: [true, 'Please add supplier']
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Please add purchase price']
  },
  batchNumber: {
    type: String,
    required: [true, 'Please add batch number']
  },
  location: {
    type: String,
    required: [true, 'Please add storage location']
  },
  description: String,
  sideEffects: String,
  dosage: String,
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Out of Stock', 'Expired'],
    default: 'Active'
  },
  created_by: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  updated_by: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  barcode: {
    type: String,
    required: [true, 'Please add barcode'],
    unique: true,
    trim: true
  },
  manufacturingDate: {
    type: Date,
    required: [true, 'Please add manufacturing date']
  },
  image: {
    type: String,
    default: 'no-image.jpg'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to update status
medicineSchema.pre('save', function(next) {
  if (this.expiryDate < Date.now()) {
    this.status = 'Expired';
  }
  else if (this.stock <= 0) {
    this.status = 'Out of Stock';
  } else if (this.stock <= this.minStockLevel) {
    this.status = 'Low Stock';
  } else {
    this.status = 'Active';
  }
  next();
});

// Indexes for better query performance
medicineSchema.index({ name: 1 });
medicineSchema.index({ category: 1 });
medicineSchema.index({ status: 1 });
medicineSchema.index({ manufacturer: 1 });
medicineSchema.index({ barcode: 1 });

// Add this method for checking if medicine is low on stock
medicineSchema.methods.isLowStock = function() {
  return this.stock <= this.minStockLevel;
};

// Add this method for checking if medicine is expiring soon
medicineSchema.methods.isExpiringSoon = function(days = 90) {
  return moment(this.expiryDate).diff(moment(), 'days') <= days;
};

module.exports = mongoose.model('Medicine', medicineSchema);