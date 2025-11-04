/**
 * Next Steps Generator Agent
 * Generates actionable next steps for patients based on their complete assessment
 */

const OpenAI = require('openai');
const config = require('../../../config/config');
const logger = require('../../../config/logger');
const { logTokenUsage } = require('../../../utils/tokenCounter');
const {
  generateNextStepsFunction,
  createNextStepsMessages,
  enrichNextStepsWithUrls,
  validateNextSteps
} = require('../prompts/nextStepsGeneration');

class NextStepsGeneratorAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
    this.model = config.openai.model || 'gpt-3.5-turbo';
    this.maxRetries = 2;
  }

  /**
   * Generate actionable next steps based on complete assessment state
   * @param {Object} state - Complete assessment state with all agent outputs
   * @returns {Promise<Object>} Generated next steps with URLs
   */
  async generate(state) {
    const startTime = Date.now();
    
    logger.info('NextStepsGeneratorAgent: Starting next steps generation', {
      condition: state.condition?.name,
      urgency: state.urgency,
      hasProviders: state.providers?.length > 0,
      hasProducts: state.products?.length > 0,
      startTime: new Date(startTime).toISOString()
    });

    try {
      // Step 1: Generate next steps using OpenAI function calling
      const generationStartTime = Date.now();
      const nextSteps = await this.generateWithRetry(state);
      const generationTime = Date.now() - generationStartTime;

      // Step 2: Check if emergency care should be prioritized
      const shouldPrioritizeEmergency = state.urgency === 'emergency' || 
                                        (state.redFlags && state.redFlags.length > 0);
      
      let processedSteps = nextSteps;
      
      // If emergency, ensure emergency step is first
      if (shouldPrioritizeEmergency) {
        const hasEmergencyStep = nextSteps.some(step => step.actionType === 'emergency');
        
        if (!hasEmergencyStep) {
          // Add emergency step at the beginning
          const emergencyStep = {
            title: 'Seek Emergency Care Immediately',
            description: 'Your symptoms may indicate a serious condition requiring immediate medical attention. Call 911 or go to the nearest emergency room.',
            icon: 'emergency',
            actionType: 'emergency',
            priority: 1,
            urgent: true
          };
          processedSteps = [emergencyStep, ...nextSteps];
        } else {
          // Move emergency step to first position
          const emergencyIndex = nextSteps.findIndex(step => step.actionType === 'emergency');
          const emergencyStep = nextSteps[emergencyIndex];
          processedSteps = [
            emergencyStep,
            ...nextSteps.slice(0, emergencyIndex),
            ...nextSteps.slice(emergencyIndex + 1)
          ];
        }
      }

      // Step 3: Enrich with URLs based on action type
      const enrichStartTime = Date.now();
      const enrichedSteps = enrichNextStepsWithUrls(processedSteps, {
        requiredSpecialty: state.condition?.requiredSpecialty,
        conditionName: state.condition?.name
      });
      const enrichTime = Date.now() - enrichStartTime;

      // Step 4: Validate and limit to 3-5 steps
      const validatedSteps = validateNextSteps(enrichedSteps);

      const executionTime = Date.now() - startTime;

      logger.info('NextStepsGeneratorAgent: Next steps generation completed', {
        stepCount: validatedSteps.length,
        executionTimeMs: executionTime,
        tokensUsed: state.tokensUsed || 0,
        performance: {
          generationMs: generationTime,
          enrichmentMs: enrichTime
        }
      });

      return {
        nextSteps: validatedSteps,
        tokensUsed: state.tokensUsed || 0
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('NextStepsGeneratorAgent: Failed to generate next steps', {
        error: error.message,
        stack: error.stack,
        executionTimeMs: executionTime
      });
      throw error;
    }
  }

  /**
   * Generate next steps with retry logic
   * @param {Object} state - Complete assessment state
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Array>} Generated next steps
   */
  async generateWithRetry(state, attempt = 1) {
    try {
      const messages = createNextStepsMessages(state);

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        functions: [generateNextStepsFunction],
        function_call: { name: 'generate_next_steps' },
        temperature: 0.5 // Slightly higher temperature for more creative recommendations
      });

      // Parse function call response
      const functionCall = response.choices[0].message.function_call;
      
      if (!functionCall || functionCall.name !== 'generate_next_steps') {
        throw new Error('OpenAI did not return expected function call');
      }

      const generatedData = JSON.parse(functionCall.arguments);

      // Validate generated data
      this.validateGeneratedData(generatedData);

      // Track token usage
      const tokensUsed = response.usage?.total_tokens || 0;
      
      // Log token usage
      logTokenUsage('NextStepsGeneratorAgent', response.usage);
      
      if (state.tokensUsed !== undefined) {
        state.tokensUsed += tokensUsed;
      }

      return generatedData.nextSteps || [];
    } catch (error) {
      logger.warn('NextStepsGeneratorAgent: Generation attempt failed', {
        attempt,
        error: error.message
      });

      // Retry logic
      if (attempt < this.maxRetries) {
        logger.info('NextStepsGeneratorAgent: Retrying generation', {
          attempt: attempt + 1
        });
        
        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
        
        return this.generateWithRetry(state, attempt + 1);
      }

      // Max retries reached
      throw new Error(`Failed to generate next steps after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  /**
   * Validate generated data structure
   * @param {Object} data - Generated data to validate
   * @throws {Error} If data is invalid
   */
  validateGeneratedData(data) {
    if (!data.nextSteps || !Array.isArray(data.nextSteps)) {
      throw new Error('Invalid generated data: nextSteps must be an array');
    }

    // Validate each next step
    data.nextSteps.forEach((step, index) => {
      if (!step.title || typeof step.title !== 'string') {
        throw new Error(`Invalid next step at index ${index}: title is required`);
      }

      if (!step.description || typeof step.description !== 'string') {
        throw new Error(`Invalid next step at index ${index}: description is required`);
      }

      if (!step.icon || typeof step.icon !== 'string') {
        throw new Error(`Invalid next step at index ${index}: icon is required`);
      }

      if (!step.actionType || !['view_providers', 'view_products', 'external_link', 'emergency'].includes(step.actionType)) {
        throw new Error(`Invalid next step at index ${index}: actionType must be view_providers, view_products, external_link, or emergency`);
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

module.exports = NextStepsGeneratorAgent;
