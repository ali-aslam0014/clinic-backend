const mongoose = require('mongoose');

const prescriptionHistorySchema = new mongoose.Schema({
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    required: true
  },
  version: {
    type: Number,
    required: true
  },
  changes: {
    type: Object,
    required: true
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  modifiedAt: {
    type: Date,
    default: Date.now
  },
  previousData: {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient'
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    diagnosis: {
      condition: String,
      notes: String
    },
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
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
    vitals: {
      bloodPressure: String,
      temperature: String,
      pulse: String,
      weight: String,
      height: String
    },
    followUp: {
      required: Boolean,
      date: Date,
      notes: String
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Cancelled']
    },
    notes: {
      private: String,
      pharmacy: String
    }
  },
  changeType: {
    type: String,
    enum: ['Created', 'Updated', 'Deleted', 'StatusChanged', 'Dispensed'],
    required: true
  },
  reason: String,
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
prescriptionHistorySchema.index({ prescriptionId: 1, version: 1 });
prescriptionHistorySchema.index({ modifiedBy: 1 });
prescriptionHistorySchema.index({ modifiedAt: 1 });
prescriptionHistorySchema.index({ changeType: 1 });

// Methods
prescriptionHistorySchema.methods.compareVersions = function(otherVersion) {
  // Compare two versions of the prescription
  const differences = {};
  const oldData = this.previousData;
  const newData = otherVersion.previousData;

  // Compare basic fields
  ['diagnosis', 'status', 'notes'].forEach(field => {
    if (JSON.stringify(oldData[field]) !== JSON.stringify(newData[field])) {
      differences[field] = {
        old: oldData[field],
        new: newData[field]
      };
    }
  });

  // Compare medications
  if (oldData.medications.length !== newData.medications.length ||
      JSON.stringify(oldData.medications) !== JSON.stringify(newData.medications)) {
    differences.medications = {
      old: oldData.medications,
      new: newData.medications
    };
  }

  // Compare tests
  if (oldData.tests.length !== newData.tests.length ||
      JSON.stringify(oldData.tests) !== JSON.stringify(newData.tests)) {
    differences.tests = {
      old: oldData.tests,
      new: newData.tests
    };
  }

  return differences;
};

// Statics
prescriptionHistorySchema.statics.getFullHistory = async function(prescriptionId) {
  return this.find({ prescriptionId })
    .sort({ version: 1 })
    .populate('modifiedBy', 'name email')
    .populate('prescriptionId');
};

prescriptionHistorySchema.statics.createHistoryEntry = async function(prescriptionId, changes, user, changeType, reason = '') {
  const lastVersion = await this.findOne({ prescriptionId })
    .sort({ version: -1 });

  const version = lastVersion ? lastVersion.version + 1 : 1;

  return this.create({
    prescriptionId,
    version,
    changes,
    modifiedBy: user._id,
    changeType,
    reason,
    metadata: {
      ipAddress: user.ip,
      userAgent: user.userAgent,
      location: user.location
    }
  });
};

// Middleware
prescriptionHistorySchema.pre('save', function(next) {
  // Ensure version is incremented
  if (this.isNew) {
    this.constructor.findOne({ prescriptionId: this.prescriptionId })
      .sort({ version: -1 })
      .then(lastVersion => {
        if (lastVersion) {
          this.version = lastVersion.version + 1;
        }
        next();
      })
      .catch(err => next(err));
  } else {
    next();
  }
});

module.exports = mongoose.model('PrescriptionHistory', prescriptionHistorySchema);