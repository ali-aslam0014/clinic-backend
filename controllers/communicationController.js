const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Reminder = require('../models/reminderModel');
const Template = require('../models/templateModel');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');

// @desc    Get all reminders
// @route   GET /api/communication/reminders
// @access  Private
exports.getReminders = asyncHandler(async (req, res) => {
  const reminders = await Reminder.find()
    .populate('templateId', 'name type')
    .populate('createdBy', 'name');

  res.status(200).json({
    success: true,
    data: reminders
  });
});

// @desc    Create new reminder
// @route   POST /api/communication/reminders
// @access  Private
exports.createReminder = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;

  const reminder = await Reminder.create(req.body);

  res.status(201).json({
    success: true,
    data: reminder
  });
});

// @desc    Update reminder
// @route   PUT /api/communication/reminders/:id
// @access  Private
exports.updateReminder = asyncHandler(async (req, res) => {
  let reminder = await Reminder.findById(req.params.id);

  if (!reminder) {
    return next(new ErrorResponse(`Reminder not found with id of ${req.params.id}`, 404));
  }

  reminder = await Reminder.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: reminder
  });
});

// @desc    Delete reminder
// @route   DELETE /api/communication/reminders/:id
// @access  Private
exports.deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findById(req.params.id);

  if (!reminder) {
    return next(new ErrorResponse(`Reminder not found with id of ${req.params.id}`, 404));
  }

  await reminder.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get all templates
// @route   GET /api/communication/templates
// @access  Private
exports.getTemplates = asyncHandler(async (req, res) => {
  const templates = await Template.find()
    .populate('createdBy', 'name');

  res.status(200).json({
    success: true,
    data: templates
  });
});

// @desc    Create new template
// @route   POST /api/communication/templates
// @access  Private
exports.createTemplate = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user.id;

  const template = await Template.create(req.body);

  res.status(201).json({
    success: true,
    data: template
  });
});

// @desc    Process reminders
// @route   POST /api/communication/process-reminders
// @access  Private
exports.processReminders = asyncHandler(async (req, res) => {
  const reminders = await Reminder.find({ status: true })
    .populate('templateId');

  const now = new Date();
  const processedReminders = [];

  for (const reminder of reminders) {
    // Get appointments/events that need reminders
    const events = await getEventsForReminder(reminder, now);

    for (const event of events) {
      try {
        // Process each reminder method
        for (const method of reminder.method) {
          if (method === 'email' && event.patient.email) {
            await sendReminderEmail(event, reminder.templateId);
          }
          if (method === 'sms' && event.patient.phone) {
            await sendReminderSMS(event, reminder.templateId);
          }
        }

        processedReminders.push({
          eventId: event._id,
          reminderType: reminder.type,
          status: 'success'
        });
      } catch (error) {
        processedReminders.push({
          eventId: event._id,
          reminderType: reminder.type,
          status: 'failed',
          error: error.message
        });
      }
    }
  }

  res.status(200).json({
    success: true,
    data: processedReminders
  });
});

// Helper function to get events for reminder
const getEventsForReminder = async (reminder, now) => {
  const reminderTime = reminder.timing * 60 * 60 * 1000; // Convert hours to milliseconds
  const targetTime = new Date(now.getTime() + reminderTime);

  switch (reminder.type) {
    case 'appointment':
      return await Appointment.find({
        appointmentDate: {
          $gte: now,
          $lte: targetTime
        },
        reminderSent: false
      }).populate('patientId');

    case 'followup':
      return await FollowUp.find({
        followUpDate: {
          $gte: now,
          $lte: targetTime
        },
        reminderSent: false
      }).populate('patientId');

    case 'medication':
      return await Prescription.find({
        endDate: {
          $gte: now,
          $lte: targetTime
        },
        reminderSent: false
      }).populate('patientId');

    default:
      return [];
  }
};

// Helper function to send reminder email
const sendReminderEmail = async (event, template) => {
  const variables = replaceTemplateVariables(template.content, event);
  
  await sendEmail({
    email: event.patient.email,
    subject: replaceTemplateVariables(template.subject, event),
    message: variables
  });

  // Mark reminder as sent
  event.reminderSent = true;
  await event.save();
};

// Helper function to send reminder SMS
const sendReminderSMS = async (event, template) => {
  const message = replaceTemplateVariables(template.content, event);
  
  await sendSMS({
    to: event.patient.phone,
    message
  });

  // Mark reminder as sent
  event.reminderSent = true;
  await event.save();
};

// Helper function to replace template variables
const replaceTemplateVariables = (content, event) => {
  const variables = {
    patientName: `${event.patient.firstName} ${event.patient.lastName}`,
    appointmentDate: moment(event.appointmentDate).format('DD/MM/YYYY'),
    appointmentTime: moment(event.appointmentDate).format('hh:mm A'),
    doctorName: event.doctor ? event.doctor.name : '',
    clinicName: process.env.CLINIC_NAME,
    clinicPhone: process.env.CLINIC_PHONE
  };

  return content.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    return variables[variable] || match;
  });
}; 