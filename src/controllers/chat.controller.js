const { Conversation, Message } = require('../models');
const logger = require('../config/logger');
const chatService = require('../services/ai/chat.service');

/**
 * API 1: Start new conversation with first message
 * Creates conversation and returns AI response
 */
const startConversation = async (req, res, next) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;

    logger.info('Starting new conversation', { userId });

    // Generate smart title (avoid using greetings as titles)
    let title;
    if (chatService.isGreeting(message)) {
      title = 'New Conversation';
    } else {
      title = message.substring(0, 50) || 'New Conversation';
    }

    // Create new conversation
    const conversation = await Conversation.create({
      userId,
      title,
      lastMessageAt: new Date()
    });

    // Save user's first message
    await Message.create({
      conversationId: conversation.id,
      role: 'user',
      content: message
    });

    // Check for emergency
    let aiResponse;
    if (chatService.detectEmergency(message)) {
      aiResponse = chatService.getEmergencyResponse();
    } else {
      // Generate AI response with empty history (first message)
      aiResponse = await chatService.generateResponse([], message);
    }

    // Save AI response
    const assistantMessage = await Message.create({
      conversationId: conversation.id,
      role: 'assistant',
      content: aiResponse
    });

    logger.info('New conversation started', {
      conversationId: conversation.id,
      userId
    });

    res.status(201).json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          createdAt: conversation.createdAt
        },
        message: {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          createdAt: assistantMessage.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('Error starting conversation:', error);
    next(error);
  }
};

/**
 * API 2: Continue existing conversation
 * Adds message to existing conversation with full context
 */
const continueConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    logger.info('Continuing conversation', { conversationId, userId });

    // Verify conversation exists and belongs to user
    const conversation = await Conversation.findOne({
      where: { id: conversationId, userId }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Get all previous messages for context
    const previousMessages = await Message.findAll({
      where: { conversationId },
      order: [['created_at', 'ASC']],
      attributes: ['role', 'content']
    });

    // Save user's message
    await Message.create({
      conversationId: conversation.id,
      role: 'user',
      content: message
    });

    // Check for emergency
    let aiResponse;
    if (chatService.detectEmergency(message)) {
      aiResponse = chatService.getEmergencyResponse();
    } else {
      // Generate AI response with full conversation context
      aiResponse = await chatService.generateResponse(previousMessages, message);
    }

    // Save AI response
    const assistantMessage = await Message.create({
      conversationId: conversation.id,
      role: 'assistant',
      content: aiResponse
    });

    // Update conversation timestamp
    await conversation.update({
      lastMessageAt: new Date()
    });

    // Auto-generate smart title after 3 health-related messages
    const totalMessages = previousMessages.length + 2; // +2 for current user message and AI response
    
    // Count health-related user messages (not greetings, not off-topic)
    const healthMessages = previousMessages.filter(m => 
      m.role === 'user' && 
      !chatService.isGreeting(m.content) &&
      m.content.length > 10 // Meaningful messages
    );
    
    // Update title if:
    // 1. We have 3+ total messages AND
    // 2. We have 2+ health-related messages AND
    // 3. (Title is default OR title is a greeting OR title seems off-topic)
    const shouldUpdateTitle = totalMessages >= 3 && 
                              healthMessages.length >= 2 &&
                              (conversation.title === 'New Conversation' || 
                               chatService.isGreeting(conversation.title) ||
                               conversation.title.length > 45); // Long titles are usually first messages
    
    if (shouldUpdateTitle) {
      try {
        // Get all messages including the new ones
        const allMessages = await Message.findAll({
          where: { conversationId },
          order: [['created_at', 'ASC']],
          attributes: ['role', 'content']
        });

        const generatedTitle = await chatService.generateConversationTitle(allMessages);
        
        // Only update if the new title is different and meaningful
        if (generatedTitle && generatedTitle !== conversation.title && generatedTitle.length > 5) {
          await conversation.update({ title: generatedTitle });
          
          logger.info('Auto-generated conversation title', {
            conversationId,
            oldTitle: conversation.title,
            newTitle: generatedTitle
          });
        }
      } catch (error) {
        logger.error('Failed to auto-generate title:', error);
        // Continue without updating title
      }
    }

    logger.info('Message added to conversation', {
      conversationId,
      messageCount: totalMessages
    });

    res.status(200).json({
      success: true,
      data: {
        message: {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          createdAt: assistantMessage.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('Error continuing conversation:', error);
    next(error);
  }
};

// Get all conversations for user
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: conversations } = await Conversation.findAndCountAll({
      where: { userId },
      order: [['lastMessageAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: {
        conversations,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single conversation
const getConversationById = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findOne({
      where: { id: conversationId, userId }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { conversation }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * API 4: Get single conversation with messages
 * Returns conversation details with paginated messages
 */
const getConversationWithMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    logger.info('Fetching conversation with messages', {
      conversationId,
      userId,
      page,
      limit
    });

    // Verify conversation belongs to user
    const conversation = await Conversation.findOne({
      where: { id: conversationId, userId }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Get total message count
    const totalMessages = await Message.count({
      where: { conversationId }
    });

    // Get paginated messages
    const offset = (page - 1) * limit;
    const messages = await Message.findAll({
      where: { conversationId },
      order: [['created_at', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: ['id', 'role', 'content', 'created_at']
    });

    res.status(200).json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          status: conversation.status,
          createdAt: conversation.createdAt,
          lastMessageAt: conversation.lastMessageAt
        },
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.created_at
        })),
        messageCount: {
          total: totalMessages,
          current: messages.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalMessages / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching conversation with messages:', error);
    next(error);
  }
};

// Delete conversation
const deleteConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findOne({
      where: { id: conversationId, userId }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Delete all messages first
    await Message.destroy({ where: { conversationId } });

    // Delete conversation
    await conversation.destroy();

    logger.info(`Conversation ${conversationId} deleted`);

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startConversation,
  continueConversation,
  getConversations,
  getConversationById,
  getConversationWithMessages,
  deleteConversation
};
