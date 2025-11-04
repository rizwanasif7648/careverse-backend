/**
 * Symptom Extractor Agent
 * Extracts structured symptom information from conversation messages using OpenAI function calling
 */

const OpenAI = require('openai');
const config = require('../../../config/config');
const logger = require('../../../config/logger');
const { logTokenUsage } = require('../../../utils/tokenCounter');
const {
  extractSymptomsFunction,
  formatMessagesForExtraction
} = require('../prompts/symptomExtraction');

class SymptomExtractorAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
    this.model = config.openai.model || 'gpt-3.5-turbo';
    this.maxRetries = 2;
  }

  /**
   * Analyze conversation messages and extract structured symptom data
   * @param {Array} messages - Array of conversation messages
   * @returns {Promise<Object>} Extracted symptom data with urgency and red flags
   */
  async analyze(messages) {
    const startTime = Date.now();
    
    logger.info('SymptomExtractorAgent: Starting symptom extraction', {
      messageCount: messages.length,
      startTime: new Date(startTime).toISOString()
    });

    try {
      const result = await this.extractSymptomsWithRetry(messages);
      
      const executionTime = Date.now() - startTime;
      
      logger.info('SymptomExtractorAgent: Symptom extraction completed', {
        symptomCount: result.symptoms.length,
        urgency: result.urgency,
        redFlagCount: result.redFlags.length,
        executionTimeMs: executionTime,
        tokensUsed: result.tokensUsed
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('SymptomExtractorAgent: Failed to extract symptoms', {
        error: error.message,
        stack: error.stack,
        executionTimeMs: executionTime
      });
      throw error;
    }
  }

  /**
   * Extract symptoms with retry logic
   * @param {Array} messages - Array of conversation messages
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Object>} Extracted symptom data
   */
  async extractSymptomsWithRetry(messages, attempt = 1) {
    try {
      const formattedMessages = formatMessagesForExtraction(messages);

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: formattedMessages,
        functions: [extractSymptomsFunction],
        function_call: { name: 'extract_symptoms' },
        temperature: 0.3 // Lower temperature for more consistent extraction
      });

      // Parse function call response
      const functionCall = response.choices[0].message.function_call;
      
      if (!functionCall || functionCall.name !== 'extract_symptoms') {
        throw new Error('OpenAI did not return expected function call');
      }

      const extractedData = JSON.parse(functionCall.arguments);

      // Validate extracted data
      this.validateExtractedData(extractedData);

      // Track token usage
      const tokensUsed = response.usage?.total_tokens || 0;
      
      // Log token usage
      logTokenUsage('SymptomExtractorAgent', response.usage);

      return {
        symptoms: extractedData.symptoms || [],
        urgency: extractedData.urgency || 'routine',
        redFlags: extractedData.redFlags || [],
        tokensUsed
      };
    } catch (error) {
      logger.warn('SymptomExtractorAgent: Extraction attempt failed', {
        attempt,
        error: error.message
      });

      // Retry logic
      if (attempt < this.maxRetries) {
        logger.info('SymptomExtractorAgent: Retrying extraction', {
          attempt: attempt + 1
        });
        
        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
        
        return this.extractSymptomsWithRetry(messages, attempt + 1);
      }

      // Max retries reached
      throw new Error(`Failed to extract symptoms after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  /**
   * Validate extracted data structure
   * @param {Object} data - Extracted data to validate
   * @throws {Error} If data is invalid
   */
  validateExtractedData(data) {
    if (!data.symptoms || !Array.isArray(data.symptoms)) {
      throw new Error('Invalid extracted data: symptoms must be an array');
    }

    if (!data.urgency || !['routine', 'urgent', 'emergency'].includes(data.urgency)) {
      throw new Error('Invalid extracted data: urgency must be routine, urgent, or emergency');
    }

    if (!data.redFlags || !Array.isArray(data.redFlags)) {
      throw new Error('Invalid extracted data: redFlags must be an array');
    }

    // Validate each symptom
    data.symptoms.forEach((symptom, index) => {
      if (!symptom.name || typeof symptom.name !== 'string') {
        throw new Error(`Invalid symptom at index ${index}: name is required`);
      }

      if (!symptom.severity || !['mild', 'moderate', 'severe'].includes(symptom.severity)) {
        throw new Error(`Invalid symptom at index ${index}: severity must be mild, moderate, or severe`);
      }
    });
  }

  /**
   * Sleep utility for retry backoff
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SymptomExtractorAgent;
