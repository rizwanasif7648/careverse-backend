const { Conversation, Message } = require('../models');
const logger = require('../config/logger');

// Send message and get AI response
const sendMessage = async (req, res, next) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.user.id;

    let conversation;

    // Get or create conversation
    if (conversationId) {
      conversation = await Conversation.findOne({
        where: { id: conversationId, userId }
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }
    } else {
      // Create new conversation
      conversation = await Conversation.create({
        userId,
        title: message.substring(0, 50) + '...',
        lastMessageAt: new Date()
      });
    }

    // Save user message
    await Message.create({
      conversationId: conversation.id,
      role: 'user',
      content: message
    });

    // TODO: Call AI service to get response
    // For now, we'll send a placeholder response
    const aiResponse = "Thank you for your message. I'm the Careverse AI assistant. How can I help you with your health concerns today?";

    // Save AI message
    const assistantMessage = await Message.create({
      conversationId: conversation.id,
      role: 'assistant',
      content: aiResponse
    });

    // Update conversation
    await conversation.update({
      lastMessageAt: new Date()
    });

    logger.info(`Message sent in conversation ${conversation.id}`);

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation.id,
        message: assistantMessage,
        conversation
      }
    });
  } catch (error) {
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

// Get messages for a conversation
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;

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

    const offset = (page - 1) * limit;

    const { count, rows: messages } = await Message.findAndCountAll({
      where: { conversationId },
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: {
        messages,
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
  sendMessage,
  getConversations,
  getConversationById,
  getMessages,
  deleteConversation
};
