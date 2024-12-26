const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Queue = require('../models/Queue');
const Consultation = require('../models/Consultation');
const mongoose = require('mongoose');
const moment = require('moment');

// @desc    Call next patient
// @route   POST /api/queue/call-next
const callNextPatient = asyncHandler(async (req, res) => {
  const { queueId } = req.body;

  // Start a transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get the queue entry
    const queueEntry = await Queue.findById(queueId)
      .populate('patientId', 'firstName lastName contactNumber email')
      .populate('doctorId', 'name roomNumber')
      .session(session);

    if (!queueEntry) {
      throw new ErrorResponse('Queue entry not found', 404);
    }

    if (queueEntry.status !== 'waiting') {
      throw new ErrorResponse('Patient is not in waiting status', 400);
    }

    // Check if any patient is currently in consultation
    const currentPatient = await Queue.findOne({
      doctorId: queueEntry.doctorId,
      status: 'in-consultation',
      date: {
        $gte: moment(queueEntry.date).startOf('day'),
        $lte: moment(queueEntry.date).endOf('day')
      }
    }).session(session);

    if (currentPatient) {
      throw new ErrorResponse('Another patient is currently in consultation', 400);
    }

    // Update queue entry status
    queueEntry.status = 'in-consultation';
    queueEntry.consultationStartTime = new Date();
    queueEntry.callCount = (queueEntry.callCount || 0) + 1;
    queueEntry.lastCalledTime = new Date();

    await queueEntry.save({ session });

    // Create consultation record
    const consultation = await Consultation.create([{
      queueId: queueEntry._id,
      patientId: queueEntry.patientId._id,
      doctorId: queueEntry.doctorId._id,
      appointmentId: queueEntry.appointmentId,
      startTime: new Date(),
      status: 'in-progress'
    }], { session });

    // Send notifications
    try {
      await sendCallNotifications(queueEntry);
    } catch (error) {
      console.error('Notification error:', error);
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: {
        queue: queueEntry,
        consultation: consultation[0]
      }
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// @desc    Send reminder to patient
// @route   POST /api/queue/:id/remind
const sendReminder = asyncHandler(async (req, res) => {
  const queueEntry = await Queue.findById(req.params.id)
    .populate('patientId', 'firstName lastName contactNumber email')
    .populate('doctorId', 'name roomNumber');

  if (!queueEntry) {
    throw new ErrorResponse('Queue entry not found', 404);
  }

  if (queueEntry.status !== 'waiting') {
    throw new ErrorResponse('Can only send reminders to waiting patients', 400);
  }

  // Send reminder notifications
  await sendReminderNotifications(queueEntry);

  // Update reminder count
  queueEntry.reminderCount = (queueEntry.reminderCount || 0) + 1;
  queueEntry.lastReminderTime = new Date();
  await queueEntry.save();

  res.status(200).json({
    success: true,
    data: queueEntry
  });
});

// Helper Functions
const sendCallNotifications = async (queueEntry) => {
  const { patientId, doctorId, tokenNumber } = queueEntry;
  const message = {
    sms: `Your token number ${tokenNumber} has been called. Please proceed to Dr. ${doctorId.name}'s room (Room ${doctorId.roomNumber}).`,
    email: {
      subject: 'Doctor Ready to See You',
      body: `
        <h2>Your Turn Has Arrived</h2>
        <p>Dear ${patientId.firstName},</p>
        <p>Please proceed to your consultation with the following details:</p>
        <ul>
          <li>Token Number: ${tokenNumber}</li>
          <li>Doctor: Dr. ${doctorId.name}</li>
          <li>Room Number: ${doctorId.roomNumber}</li>
        </ul>
        <p>Please proceed immediately to avoid losing your turn.</p>
      `
    }
  };

  // Implement your notification service here
  // await notificationService.sendSMS(patientId.contactNumber, message.sms);
  // await notificationService.sendEmail(patientId.email, message.email);
};

const sendReminderNotifications = async (queueEntry) => {
  const { patientId, doctorId, tokenNumber, estimatedWaitTime } = queueEntry;
  const message = {
    sms: `Reminder: Your token number is ${tokenNumber}. Estimated wait time: ${estimatedWaitTime} minutes. Please stay in the waiting area.`,
    email: {
      subject: 'Queue Reminder',
      body: `
        <h2>Queue Reminder</h2>
        <p>Dear ${patientId.firstName},</p>
        <p>This is a reminder about your upcoming consultation:</p>
        <ul>
          <li>Token Number: ${tokenNumber}</li>
          <li>Doctor: Dr. ${doctorId.name}</li>
          <li>Estimated Wait Time: ${estimatedWaitTime} minutes</li>
        </ul>
        <p>Please ensure you are in the waiting area.</p>
      `
    }
  };

  // Implement your notification service here
  // await notificationService.sendSMS(patientId.contactNumber, message.sms);
  // await notificationService.sendEmail(patientId.email, message.email);
};

module.exports = {
  callNextPatient,
  sendReminder
};