const { Conversation, Message } = require('../models/messageModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all conversations for user
// @route   GET /api/v1/admin/communications/messages/conversations
// @access  Private
exports.getConversations = asyncHandler(async (req, res, next) => {
  const conversations = await Conversation.find({
    participants: req.user._id
  })
    .populate('participants', 'name email')
    .populate('lastMessage.sender', 'name')
    .sort('-updatedAt');

  res.status(200).json({
    success: true,
    data: conversations
  });
});

// @desc    Create new conversation
// @route   POST /api/v1/admin/communications/messages/conversations
// @access  Private
exports.createConversation = asyncHandler(async (req, res, next) => {
  const { participants, message } = req.body;

  // Add current user to participants
  if (!participants.includes(req.user._id)) {
    participants.push(req.user._id);
  }

  // Create conversation
  const conversation = await Conversation.create({
    participants,
    lastMessage: {
      content: message,
      sender: req.user._id,
      timestamp: Date.now()
    }
  });

  // Create first message
  await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    content: message
  });

  const populatedConversation = await Conversation.findById(conversation._id)
    .populate('participants', 'name email')
    .populate('lastMessage.sender', 'name');

  res.status(201).json({
    success: true,
    data: populatedConversation
  });
});

// @desc    Get messages for conversation
// @route   GET /api/v1/admin/communications/messages/:conversationId
// @access  Private
exports.getMessages = asyncHandler(async (req, res, next) => {
  const conversation = await Conversation.findById(req.params.conversationId);

  if (!conversation) {
    return next(new ErrorResponse('Conversation not found', 404));
  }

  // Check if user is participant
  if (!conversation.participants.includes(req.user._id)) {
    return next(new ErrorResponse('Not authorized to view this conversation', 403));
  }

  const messages = await Message.find({ conversation: req.params.conversationId })
    .populate('sender', 'name')
    .sort('createdAt');

  // Mark messages as read
  await Message.updateMany(
    {
      conversation: req.params.conversationId,
      'read.user': { $ne: req.user._id }
    },
    {
      $push: {
        read: {
          user: req.user._id,
          readAt: Date.now()
        }
      }
    }
  );

  // Update unread count
  await Conversation.findByIdAndUpdate(req.params.conversationId, {
    $set: { unreadCount: 0 }
  });

  res.status(200).json({
    success: true,
    data: messages
  });
});

// @desc    Send message
// @route   POST /api/v1/admin/communications/messages/:conversationId
// @access  Private
exports.sendMessage = asyncHandler(async (req, res, next) => {
  const conversation = await Conversation.findById(req.params.conversationId);

  if (!conversation) {
    return next(new ErrorResponse('Conversation not found', 404));
  }

  if (!conversation.participants.includes(req.user._id)) {
    return next(new ErrorResponse('Not authorized to send message', 403));
  }

  const message = await Message.create({
    conversation: req.params.conversationId,
    sender: req.user._id,
    content: req.body.content,
    read: [{
      user: req.user._id,
      readAt: Date.now()
    }]
  });

  // Update conversation
  await Conversation.findByIdAndUpdate(req.params.conversationId, {
    lastMessage: {
      content: req.body.content,
      sender: req.user._id,
      timestamp: Date.now()
    },
    $inc: { unreadCount: conversation.participants.length - 1 }
  });

  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'name');

  res.status(201).json({
    success: true,
    data: populatedMessage
  });
});