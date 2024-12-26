const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
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
  prescriptionId: {
    type: String,
    unique: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  diagnosis: {
    condition: String,
    notes: String
  },
  medications: [{
    name: {
      type: String,
      required: true
    },
    dosage: {
      type: String,
      required: true
    },
    frequency: {
      type: String,
      required: true
    },
    duration: String,
    quantity: Number,
    instructions: String,
    timing: {
      type: String,
      enum: ['Before Meals', 'After Meals', 'With Meals', 'Empty Stomach', 'Before Sleep', 'As Needed']
    },
    route: {
      type: String,
      enum: ['Oral', 'Topical', 'Injection', 'Inhalation', 'Other']
    }
  }],
  tests: [{
    name: String,
    instructions: String,
    type: String
  }],
  advice: String,
  followUp: {
    required: Boolean,
    date: Date,
    notes: String
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled'],
    default: 'Active'
  },
  dispensed: {
    status: {
      type: Boolean,
      default: false
    },
    date: Date,
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  notes: {
    private: String,
    pharmacy: String
  },
  vitals: {
    bloodPressure: String,
    temperature: String,
    pulse: String,
    weight: String,
    height: String
  },
  allergies: [String],
  previousMedications: [{
    name: String,
    reaction: String,
    period: String
  }],
  attachments: [{
    type: String,
    url: String,
    name: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  signature: {
    digital: String,
    timestamp: Date
  },
  template: {
    type: Boolean,
    default: false
  },
  version: {
    type: Number,
    default: 1
  },
  modificationHistory: [{
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    changes: Object
  }],
  doctorSignature: {
    type: String,
    required: [true, 'Digital signature is required']
  }
}, {
  timestamps: true
});

// Generate Prescription ID before saving
prescriptionSchema.pre('save', async function(next) {
  if (!this.prescriptionId) {
    const count = await this.constructor.countDocuments();
    this.prescriptionId = `RX${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Indexes for better query performance
prescriptionSchema.index({ patient: 1, date: -1 });
prescriptionSchema.index({ doctor: 1 });
prescriptionSchema.index({ prescriptionId: 1 });
prescriptionSchema.index({ status: 1 });

// Add new methods
prescriptionSchema.methods.generatePDF = async function() {
  // PDF generation logic
};

prescriptionSchema.methods.sendToPharmacy = async function(pharmacyId) {
  // Pharmacy sending logic
};

// Method to check if prescription belongs to patient
prescriptionSchema.methods.belongsToPatient = function(patientId) {
  return this.patient.toString() === patientId.toString();
};

// Method to get prescription status
prescriptionSchema.methods.getStatus = function() {
  if (this.status === 'Active') {
    const today = new Date();
    const endDate = new Date(this.date);
    endDate.setDate(endDate.getDate() + 30); // Assuming 30 days validity
    
    return today <= endDate ? 'Active' : 'Expired';
  }
  return this.status;
};

// Virtual for remaining days
prescriptionSchema.virtual('remainingDays').get(function() {
  if (this.status !== 'Active') return 0;
  
  const today = new Date();
  const endDate = new Date(this.date);
  endDate.setDate(endDate.getDate() + 30);
  
  const diffTime = endDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Prescription', prescriptionSchema);