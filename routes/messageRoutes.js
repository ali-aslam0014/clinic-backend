const express = require('express');
const router = express.Router();
const {
  getConversations,
  createConversation,
  getMessages,
  sendMessage
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/messages/conversations')
  .get(getConversations)
  .post(createConversation);

router.route('/messages/:conversationId')
  .get(getMessages)
  .post(sendMessage);

module.exports = router;