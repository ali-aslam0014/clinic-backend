const mongoose = require('mongoose');
const moment = require('moment');

const labReportSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  testName: {
    type: String,
    required: [true, 'Please add test name']
  },
  testCategory: {
    type: String,
    enum: ['Blood Test', 'Urine Test', 'Imaging', 'Pathology', 'Other'],
    required: true
  },
  testDate: {
    type: Date,
    required: true
  },
  reportDate: {
    type: Date,
    default: Date.now
  },
  results: [{
    parameter: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    },
    unit: String,
    referenceRange: String,
    flag: {
      type: String,
      enum: ['Normal', 'High', 'Low', 'Critical'],
      default: 'Normal'
    }
  }],
  summary: {
    type: String,
    required: [true, 'Please add test summary']
  },
  interpretation: String,
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  labTechnician: {
    type: String,
    required: true
  },
  attachments: [{
    name: String,
    fileUrl: String,
    fileType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  notes: String,
  isUrgent: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
labReportSchema.index({ patientId: 1, testDate: -1 });
labReportSchema.index({ doctorId: 1 });
labReportSchema.index({ status: 1 });
labReportSchema.index({ testCategory: 1 });

// Virtual for report age
labReportSchema.virtual('reportAge').get(function() {
  return moment(this.reportDate).fromNow();
});

// Method to check if report belongs to patient
labReportSchema.methods.belongsToPatient = function(patientId) {
  return this.patientId.toString() === patientId.toString();
};

// Method to check if report is verified
labReportSchema.methods.isVerified = function() {
  return this.status === 'Completed' && this.verifiedBy;
};

// Method to get critical parameters
labReportSchema.methods.getCriticalParameters = function() {
  return this.results.filter(result => result.flag === 'Critical');
};

module.exports = mongoose.model('LabReport', labReportSchema);