/**
 * Token Counter Utility
 * Provides token counting and estimation for OpenAI API calls
 */

const logger = require('../config/logger');

/**
 * Estimate token count for text
 * Uses a simple approximation: ~4 characters per token for English text
 * This is a rough estimate - actual token count may vary
 * 
 * @param {string} text - Text to estimate tokens for
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  
  // Simple estimation: ~4 characters per token
  // This is conservative and works reasonably well for English text
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for an array of messages
 * @param {Array} messages - Array of message objects with role and content
 * @returns {number} Estimated total token count
 */
function estimateMessagesTokens(messages) {
  if (!Array.isArray(messages)) {
    return 0;
  }
  
  let totalTokens = 0;
  
  // Add tokens for each message
  messages.forEach(message => {
    // Role tokens (~1 token per role)
    totalTokens += 1;
    
    // Content tokens
    if (message.content) {
      totalTokens += estimateTokens(message.content);
    }
    
    // Message formatting overhead (~4 tokens per message)
    totalTokens += 4;
  });
  
  // Add base overhead for the request (~3 tokens)
  totalTokens += 3;
  
  return totalTokens;
}

/**
 * Estimate tokens for function calling
 * @param {Array} functions - Array of function definitions
 * @returns {number} Estimated token count for functions
 */
function estimateFunctionTokens(functions) {
  if (!Array.isArray(functions)) {
    return 0;
  }
  
  let totalTokens = 0;
  
  functions.forEach(func => {
    // Function name and description
    totalTokens += estimateTokens(func.name || '');
    totalTokens += estimateTokens(func.description || '');
    
    // Parameters (rough estimate based on JSON stringification)
    if (func.parameters) {
      const paramsStr = JSON.stringify(func.parameters);
      totalTokens += estimateTokens(paramsStr);
    }
    
    // Overhead per function (~10 tokens)
    totalTokens += 10;
  });
  
  return totalTokens;
}

/**
 * Estimate total tokens for a complete API request
 * @param {Object} options - Request options
 * @param {Array} options.messages - Messages array
 * @param {Array} options.functions - Functions array (optional)
 * @param {number} options.maxTokens - Max tokens for response (optional)
 * @returns {Object} Token estimates
 */
function estimateRequestTokens(options) {
  const { messages = [], functions = [], maxTokens = 500 } = options;
  
  const inputTokens = estimateMessagesTokens(messages) + estimateFunctionTokens(functions);
  const outputTokens = maxTokens; // Estimated max output
  const totalTokens = inputTokens + outputTokens;
  
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost: calculateCost(totalTokens, 'gpt-3.5-turbo')
  };
}

/**
 * Calculate estimated cost for token usage
 * @param {number} tokens - Total token count
 * @param {string} model - Model name
 * @returns {number} Estimated cost in USD
 */
function calculateCost(tokens, model = 'gpt-3.5-turbo') {
  // Pricing as of 2024 (approximate)
  const pricing = {
    'gpt-3.5-turbo': {
      input: 0.0005 / 1000,  // $0.0005 per 1K input tokens
      output: 0.0015 / 1000  // $0.0015 per 1K output tokens
    },
    'gpt-4': {
      input: 0.03 / 1000,    // $0.03 per 1K input tokens
      output: 0.06 / 1000    // $0.06 per 1K output tokens
    }
  };
  
  const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
  
  // Assume 70% input, 30% output split
  const inputTokens = tokens * 0.7;
  const outputTokens = tokens * 0.3;
  
  const cost = (inputTokens * modelPricing.input) + (outputTokens * modelPricing.output);
  
  return parseFloat(cost.toFixed(6));
}

/**
 * Truncate messages to fit within token limit
 * @param {Array} messages - Array of messages
 * @param {number} maxTokens - Maximum token limit
 * @returns {Array} Truncated messages array
 */
function truncateMessages(messages, maxTokens = 3000) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return messages;
  }
  
  // Always keep system message if present
  const systemMessage = messages.find(m => m.role === 'system');
  const otherMessages = messages.filter(m => m.role !== 'system');
  
  let truncated = systemMessage ? [systemMessage] : [];
  let currentTokens = systemMessage ? estimateMessagesTokens([systemMessage]) : 0;
  
  // Add messages from most recent backwards until we hit the limit
  for (let i = otherMessages.length - 1; i >= 0; i--) {
    const message = otherMessages[i];
    const messageTokens = estimateMessagesTokens([message]);
    
    if (currentTokens + messageTokens <= maxTokens) {
      truncated.unshift(message);
      currentTokens += messageTokens;
    } else {
      // Stop adding messages
      break;
    }
  }
  
  // If we had a system message, move it back to the front
  if (systemMessage) {
    truncated = [systemMessage, ...truncated.filter(m => m.role !== 'system')];
  }
  
  const removedCount = messages.length - truncated.length;
  if (removedCount > 0) {
    logger.info('TokenCounter: Truncated messages to fit token limit', {
      originalCount: messages.length,
      truncatedCount: truncated.length,
      removedCount,
      maxTokens,
      estimatedTokens: currentTokens
    });
  }
  
  return truncated;
}

/**
 * Log token usage statistics
 * @param {string} operation - Operation name
 * @param {Object} usage - Token usage object from OpenAI response
 */
function logTokenUsage(operation, usage) {
  if (!usage) {
    return;
  }
  
  const cost = calculateCost(usage.total_tokens || 0);
  
  logger.info(`TokenCounter: ${operation}`, {
    promptTokens: usage.prompt_tokens || 0,
    completionTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    estimatedCost: `$${cost.toFixed(6)}`
  });
}

/**
 * Get token usage summary for multiple operations
 * @param {Array} operations - Array of operation token usages
 * @returns {Object} Summary statistics
 */
function getTokenSummary(operations) {
  const summary = {
    totalOperations: operations.length,
    totalTokens: 0,
    totalCost: 0,
    byOperation: {}
  };
  
  operations.forEach(op => {
    const tokens = op.tokensUsed || 0;
    const cost = calculateCost(tokens);
    
    summary.totalTokens += tokens;
    summary.totalCost += cost;
    
    if (!summary.byOperation[op.name]) {
      summary.byOperation[op.name] = {
        count: 0,
        tokens: 0,
        cost: 0
      };
    }
    
    summary.byOperation[op.name].count++;
    summary.byOperation[op.name].tokens += tokens;
    summary.byOperation[op.name].cost += cost;
  });
  
  return summary;
}

module.exports = {
  estimateTokens,
  estimateMessagesTokens,
  estimateFunctionTokens,
  estimateRequestTokens,
  calculateCost,
  truncateMessages,
  logTokenUsage,
  getTokenSummary
};
