/**
 * Medical Analyzer Agent
 * Analyzes symptoms and diagnoses possible conditions using OpenAI function calling and RAG
 */

const OpenAI = require('openai');
const config = require('../../../config/config');
const logger = require('../../../config/logger');
const { logTokenUsage } = require('../../../utils/tokenCounter');
const pineconeService = require('../rag/pinecone.service');
const {
  diagnoseConditionFunction,
  createAnalysisMessages
} = require('../prompts/medicalAnalysis');

class MedicalAnalyzerAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
    this.model = config.openai.model || 'gpt-3.5-turbo';
    this.maxRetries = 2;
    this.pineconeService = pineconeService;
  }

  /**
   * Analyze symptoms and diagnose possible condition
   * @param {Object} symptomData - Extracted symptom data from SymptomExtractorAgent
   * @param {string} conversationId - Current conversation ID
   * @param {Array} messages - Original conversation messages
   * @returns {Promise<Object>} Condition diagnosis with confidence and specialty
   */
  async analyze(symptomData, conversationId, messages) {
    const startTime = Date.now();
    
    logger.info('MedicalAnalyzerAgent: Starting medical analysis', {
      symptomCount: symptomData.symptoms.length,
      urgency: symptomData.urgency,
      startTime: new Date(startTime).toISOString()
    });

    try {
      // Step 1: Retrieve similar past conversations for context (RAG)
      const ragStartTime = Date.now();
      const conversationHistory = await this.retrieveConversationHistory(
        conversationId,
        messages
      );
      const ragTime = Date.now() - ragStartTime;

      // Step 2: Diagnose condition using OpenAI function calling
      const diagnosisStartTime = Date.now();
      const diagnosis = await this.diagnoseWithRetry(
        symptomData,
        conversationHistory
      );
      const diagnosisTime = Date.now() - diagnosisStartTime;

      // Step 3: Add low confidence warning if needed
      if (diagnosis.confidence < 0.6) {
        diagnosis.lowConfidenceWarning = 
          'The confidence in this diagnosis is low. Please consult with a healthcare professional for an accurate diagnosis.';
      }

      const executionTime = Date.now() - startTime;

      logger.info('MedicalAnalyzerAgent: Medical analysis completed', {
        condition: diagnosis.name,
        confidence: diagnosis.confidence,
        specialty: diagnosis.requiredSpecialty,
        executionTimeMs: executionTime,
        ragTimeMs: ragTime,
        diagnosisTimeMs: diagnosisTime,
        tokensUsed: diagnosis.tokensUsed,
        usedConversationHistory: conversationHistory.length > 0
      });

      return diagnosis;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('MedicalAnalyzerAgent: Failed to analyze symptoms', {
        error: error.message,
        stack: error.stack,
        executionTimeMs: executionTime
      });
      throw error;
    }
  }

  /**
   * Retrieve similar past conversations from Pinecone
   * @param {string} conversationId - Current conversation ID
   * @param {Array} messages - Current conversation messages
   * @returns {Promise<Array>} Similar conversations for context
   */
  async retrieveConversationHistory(conversationId, messages) {
    try {
      // Check if Pinecone service is ready
      if (!this.pineconeService.isReady()) {
        logger.warn('MedicalAnalyzerAgent: Pinecone service not ready, proceeding without conversation history');
        return [];
      }

      logger.info('MedicalAnalyzerAgent: Querying Pinecone for similar conversations');

      const similarConversations = await this.pineconeService.searchSimilarConversations(
        conversationId,
        messages,
        3 // Top 3 results
      );

      logger.info('MedicalAnalyzerAgent: Retrieved conversation history', {
        count: similarConversations.length
      });

      return similarConversations;
    } catch (error) {
      // Handle Pinecone failures gracefully
      logger.warn('MedicalAnalyzerAgent: Failed to retrieve conversation history, continuing without context', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Diagnose condition with retry logic
   * @param {Object} symptomData - Extracted symptom data
   * @param {Array} conversationHistory - Similar past conversations
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Object>} Diagnosis result
   */
  async diagnoseWithRetry(symptomData, conversationHistory, attempt = 1) {
    try {
      const messages = createAnalysisMessages(
        symptomData.symptoms,
        symptomData.urgency,
        symptomData.redFlags,
        conversationHistory
      );

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        functions: [diagnoseConditionFunction],
        function_call: { name: 'diagnose_condition' },
        temperature: 0.3 // Lower temperature for more consistent diagnosis
      });

      // Parse function call response
      const functionCall = response.choices[0].message.function_call;
      
      if (!functionCall || functionCall.name !== 'diagnose_condition') {
        throw new Error('OpenAI did not return expected function call');
      }

      const diagnosis = JSON.parse(functionCall.arguments);

      // Validate diagnosis data
      this.validateDiagnosis(diagnosis);

      // Track token usage
      const tokensUsed = response.usage?.total_tokens || 0;
      
      // Log token usage
      logTokenUsage('MedicalAnalyzerAgent', response.usage);

      return {
        name: diagnosis.name,
        description: diagnosis.description,
        commonTriggers: diagnosis.commonTriggers || [],
        initialSelfCare: diagnosis.initialSelfCare || [],
        requiredSpecialty: diagnosis.requiredSpecialty,
        confidence: diagnosis.confidence,
        tokensUsed
      };
    } catch (error) {
      logger.warn('MedicalAnalyzerAgent: Diagnosis attempt failed', {
        attempt,
        error: error.message
      });

      // Retry logic
      if (attempt < this.maxRetries) {
        logger.info('MedicalAnalyzerAgent: Retrying diagnosis', {
          attempt: attempt + 1
        });
        
        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
        
        return this.diagnoseWithRetry(symptomData, conversationHistory, attempt + 1);
      }

      // Max retries reached
      throw new Error(`Failed to diagnose condition after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  /**
   * Validate diagnosis data structure
   * @param {Object} diagnosis - Diagnosis data to validate
   * @throws {Error} If diagnosis is invalid
   */
  validateDiagnosis(diagnosis) {
    if (!diagnosis.name || typeof diagnosis.name !== 'string') {
      throw new Error('Invalid diagnosis: name is required');
    }

    if (!diagnosis.description || typeof diagnosis.description !== 'string') {
      throw new Error('Invalid diagnosis: description is required');
    }

    if (!diagnosis.requiredSpecialty || typeof diagnosis.requiredSpecialty !== 'string') {
      throw new Error('Invalid diagnosis: requiredSpecialty is required');
    }

    if (typeof diagnosis.confidence !== 'number' || diagnosis.confidence < 0 || diagnosis.confidence > 1) {
      throw new Error('Invalid diagnosis: confidence must be a number between 0 and 1');
    }

    if (!Array.isArray(diagnosis.commonTriggers)) {
      throw new Error('Invalid diagnosis: commonTriggers must be an array');
    }

    if (!Array.isArray(diagnosis.initialSelfCare)) {
      throw new Error('Invalid diagnosis: initialSelfCare must be an array');
    }
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

module.exports = MedicalAnalyzerAgent;
