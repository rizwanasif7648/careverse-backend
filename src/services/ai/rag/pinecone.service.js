// Pinecone Conversation History Service
// Handles conversation embeddings and similarity search for RAG

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const logger = require('../../../config/logger');
const config = require('../../../config/config');

class PineconeService {
  constructor() {
    this.pinecone = null;
    this.index = null;
    this.embeddings = null;
    this.initialized = false;
  }

  /**
   * Initialize Pinecone client and index
   */
  async initialize() {
    try {
      if (!config.pinecone.apiKey) {
        logger.warn('Pinecone API key not configured. Conversation history RAG disabled.');
        return;
      }

      logger.info('Initializing Pinecone service for conversation history');

      // Initialize Pinecone client
      this.pinecone = new Pinecone({
        apiKey: config.pinecone.apiKey
      });

      // Get index reference
      this.index = this.pinecone.Index(config.pinecone.indexName);

      // Initialize OpenAI embeddings
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: config.openai.apiKey,
        modelName: 'text-embedding-ada-002'
      });

      this.initialized = true;
      logger.info('Pinecone service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Pinecone service:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for conversation text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async generateEmbedding(text) {
    try {
      if (!this.initialized) {
        throw new Error('Pinecone service not initialized');
      }

      const embedding = await this.embeddings.embedQuery(text);
      return embedding;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Index a conversation for similarity search
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {Array} messages - Conversation messages
   * @returns {Promise<void>}
   */
  async indexConversation(conversationId, userId, messages) {
    try {
      if (!this.initialized) {
        logger.warn('Pinecone service not initialized. Skipping conversation indexing.');
        return;
      }

      // Concatenate all messages into a single text for embedding
      const conversationText = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      // Generate embedding
      const embedding = await this.generateEmbedding(conversationText);

      // Prepare metadata
      const metadata = {
        conversationId,
        userId,
        timestamp: new Date().toISOString(),
        messageCount: messages.length
      };

      // Upsert to Pinecone
      await this.index.upsert([
        {
          id: conversationId,
          values: embedding,
          metadata
        }
      ]);

      logger.info(`Indexed conversation ${conversationId} for user ${userId}`);
    } catch (error) {
      logger.error('Error indexing conversation:', error);
      // Don't throw - this is a non-critical operation
      logger.warn('Continuing without conversation indexing');
    }
  }

  /**
   * Search for similar past conversations
   * @param {string} currentConversationId - Current conversation ID to exclude from results
   * @param {Array} currentMessages - Current conversation messages
   * @param {number} topK - Number of similar conversations to return (default: 3)
   * @returns {Promise<Array>} Similar conversations with metadata
   */
  async searchSimilarConversations(currentConversationId, currentMessages, topK = 3) {
    try {
      if (!this.initialized) {
        logger.warn('Pinecone service not initialized. Returning empty results.');
        return [];
      }

      // Concatenate current messages for embedding
      const conversationText = currentMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      // Generate embedding for current conversation
      const embedding = await this.generateEmbedding(conversationText);

      // Query Pinecone for similar conversations
      const queryResponse = await this.index.query({
        vector: embedding,
        topK: topK + 1, // Get one extra to filter out current conversation
        includeMetadata: true
      });

      // Filter out the current conversation and limit to topK
      const similarConversations = queryResponse.matches
        .filter(match => match.id !== currentConversationId)
        .slice(0, topK)
        .map(match => ({
          conversationId: match.id,
          score: match.score,
          metadata: match.metadata
        }));

      logger.info(`Found ${similarConversations.length} similar conversations`);
      return similarConversations;
    } catch (error) {
      logger.error('Error searching similar conversations:', error);
      // Return empty array on error - this is a non-critical operation
      logger.warn('Continuing without conversation history context');
      return [];
    }
  }

  /**
   * Delete a conversation from the index
   * @param {string} conversationId - Conversation ID to delete
   * @returns {Promise<void>}
   */
  async deleteConversation(conversationId) {
    try {
      if (!this.initialized) {
        logger.warn('Pinecone service not initialized. Skipping deletion.');
        return;
      }

      await this.index.deleteOne(conversationId);
      logger.info(`Deleted conversation ${conversationId} from index`);
    } catch (error) {
      logger.error('Error deleting conversation:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Check if service is initialized and ready
   * @returns {boolean}
   */
  isReady() {
    return this.initialized;
  }
}

// Export singleton instance
module.exports = new PineconeService();
