const mongoose = require('mongoose');
const moment = require('moment');

const appointmentSchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    appointmentDate: {
        type: Date,
        required: true
    },
    timeSlot: {
        start: {
            type: String,
            required: true
        },
        end: {
            type: String,
            required: true
        },
        duration: {
            type: Number, // in minutes
            default: 30
        }
    },
    type: {
        type: String,
        enum: ['New Visit', 'Follow-up', 'Consultation', 'Emergency'],
        default: 'New Visit'
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
    },
    reason: {
        type: String,
        required: true
    },
    notes: {
        type: String
    },
    prescription: {
        medicines: [{
            name: String,
            dosage: String,
            duration: String,
            frequency: String,
            instructions: String
        }],
        diagnosis: String,
        instructions: String,
        nextVisitDate: Date,
        tests: [{
            name: String,
            instructions: String
        }]
    },
    checkedIn: {
        status: {
            type: Boolean,
            default: false
        },
        time: Date
    },
    payment: {
        status: {
            type: String,
            enum: ['Pending', 'Completed', 'Refunded'],
            default: 'Pending'
        },
        amount: Number,
        method: String,
        transactionId: String,
        paidAt: Date
    },
    reminder: {
        sent: {
            type: Boolean,
            default: false
        },
        sentAt: Date
    },
    followUp: {
        required: Boolean,
        recommendedDate: Date,
        notes: String
    },
    cancelledBy: {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        date: Date
    },
    completedAt: Date,
    vitals: {
        bloodPressure: String,
        temperature: Number,
        pulse: Number,
        weight: Number,
        height: Number,
        notes: String
    }
}, {
    timestamps: true
});

// Indexes for better query performance
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ 'payment.status': 1 });

// Virtual for appointment duration
appointmentSchema.virtual('duration').get(function() {
    if (this.timeSlot.start && this.timeSlot.end) {
        const start = moment(this.timeSlot.start, 'HH:mm');
        const end = moment(this.timeSlot.end, 'HH:mm');
        return end.diff(start, 'minutes');
    }
    return 30; // default duration
});

// Method to check if appointment can be cancelled
appointmentSchema.methods.canBeCancelled = function() {
    return ['pending', 'confirmed'].includes(this.status);
};

// Method to check if slot is available
appointmentSchema.statics.isSlotAvailable = async function(doctorId, date, startTime, endTime) {
    const conflictingAppointment = await this.findOne({
        doctorId,
        appointmentDate: date,
        status: { $nin: ['cancelled', 'completed'] },
        'timeSlot.start': { $lt: endTime },
        'timeSlot.end': { $gt: startTime }
    });
    return !conflictingAppointment;
};

// Method to check if appointment is upcoming
appointmentSchema.methods.isUpcoming = function() {
    return moment(this.appointmentDate).isAfter(moment()) && 
           ['pending', 'confirmed'].includes(this.status);
};

// Method to get appointment status color
appointmentSchema.methods.getStatusColor = function() {
    const statusColors = {
        pending: '#faad14',    // warning yellow
        confirmed: '#52c41a',  // success green
        cancelled: '#ff4d4f',  // error red
        completed: '#1890ff',  // primary blue
        'no-show': '#595959'   // grey
    };
    return statusColors[this.status] || '#000000';
};

// Method to check if appointment can be rescheduled
appointmentSchema.methods.canBeRescheduled = function() {
    return ['pending', 'confirmed'].includes(this.status) && 
           moment(this.appointmentDate).isAfter(moment());
};

// Static method to get upcoming appointments
appointmentSchema.statics.getUpcoming = async function(patientId, limit = 5) {
    return this.find({
        patientId,
        appointmentDate: { $gte: new Date() },
        status: { $in: ['pending', 'confirmed'] }
    })
    .populate('doctorId', 'name specialization email phone profileImage')
    .sort({ appointmentDate: 1, 'timeSlot.start': 1 })
    .limit(limit);
};

module.exports = mongoose.model('Appointment', appointmentSchema);