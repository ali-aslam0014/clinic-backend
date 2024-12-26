const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a role name'],
    unique: true,
    trim: true,
    minlength: [3, 'Role name must be at least 3 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  permissions: [{
    type: String,
    required: true
  }],
  isDefault: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for user count
roleSchema.virtual('userCount', {
  ref: 'User',
  localField: 'name',
  foreignField: 'role',
  count: true
});

// Prevent deletion of admin role
roleSchema.pre('remove', async function(next) {
  if (this.name === 'admin') {
    next(new Error('Cannot delete admin role'));
  }
  next();
});

module.exports = mongoose.model('Role', roleSchema);