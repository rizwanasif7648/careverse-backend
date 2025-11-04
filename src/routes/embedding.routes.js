const express = require('express');
const router = express.Router();
const { embeddingService, summaryService, pineconeClient } = require('../services/embedding');
const { Message, Conversation, Embedding } = require('../models');
const logger = require('../config/logger');

/**
 * @route   POST /api/v1/embeddings/generate
 * @desc    Manually trigger embedding generation for a conversation
 * @access  Public (should be protected in production)
 */
router.post('/generate', async (req, res) => {
  try {
    const { userId, conversationId } = req.body;

    if (!userId || !conversationId) {
      return res.status(400).json({
        success: false,
        error: 'userId and conversationId are required'
      });
    }

    // Check if conversation exists
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Generate embedding
    const embedding = await embeddingService.generateAndStoreEmbedding(userId, conversationId);

    res.status(201).json({
      success: true,
      message: 'Embedding generated successfully',
      data: {
        id: embedding.id,
        conversationId: embedding.conversationId,
        pineconeVectorId: embedding.pineconeVectorId,
        messageCount: embedding.messageCount,
        summary: embedding.summary,
        metadata: embedding.metadata,
        createdAt: embedding.createdAt
      }
    });
  } catch (error) {
    logger.error('Error generating embedding:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/embeddings/check
 * @desc    Check if embedding generation is needed and generate if threshold reached
 * @access  Public (should be protected in production)
 */
router.post('/check', async (req, res) => {
  try {
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'conversationId is required'
      });
    }

    const embedding = await embeddingService.checkAndGenerateEmbedding(conversationId);

    if (embedding) {
      res.status(201).json({
        success: true,
        message: 'Embedding generated (threshold reached)',
        data: {
          id: embedding.id,
          conversationId: embedding.conversationId,
          messageCount: embedding.messageCount,
          summary: embedding.summary.substring(0, 200) + '...'
        }
      });
    } else {
      res.status(200).json({
        success: true,
        message: 'No embedding needed yet (threshold not reached)',
        data: null
      });
    }
  } catch (error) {
    logger.error('Error checking embedding:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/embeddings/context/:conversationId
 * @desc    Get conversation context (messages or embeddings based on length)
 * @access  Public (should be protected in production)
 */
router.get('/context/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { query, maxMessages = 10 } = req.query;

    const context = await embeddingService.getConversationContext(
      conversationId,
      query,
      parseInt(maxMessages)
    );

    res.status(200).json({
      success: true,
      data: {
        source: context.source,
        messageCount: context.messageCount,
        messages: context.messages,
        embeddings: context.embeddings,
        description: context.source === 'database' 
          ? 'Using full database context (< 50 messages)'
          : 'Using recent messages + vector search (≥ 50 messages)'
      }
    });
  } catch (error) {
    logger.error('Error getting context:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/embeddings/conversation/:conversationId
 * @desc    Get all embeddings for a conversation
 * @access  Public (should be protected in production)
 */
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;

    const embeddings = await Embedding.findAll({
      where: { conversationId },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        count: embeddings.length,
        embeddings: embeddings.map(e => ({
          id: e.id,
          pineconeVectorId: e.pineconeVectorId,
          summary: e.summary,
          messageCount: e.messageCount,
          metadata: e.metadata,
          createdAt: e.createdAt
        }))
      }
    });
  } catch (error) {
    logger.error('Error getting embeddings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/embeddings/user/:userId/stats
 * @desc    Get embedding statistics for a user
 * @access  Public (should be protected in production)
 */
router.get('/user/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await embeddingService.getUserEmbeddingStats(userId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/embeddings/summarize
 * @desc    Generate summary for a conversation
 * @access  Public (should be protected in production)
 */
router.post('/summarize', async (req, res) => {
  try {
    const { conversationId, limit = 50 } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'conversationId is required'
      });
    }

    const messages = await Message.findAll({
      where: { conversationId },
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit)
    });

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No messages found for this conversation'
      });
    }

    const summary = await summaryService.summarizeConversation(messages);
    const keyTerms = await summaryService.extractKeyTerms(messages);
    const severity = await summaryService.assessSeverity(messages);

    res.status(200).json({
      success: true,
      data: {
        summary,
        keyTerms,
        severity,
        messageCount: messages.length
      }
    });
  } catch (error) {
    logger.error('Error summarizing conversation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/embeddings/search
 * @desc    Search for similar conversations using vector search
 * @access  Public (should be protected in production)
 */
router.post('/search', async (req, res) => {
  try {
    const { query, userId, topK = 5 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'query is required'
      });
    }

    // Generate embedding for query
    const queryVector = await embeddingService.embeddings.embedQuery(query);

    // Build filter
    const filter = {};
    if (userId) {
      filter.userId = userId;
    }

    // Search Pinecone
    const results = await pineconeClient.querySimilarVectors(
      queryVector,
      filter,
      parseInt(topK)
    );

    res.status(200).json({
      success: true,
      data: {
        query,
        resultsCount: results.length,
        results: results.map(r => ({
          score: r.score,
          conversationId: r.metadata?.conversationId,
          userId: r.metadata?.userId,
          summary: r.metadata?.summary,
          keyTerms: r.metadata?.keyTerms,
          severity: r.metadata?.severity,
          messageCount: r.metadata?.messageCount,
          timestamp: r.metadata?.timestamp
        }))
      }
    });
  } catch (error) {
    logger.error('Error searching embeddings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/v1/embeddings/conversation/:conversationId
 * @desc    Delete all embeddings for a conversation
 * @access  Public (should be protected in production)
 */
router.delete('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;

    await embeddingService.deleteConversationEmbeddings(conversationId);

    res.status(200).json({
      success: true,
      message: 'Embeddings deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting embeddings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/embeddings/pinecone/stats
 * @desc    Get Pinecone index statistics
 * @access  Public (should be protected in production)
 */
router.get('/pinecone/stats', async (req, res) => {
  try {
    const stats = await pineconeClient.getIndexStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting Pinecone stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/embeddings/initialize
 * @desc    Initialize embedding services and Pinecone
 * @access  Public (should be protected in production)
 */
router.post('/initialize', async (req, res) => {
  try {
    await embeddingService.initialize();

    res.status(200).json({
      success: true,
      message: 'Embedding services initialized successfully'
    });
  } catch (error) {
    logger.error('Error initializing services:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
