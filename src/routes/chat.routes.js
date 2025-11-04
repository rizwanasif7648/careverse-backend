const express = require('express');
const router = express.Router();
const { Message, Conversation, User } = require('../models');
const { embeddingService } = require('../services/embedding');
const logger = require('../config/logger');

/**
 * @route   POST /api/v1/chat
 * @desc    Send a message and get AI response
 * @access  Public (should be protected in production)
 */
router.post('/', async (req, res) => {
  try {
    const { userId, conversationId, message } = req.body;

    // Validation
    if (!userId || !conversationId || !message) {
      return res.status(400).json({
        success: false,
        error: 'userId, conversationId, and message are required'
      });
    }

    // Verify conversation exists
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // 1. Save user message
    const userMessage = await Message.create({
      conversationId,
      role: 'user',
      content: message
    });

    // 2. Check and generate embedding if needed (automatic after 50 messages)
    // This happens in the background and doesn't block the response
    embeddingService.checkAndGenerateEmbedding(conversationId)
      .then(embedding => {
        if (embedding) {
          logger.info(`Embedding generated for conversation ${conversationId}`);
        }
      })
      .catch(error => {
        logger.error('Error generating embedding:', error);
        // Don't fail the request if embedding fails
      });

    // 3. Get conversation context (smart: DB or vector search)
    const context = await embeddingService.getConversationContext(
      conversationId,
      message,
      10 // Last 10 messages
    );

    // 4. Build context for AI
    let contextText = '';
    
    // Include relevant embeddings if available
    if (context.embeddings && context.embeddings.length > 0) {
      contextText += 'Previous conversation summaries:\n';
      context.embeddings.forEach(emb => {
        contextText += `- ${emb.summary}\n`;
      });
      contextText += '\n';
    }

    // Include recent messages
    contextText += 'Recent conversation:\n';
    context.messages.forEach(msg => {
      contextText += `${msg.role}: ${msg.content}\n`;
    });

    // 5. Generate AI response (placeholder - implement with your AI service)
    const aiResponse = await generateAIResponse(message, contextText);

    // 6. Save AI response
    const assistantMessage = await Message.create({
      conversationId,
      role: 'assistant',
      content: aiResponse,
      metadata: {
        contextSource: context.source,
        embeddingsUsed: context.embeddings?.length || 0
      }
    });

    // 7. Update conversation
    await conversation.update({
      lastMessageAt: new Date()
    });

    // Return response
    res.status(200).json({
      success: true,
      data: {
        userMessage: {
          id: userMessage.id,
          content: userMessage.content,
          createdAt: userMessage.createdAt
        },
        assistantMessage: {
          id: assistantMessage.id,
          content: assistantMessage.content,
          createdAt: assistantMessage.createdAt
        },
        context: {
          source: context.source,
          embeddingsUsed: context.embeddings?.length || 0
        }
      }
    });

  } catch (error) {
    logger.error('Error in chat handler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/chat/:conversationId
 * @desc    Get conversation messages
 * @access  Public (should be protected in production)
 */
router.get('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50 } = req.query;

    const messages = await Message.findAll({
      where: { conversationId },
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      data: {
        conversationId,
        messageCount: messages.length,
        messages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt
        }))
      }
    });

  } catch (error) {
    logger.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Placeholder AI response generator
 * Replace this with your actual AI service (OpenAI, etc.)
 */
async function generateAIResponse(userMessage, context) {
  // TODO: Implement actual AI integration
  // For now, return a placeholder response
  
  return `I understand you said: "${userMessage}". This is a placeholder response. 
  
Please implement the actual AI integration here using OpenAI or your preferred AI service.

Context available: ${context.split('\n').length} lines of conversation history.`;
}

module.exports = router;
