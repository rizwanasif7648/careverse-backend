const { OpenAIEmbeddings } = require('@langchain/openai');
const { v4: uuidv4 } = require('uuid');
const pineconeClient = require('./pineconeClient');
const summaryService = require('./summary.service');
const Embedding = require('../../models/Embedding');
const Message = require('../../models/Message');
const Conversation = require('../../models/Conversation');
const logger = require('../../config/logger');

class EmbeddingService {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002'
    });
    this.messageThreshold = 50; // Trigger embedding after 50 messages
  }

  /**
   * Initialize the service and Pinecone
   */
  async initialize() {
    try {
      await pineconeClient.initialize();
      logger.info('Embedding service initialized');
    } catch (error) {
      logger.error('Failed to initialize embedding service:', error);
      throw error;
    }
  }

  /**
   * Check if conversation needs embedding and generate if needed
   * @param {String} conversationId - Conversation UUID
   * @returns {Object|null} - Embedding metadata or null if not needed
   */
  async checkAndGenerateEmbedding(conversationId) {
    try {
      // Get message count for conversation
      const messageCount = await Message.count({
        where: { conversationId }
      });

      // Get existing embeddings count
      const embeddingCount = await Embedding.count({
        where: { conversationId }
      });

      // Calculate messages processed
      const messagesProcessed = embeddingCount * this.messageThreshold;
      const unprocessedMessages = messageCount - messagesProcessed;

      // Check if we need to generate new embedding
      if (unprocessedMessages >= this.messageThreshold) {
        logger.info(`Conversation ${conversationId} has ${unprocessedMessages} unprocessed messages. Generating embedding...`);
        
        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
          throw new Error('Conversation not found');
        }

        return await this.generateAndStoreEmbedding(conversation.userId, conversationId);
      }

      return null;
    } catch (error) {
      logger.error('Error checking embedding requirement:', error);
      throw error;
    }
  }

  /**
   * Generate and store embedding for a conversation
   * @param {String} userId - User UUID
   * @param {String} conversationId - Conversation UUID
   * @returns {Object} - Created embedding metadata
   */
  async generateAndStoreEmbedding(userId, conversationId) {
    try {
      // Get existing embeddings to determine which messages to process
      const existingEmbeddings = await Embedding.findAll({
        where: { conversationId },
        order: [['createdAt', 'DESC']],
        limit: 1
      });

      // Determine starting point for messages
      let messageQuery = {
        where: { conversationId },
        order: [['createdAt', 'ASC']]
      };

      if (existingEmbeddings.length > 0) {
        const lastEmbedding = existingEmbeddings[0];
        // Get messages after the last processed message
        messageQuery.where.createdAt = {
          [require('sequelize').Op.gt]: lastEmbedding.createdAt
        };
      }

      // Fetch messages
      const messages = await Message.findAll(messageQuery);

      if (messages.length < this.messageThreshold) {
        logger.info(`Not enough messages to process. Found ${messages.length}, need ${this.messageThreshold}`);
        return null;
      }

      // Take only the threshold amount of messages
      const messagesToProcess = messages.slice(0, this.messageThreshold);

      // Generate summary
      logger.info(`Generating summary for ${messagesToProcess.length} messages`);
      const summary = await summaryService.summarizeConversation(messagesToProcess);

      // Extract additional metadata
      const keyTerms = await summaryService.extractKeyTerms(messagesToProcess);
      const severity = await summaryService.assessSeverity(messagesToProcess);

      // Generate embedding from summary
      logger.info('Generating embedding vector from summary');
      const embeddingVector = await this.embeddings.embedQuery(summary);

      // Create unique vector ID
      const vectorId = `${conversationId}-${uuidv4()}`;

      // Prepare metadata for Pinecone
      const metadata = {
        userId,
        conversationId,
        summary: summary.substring(0, 500), // Pinecone metadata size limit
        messageCount: messagesToProcess.length,
        keyTerms: keyTerms.join(', '),
        severity,
        timestamp: new Date().toISOString()
      };

      // Upsert to Pinecone
      logger.info('Storing embedding in Pinecone');
      await pineconeClient.upsertVectors([
        {
          id: vectorId,
          values: embeddingVector,
          metadata
        }
      ]);

      // Store metadata in PostgreSQL
      const embeddingRecord = await Embedding.create({
        userId,
        conversationId,
        pineconeVectorId: vectorId,
        summary,
        messageCount: messagesToProcess.length,
        startMessageId: messagesToProcess[0].id,
        endMessageId: messagesToProcess[messagesToProcess.length - 1].id,
        metadata: {
          keyTerms,
          severity,
          modelVersion: 'text-embedding-ada-002',
          vectorDimension: embeddingVector.length
        }
      });

      logger.info(`Successfully created embedding ${embeddingRecord.id} for conversation ${conversationId}`);

      return embeddingRecord;
    } catch (error) {
      logger.error('Error generating and storing embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Retrieve relevant context for a conversation
   * @param {String} conversationId - Conversation UUID
   * @param {String} currentQuery - Current user query
   * @param {Number} maxMessages - Maximum messages to return
   * @returns {Object} - Context object with messages and embeddings
   */
  async getConversationContext(conversationId, currentQuery = null, maxMessages = 10) {
    try {
      const messageCount = await Message.count({
        where: { conversationId }
      });

      // If less than threshold, return all messages from DB
      if (messageCount < this.messageThreshold) {
        logger.info(`Conversation has ${messageCount} messages. Using full DB context.`);
        
        const messages = await Message.findAll({
          where: { conversationId },
          order: [['createdAt', 'ASC']],
          limit: maxMessages
        });

        return {
          source: 'database',
          messageCount: messages.length,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            createdAt: m.createdAt
          })),
          embeddings: []
        };
      }

      // If >= threshold, use vector search for relevant context
      logger.info(`Conversation has ${messageCount} messages. Using vector search for context.`);

      // Get recent messages (last 10)
      const recentMessages = await Message.findAll({
        where: { conversationId },
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      // If we have a current query, search for relevant historical context
      let relevantEmbeddings = [];
      if (currentQuery) {
        // Generate embedding for current query
        const queryVector = await this.embeddings.embedQuery(currentQuery);

        // Search Pinecone for similar conversations
        const conversation = await Conversation.findByPk(conversationId);
        relevantEmbeddings = await pineconeClient.querySimilarVectors(
          queryVector,
          { conversationId },
          5
        );

        logger.info(`Found ${relevantEmbeddings.length} relevant embedding segments`);
      }

      return {
        source: 'vector_search',
        messageCount: recentMessages.length,
        messages: recentMessages.reverse().map(m => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt
        })),
        embeddings: relevantEmbeddings.map(e => ({
          summary: e.metadata?.summary,
          score: e.score,
          keyTerms: e.metadata?.keyTerms,
          severity: e.metadata?.severity
        }))
      };
    } catch (error) {
      logger.error('Error retrieving conversation context:', error);
      throw error;
    }
  }

  /**
   * Delete all embeddings for a conversation
   * @param {String} conversationId - Conversation UUID
   */
  async deleteConversationEmbeddings(conversationId) {
    try {
      // Get all embedding records
      const embeddings = await Embedding.findAll({
        where: { conversationId }
      });

      if (embeddings.length === 0) {
        logger.info(`No embeddings found for conversation ${conversationId}`);
        return;
      }

      // Delete from Pinecone
      const vectorIds = embeddings.map(e => e.pineconeVectorId);
      await pineconeClient.deleteVectors(vectorIds);

      // Delete from PostgreSQL
      await Embedding.destroy({
        where: { conversationId }
      });

      logger.info(`Deleted ${embeddings.length} embeddings for conversation ${conversationId}`);
    } catch (error) {
      logger.error('Error deleting conversation embeddings:', error);
      throw error;
    }
  }

  /**
   * Get embedding statistics for a user
   * @param {String} userId - User UUID
   * @returns {Object} - Statistics object
   */
  async getUserEmbeddingStats(userId) {
    try {
      const totalEmbeddings = await Embedding.count({
        where: { userId }
      });

      const conversations = await Embedding.findAll({
        where: { userId },
        attributes: ['conversationId'],
        group: ['conversationId']
      });

      const totalMessagesEmbedded = await Embedding.sum('messageCount', {
        where: { userId }
      });

      return {
        totalEmbeddings,
        conversationsWithEmbeddings: conversations.length,
        totalMessagesEmbedded: totalMessagesEmbedded || 0
      };
    } catch (error) {
      logger.error('Error getting user embedding stats:', error);
      throw error;
    }
  }
}

module.exports = new EmbeddingService();
