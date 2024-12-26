const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  category: {
    type: String,
    enum: ['service', 'staff', 'facility', 'other'],
    required: true
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'responded'],
    default: 'pending'
  },
  response: {
    content: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  },
  metadata: {
    browser: String,
    platform: String,
    ipAddress: String
  }
}, {
  timestamps: true
});

// Calculate sentiment based on rating
feedbackSchema.pre('save', function(next) {
  if (this.rating >= 4) {
    this.sentiment = 'positive';
  } else if (this.rating === 3) {
    this.sentiment = 'neutral';
  } else {
    this.sentiment = 'negative';
  }
  next();
});

module.exports = mongoose.model('Feedback', feedbackSchema);