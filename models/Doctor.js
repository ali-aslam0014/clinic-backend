// models/Doctor.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Check if model exists before defining
if (mongoose.models.Doctor) {
  module.exports = mongoose.models.Doctor;
} else {
  const doctorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    specialization: {
        type: String,
        required: true
    },
    qualification: {
        type: String,
        required: true
    },
    experience: {
        type: Number,
        required: true
    },
    registrationNumber: {
        type: String,
        required: true,
        unique: true
    },
    consultationFee: {
        type: Number,
        required: true
    },
    availabilitySchedule: [{
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        startTime: String,
        endTime: String,
        isAvailable: {
            type: Boolean,
            default: true
        }
    }],
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    about: {
        type: String,
        maxlength: [500, 'About description cannot be more than 500 characters']
    },
    services: [{
        type: String
    }],
    ratings: [{
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        review: String,
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient'
        },
        date: {
            type: Date,
            default: Date.now
        }
    }],
    averageRating: {
        type: Number,
        default: 0
    },
    totalPatients: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'on-leave'],
        default: 'active'
    },
    workingHours: [{
        day: {
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            required: true
        },
        isAvailable: {
            type: Boolean,
            default: true
        },
        startTime: {
            type: String,
            validate: {
                validator: function(v) {
                    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
                },
                message: 'Start time must be in HH:mm format'
            }
        },
        endTime: {
            type: String,
            validate: {
                validator: function(v) {
                    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
                },
                message: 'End time must be in HH:mm format'
            }
        },
        breakTime: {
            start: String,
            end: String
        }
    }],
    appointmentDuration: {
        type: Number,
        default: 30,
        min: 10,
        max: 120
    }
  }, {
    timestamps: true
  });

  // Add indexes for better search performance
  doctorSchema.index({ specialization: 1 });
  doctorSchema.index({ experience: 1 });
  doctorSchema.index({ status: 1 });
  doctorSchema.index({ averageRating: -1 });

  // Virtual for full name
  doctorSchema.virtual('fullName').get(function() {
    return `Dr. ${this.userId.name}`;
  });

  // Method to check availability
  doctorSchema.methods.isAvailableOn = function(day) {
    const schedule = this.availabilitySchedule.find(s => s.day === day);
    return schedule ? schedule.isAvailable : false;
  };

  // Method to get current availability
  doctorSchema.methods.getCurrentAvailability = function() {
    const now = new Date();
    const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    return this.isAvailableOn(day);
  };

  module.exports = mongoose.model('Doctor', doctorSchema);
}