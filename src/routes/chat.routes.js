const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const chatController = require('../controllers/chat.controller');

const router = express.Router();

// Validation rules
const startConversationValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters')
];

const continueConversationValidation = [
  param('conversationId')
    .isUUID()
    .withMessage('Invalid conversation ID'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters')
];

const conversationIdValidation = [
  param('conversationId')
    .isUUID()
    .withMessage('Invalid conversation ID')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Routes

// API 1: Start new conversation (first message)
router.post(
  '/conversations/start',
  authenticate,
  startConversationValidation,
  validate,
  chatController.startConversation
);

// API 2: Continue existing conversation
router.post(
  '/conversations/:conversationId/messages',
  authenticate,
  continueConversationValidation,
  validate,
  chatController.continueConversation
);

// API 3: List all conversations (for left sidebar)
router.get(
  '/conversations',
  authenticate,
  paginationValidation,
  validate,
  chatController.getConversations
);

// API 4: Get single conversation with messages
router.get(
  '/conversations/:conversationId',
  authenticate,
  [...conversationIdValidation, ...paginationValidation],
  validate,
  chatController.getConversationWithMessages
);

// Delete conversation
router.delete(
  '/conversations/:conversationId',
  authenticate,
  conversationIdValidation,
  validate,
  chatController.deleteConversation
);

module.exports = router;
