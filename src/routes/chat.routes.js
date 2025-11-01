const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const chatController = require('../controllers/chat.controller');

const router = express.Router();

// Validation rules
const messageValidation = [
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('conversationId').optional().isUUID().withMessage('Invalid conversation ID')
];

// Routes
router.post('/message', authenticate, messageValidation, validate, chatController.sendMessage);
router.get('/conversations', authenticate, chatController.getConversations);
router.get('/conversations/:conversationId', authenticate, chatController.getConversationById);
router.get('/conversations/:conversationId/messages', authenticate, chatController.getMessages);
router.delete('/conversations/:conversationId', authenticate, chatController.deleteConversation);

module.exports = router;
