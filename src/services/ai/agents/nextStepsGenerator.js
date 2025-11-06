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
const WebSearchTool = require('../tools/webSearchTool');

class NextStepsGeneratorAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
    this.model = config.openai.model || 'gpt-3.5-turbo';
    this.maxRetries = 2;
    this.webSearchTool = new WebSearchTool();
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

      // Step 3: Enrich with URLs based on action type and location
      const enrichStartTime = Date.now();
      const enrichedSteps = await this.enrichStepsWithLocationAwareUrls(processedSteps, state);
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
   * Enrich next steps with location-aware URLs using web search
   * @param {Array} nextSteps - Generated next steps
   * @param {Object} state - Complete assessment state with location
   * @returns {Promise<Array>} Next steps with location-specific URLs
   */
  async enrichStepsWithLocationAwareUrls(nextSteps, state) {
    const location = state.userLocation || {};
    const condition = state.condition || {};

    logger.info('NextStepsGeneratorAgent: Enriching steps with location-aware URLs', {
      stepCount: nextSteps.length,
      city: location.city,
      country: location.country
    });

    // Process each step and enrich with location-specific URLs
    const enrichedSteps = await Promise.all(
      nextSteps.map(async (step) => {
        const enrichedStep = { ...step };

        try {
          switch (step.actionType) {
            case 'view_providers':
              // Use web search to find location-specific provider booking platforms
              if (condition.requiredSpecialty && location.city && location.country) {
                const searchQuery = `find ${condition.requiredSpecialty} doctor ${location.city} ${location.country}`;

                const searchResults = await this.webSearchTool.search({
                  query: searchQuery,
                  location: {
                    country: location.country,
                    city: location.city,
                    countryCode: location.countryCode
                  },
                  maxResults: 3
                });

                if (searchResults.success && searchResults.results.length > 0) {
                  enrichedStep.url = searchResults.results[0].url;
                  logger.info('NextStepsGeneratorAgent: Found provider URL via web search', {
                    actionType: 'view_providers',
                    url: enrichedStep.url
                  });
                } else {
                  // Fallback to generic search
                  enrichedStep.url = step.url || `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
                }
              } else {
                // No location data - use generic provider search
                const specialty = condition.requiredSpecialty || 'doctor';
                const fallbackQuery = `find ${specialty} near me`;
                enrichedStep.url = step.url || `https://www.google.com/search?q=${encodeURIComponent(fallbackQuery)}`;
                logger.info('NextStepsGeneratorAgent: Using fallback URL for provider search', {
                  actionType: 'view_providers',
                  specialty,
                  fallbackUrl: enrichedStep.url
                });
              }
              break;

            case 'view_products':
              // Use web search to find location-specific product purchase platforms
              if (condition.name && location.city && location.country) {
                const searchQuery = `buy health products for ${condition.name} ${location.city} ${location.country}`;

                const searchResults = await this.webSearchTool.search({
                  query: searchQuery,
                  location: {
                    country: location.country,
                    city: location.city,
                    countryCode: location.countryCode
                  },
                  maxResults: 3
                });

                if (searchResults.success && searchResults.results.length > 0) {
                  enrichedStep.url = searchResults.results[0].url;
                  logger.info('NextStepsGeneratorAgent: Found product URL via web search', {
                    actionType: 'view_products',
                    url: enrichedStep.url
                  });
                } else {
                  // Fallback to generic search
                  enrichedStep.url = step.url || `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
                }
              } else {
                // No location data - use generic product search
                const conditionName = condition.name || 'health products';
                const fallbackQuery = `buy ${conditionName} online`;
                enrichedStep.url = step.url || `https://www.google.com/search?q=${encodeURIComponent(fallbackQuery)}`;
                logger.info('NextStepsGeneratorAgent: Using fallback URL for product search', {
                  actionType: 'view_products',
                  condition: conditionName,
                  fallbackUrl: enrichedStep.url
                });
              }
              break;

            case 'external_link':
              // For external links, use web search to find health resources
              // If OpenAI provided a valid URL, use it
              if (step.url && step.url !== '#' && step.url.startsWith('http')) {
                enrichedStep.url = step.url;
                break;
              }

              // Otherwise, use web search to find appropriate resources
              const topic = step.title.toLowerCase();
              const description = step.description.toLowerCase();

              // Build search query based on the topic
              let searchQuery = '';

              // Check for specific health topics
              if (topic.includes('lifestyle') || description.includes('lifestyle')) {
                searchQuery = `healthy lifestyle tips ${condition.name || 'health'}`;
              } else if (topic.includes('stress') || description.includes('stress')) {
                searchQuery = `stress management techniques ${condition.name || ''}`;
              } else if (topic.includes('wellness') || topic.includes('program')) {
                searchQuery = `wellness program ${condition.name || 'health'} ${location.city || ''} ${location.country || ''}`;
              } else if (topic.includes('support') || topic.includes('group')) {
                searchQuery = `${condition.name || 'health'} support group ${location.city || ''} ${location.country || ''}`;
              } else if (topic.includes('exercise') || topic.includes('physical activity')) {
                searchQuery = `exercise recommendations ${condition.name || 'health'}`;
              } else if (topic.includes('diet') || topic.includes('nutrition')) {
                searchQuery = `nutrition advice ${condition.name || 'health'}`;
              } else if (topic.includes('sleep')) {
                searchQuery = `sleep hygiene tips ${condition.name || ''}`;
              } else if (topic.includes('clinic') || topic.includes('hospital') || topic.includes('pharmacy') || topic.includes('urgent care')) {
                searchQuery = `${step.title} ${location.city || ''} ${location.country || ''}`;
              } else {
                // Generic health information search
                searchQuery = `${step.title} health information`;
              }

              // Perform web search
              const searchResults = await this.webSearchTool.search({
                query: searchQuery.trim(),
                location: location.city && location.country ? {
                  country: location.country,
                  city: location.city,
                  countryCode: location.countryCode
                } : undefined,
                maxResults: 3
              });

              if (searchResults.success && searchResults.results.length > 0) {
                enrichedStep.url = searchResults.results[0].url;
                logger.info('NextStepsGeneratorAgent: Found external resource URL via web search', {
                  actionType: 'external_link',
                  topic: step.title,
                  searchQuery,
                  url: enrichedStep.url
                });
              } else {
                // Fallback to reputable health information sources
                const fallbackUrls = {
                  lifestyle: 'https://www.mayoclinic.org/healthy-lifestyle',
                  stress: 'https://www.mayoclinic.org/healthy-lifestyle/stress-management/basics/stress-basics/hlv-20049495',
                  exercise: 'https://www.cdc.gov/physicalactivity/basics/index.htm',
                  diet: 'https://www.nutrition.gov/',
                  sleep: 'https://www.cdc.gov/sleep/about_sleep/sleep_hygiene.html',
                  wellness: 'https://www.cdc.gov/wellness/index.html',
                  default: 'https://www.mayoclinic.org/'
                };

                // Find best fallback based on topic
                let fallbackUrl = fallbackUrls.default;
                for (const [key, url] of Object.entries(fallbackUrls)) {
                  if (topic.includes(key) || description.includes(key)) {
                    fallbackUrl = url;
                    break;
                  }
                }

                enrichedStep.url = fallbackUrl;
                logger.info('NextStepsGeneratorAgent: Using fallback URL for external link', {
                  actionType: 'external_link',
                  topic: step.title,
                  fallbackUrl
                });
              }
              break;

            case 'emergency':
              // For emergency, use web search to find nearest emergency room
              if (location.city && location.country) {
                const searchQuery = `emergency room near me ${location.city} ${location.country}`;

                const searchResults = await this.webSearchTool.search({
                  query: searchQuery,
                  location: {
                    country: location.country,
                    city: location.city,
                    countryCode: location.countryCode
                  },
                  maxResults: 3
                });

                if (searchResults.success && searchResults.results.length > 0) {
                  enrichedStep.url = searchResults.results[0].url;
                  logger.info('NextStepsGeneratorAgent: Found emergency care URL via web search', {
                    actionType: 'emergency',
                    url: enrichedStep.url
                  });
                } else {
                  // Fallback to OpenAI-provided URL or generic emergency info
                  enrichedStep.url = step.url || '/emergency-care';
                }
              } else {
                enrichedStep.url = step.url || '/emergency-care';
              }
              break;

            default:
              enrichedStep.url = step.url || '#';
          }
        } catch (error) {
          logger.warn('NextStepsGeneratorAgent: Failed to enrich step with web search', {
            actionType: step.actionType,
            error: error.message
          });
          // Fallback to OpenAI-provided URL or placeholder
          enrichedStep.url = step.url || '#';
        }

        return enrichedStep;
      })
    );

    logger.info('NextStepsGeneratorAgent: Steps enriched with location-aware URLs', {
      enrichedCount: enrichedSteps.filter(s => s.url && s.url !== '#').length,
      totalCount: enrichedSteps.length
    });

    return enrichedSteps;
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
