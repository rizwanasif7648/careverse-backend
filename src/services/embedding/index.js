/**
 * Embedding Service Exports
 * 
 * This module provides vector embedding functionality for conversation context management.
 * 
 * Usage:
 * const { embeddingService, summaryService, pineconeClient } = require('./services/embedding');
 */

const embeddingService = require('./embedding.service');
const summaryService = require('./summary.service');
const pineconeClient = require('./pineconeClient');

module.exports = {
  embeddingService,
  summaryService,
  pineconeClient
};
