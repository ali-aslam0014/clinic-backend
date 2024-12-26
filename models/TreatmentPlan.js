const mongoose = require('mongoose');

const treatmentPlanSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  diagnosis: {
    condition: String,
    notes: String,
    severity: {
      type: String,
      enum: ['Mild', 'Moderate', 'Severe']
    }
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: Date,
  status: {
    type: String,
    enum: ['Active', 'Completed', 'On Hold', 'Cancelled'],
    default: 'Active'
  },
  goals: [{
    description: String,
    targetDate: Date,
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Achieved', 'Cancelled'],
      default: 'Pending'
    },
    notes: String
  }],
  treatments: [{
    type: {
      type: String,
      enum: ['Medication', 'Procedure', 'Therapy', 'Lifestyle', 'Other'],
      required: true
    },
    name: String,
    description: String,
    frequency: String,
    duration: String,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Scheduled'
    },
    instructions: String,
    notes: String
  }],
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Discontinued'],
      default: 'Active'
    },
    instructions: String,
    sideEffects: [String],
    precautions: [String]
  }],
  followUps: [{
    date: Date,
    type: String,
    notes: String,
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Missed', 'Cancelled'],
      default: 'Scheduled'
    }
  }],
  restrictions: [{
    type: String,
    description: String,
    duration: String,
    startDate: Date,
    endDate: Date
  }],
  dietaryInstructions: {
    recommendations: [String],
    restrictions: [String],
    notes: String
  },
  exerciseInstructions: {
    recommendations: [String],
    restrictions: [String],
    frequency: String,
    duration: String,
    notes: String
  },
  progress: [{
    date: Date,
    notes: String,
    assessment: String,
    nextSteps: String,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  attachments: [{
    name: String,
    fileUrl: String,
    fileType: String,
    description: String,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  cost: {
    estimated: Number,
    actual: Number,
    currency: {
      type: String,
      default: 'PKR'
    },
    breakdown: [{
      item: String,
      cost: Number,
      notes: String
    }]
  },
  notes: {
    clinical: String,
    private: String,
    patientInstructions: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
treatmentPlanSchema.index({ patient: 1, startDate: -1 });
treatmentPlanSchema.index({ doctor: 1 });
treatmentPlanSchema.index({ status: 1 });
treatmentPlanSchema.index({ 'diagnosis.condition': 'text' });

// Virtual for progress percentage
treatmentPlanSchema.virtual('progressPercentage').get(function() {
  if (!this.goals || this.goals.length === 0) return 0;
  
  const achievedGoals = this.goals.filter(goal => goal.status === 'Achieved').length;
  return Math.round((achievedGoals / this.goals.length) * 100);
});

// Virtual for remaining days
treatmentPlanSchema.virtual('remainingDays').get(function() {
  if (!this.endDate) return null;
  const today = new Date();
  const end = new Date(this.endDate);
  const diffTime = Math.abs(end - today);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('TreatmentPlan', treatmentPlanSchema);