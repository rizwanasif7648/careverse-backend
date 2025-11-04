const { Pinecone } = require('@pinecone-database/pinecone');
const logger = require('../../config/logger');

class PineconeClient {
  constructor() {
    this.client = null;
    this.index = null;
    this.indexName = process.env.PINECONE_INDEX_NAME || 'careverse-medical-knowledge';
    this.dimension = 1536; // OpenAI embedding dimension
  }

  /**
   * Initialize Pinecone client and connect to index
   */
  async initialize() {
    try {
      if (this.client) {
        return this.index;
      }

      // Initialize Pinecone client
      this.client = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY
      });

      logger.info('Pinecone client initialized successfully');

      // Connect to index
      this.index = this.client.index(this.indexName);
      logger.info(`Connected to Pinecone index: ${this.indexName}`);

      return this.index;
    } catch (error) {
      logger.error('Failed to initialize Pinecone:', error);
      throw new Error(`Pinecone initialization failed: ${error.message}`);
    }
  }

  /**
   * Create index if it doesn't exist
   */
  async createIndexIfNotExists() {
    try {
      const indexes = await this.client.listIndexes();
      const indexExists = indexes.indexes?.some(idx => idx.name === this.indexName);

      if (!indexExists) {
        logger.info(`Creating Pinecone index: ${this.indexName}`);
        
        await this.client.createIndex({
          name: this.indexName,
          dimension: this.dimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: process.env.PINECONE_ENVIRONMENT || 'us-east-1'
            }
          }
        });

        logger.info(`Pinecone index created: ${this.indexName}`);
        
        // Wait for index to be ready
        await this.waitForIndexReady();
      }

      return true;
    } catch (error) {
      logger.error('Error creating Pinecone index:', error);
      throw error;
    }
  }

  /**
   * Wait for index to be ready
   */
  async waitForIndexReady(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const description = await this.client.describeIndex(this.indexName);
        if (description.status?.ready) {
          logger.info('Pinecone index is ready');
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        logger.warn(`Waiting for index to be ready... attempt ${i + 1}/${maxAttempts}`);
      }
    }
    throw new Error('Pinecone index did not become ready in time');
  }

  /**
   * Upsert vectors to Pinecone
   * @param {Array} vectors - Array of vector objects with id, values, and metadata
   */
  async upsertVectors(vectors) {
    try {
      if (!this.index) {
        await this.initialize();
      }

      const response = await this.index.upsert(vectors);
      
      logger.info(`Upserted ${vectors.length} vectors to Pinecone`);
      return response;
    } catch (error) {
      logger.error('Error upserting vectors to Pinecone:', error);
      throw error;
    }
  }

  /**
   * Query similar vectors from Pinecone
   * @param {Array} queryVector - The query embedding vector
   * @param {Object} filter - Metadata filter
   * @param {Number} topK - Number of results to return
   */
  async querySimilarVectors(queryVector, filter = {}, topK = 5) {
    try {
      if (!this.index) {
        await this.initialize();
      }

      const queryRequest = {
        vector: queryVector,
        topK,
        includeMetadata: true,
        includeValues: false
      };

      if (Object.keys(filter).length > 0) {
        queryRequest.filter = filter;
      }

      const response = await this.index.query(queryRequest);
      
      logger.info(`Retrieved ${response.matches?.length || 0} similar vectors from Pinecone`);
      return response.matches || [];
    } catch (error) {
      logger.error('Error querying Pinecone:', error);
      throw error;
    }
  }

  /**
   * Delete vectors by IDs
   * @param {Array} ids - Array of vector IDs to delete
   */
  async deleteVectors(ids) {
    try {
      if (!this.index) {
        await this.initialize();
      }

      await this.index.deleteMany(ids);
      
      logger.info(`Deleted ${ids.length} vectors from Pinecone`);
      return true;
    } catch (error) {
      logger.error('Error deleting vectors from Pinecone:', error);
      throw error;
    }
  }

  /**
   * Delete all vectors for a conversation
   * @param {String} conversationId - Conversation UUID
   */
  async deleteConversationVectors(conversationId) {
    try {
      if (!this.index) {
        await this.initialize();
      }

      await this.index.deleteMany({
        filter: { conversationId }
      });
      
      logger.info(`Deleted all vectors for conversation: ${conversationId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting conversation vectors:', error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats() {
    try {
      if (!this.index) {
        await this.initialize();
      }

      const stats = await this.index.describeIndexStats();
      return stats;
    } catch (error) {
      logger.error('Error getting index stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new PineconeClient();
