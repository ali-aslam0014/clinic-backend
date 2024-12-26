const mongoose = require('mongoose');

const specializationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Specialization name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for doctors count
specializationSchema.virtual('doctorsCount', {
  ref: 'Doctor',
  localField: 'name',
  foreignField: 'specialization',
  count: true
});

module.exports = mongoose.model('Specialization', specializationSchema);