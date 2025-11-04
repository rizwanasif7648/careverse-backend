/**
 * Assessment Orchestrator
 * Main entry point for the LangGraph-based assessment generation workflow
 */

const { workflow, getWorkflowVisualization } = require('./workflow');
const { AssessmentStateAnnotation } = require('./state');
const logger = require('../../../config/logger');
const { Conversation, Message, User } = require('../../../models');
const { 
  generateAssessmentDisclaimer, 
  generateWarnings,
  addMedicationDisclaimers 
} = require('../../../utils/medicalDisclaimers');

/**
 * Assessment Orchestrator Class
 * Manages the execution of the multi-agent assessment workflow
 */
class AssessmentOrchestrator {
  constructor(db = null) {
    this.workflow = workflow;
    this.db = db || { Conversation, Message, User };
  }

  /**
   * Generate assessment from conversation ID
   * @param {string} conversationId - Conversation UUID
   * @param {string} userId - User UUID
   * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
   * @returns {Promise<Object>} Final assessment state
   */
  async generateAssessment(conversationId, userId, timeoutMs = 30000) {
    logger.info('AssessmentOrchestrator: Starting assessment generation', {
      conversationId,
      userId,
      timeoutMs
    });

    try {
      // Step 1: Fetch conversation from database
      const conversation = await this.fetchConversation(conversationId, userId);
      
      // Step 2: Extract user location
      const userLocation = await this.extractUserLocation(userId);
      
      // Step 3: Validate conversation data
      this.validateConversation(conversation);
      
      // Step 4: Initialize state
      const initialState = this.initializeState(
        conversationId,
        userId,
        conversation.messages,
        userLocation
      );
      
      // Step 5: Execute workflow with timeout
      const result = await this.executeWorkflowWithTimeout(initialState, timeoutMs);
      
      // Step 6: Aggregate and format results
      const aggregatedResult = this.aggregateResults(result);

      logger.info('AssessmentOrchestrator: Assessment generation completed', {
        conversationId,
        executionTimeMs: aggregatedResult.executionTimeMs,
        tokensUsed: aggregatedResult.tokensUsed,
        hasErrors: aggregatedResult.errors?.length > 0
      });

      return aggregatedResult;
    } catch (error) {
      logger.error('AssessmentOrchestrator: Assessment generation failed', {
        conversationId,
        userId,
        error: error.message,
        errorType: error.name,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Execute workflow with timeout
   * @param {Object} initialState - Initial state for workflow
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<Object>} Final state from workflow
   * @throws {Error} If workflow times out
   */
  async executeWorkflowWithTimeout(initialState, timeoutMs) {
    logger.info('AssessmentOrchestrator: Executing workflow with timeout', {
      conversationId: initialState.conversationId,
      timeoutMs
    });

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Workflow execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Create workflow execution promise
    const workflowPromise = this.workflow.invoke(initialState);

    try {
      // Race between workflow execution and timeout
      const result = await Promise.race([workflowPromise, timeoutPromise]);
      
      logger.info('AssessmentOrchestrator: Workflow completed within timeout', {
        conversationId: initialState.conversationId,
        executionTimeMs: result.executionTimeMs
      });
      
      return result;
    } catch (error) {
      // Check if it's a timeout error
      if (error.message.includes('timed out')) {
        logger.error('AssessmentOrchestrator: Workflow execution timed out', {
          conversationId: initialState.conversationId,
          timeoutMs,
          error: error.message
        });
        
        // Create a timeout error with specific type
        const timeoutError = new Error(`Assessment generation timed out after ${timeoutMs / 1000} seconds. Please try again.`);
        timeoutError.name = 'TimeoutError';
        timeoutError.code = 'WORKFLOW_TIMEOUT';
        throw timeoutError;
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Fetch conversation by ID from database
   * @param {string} conversationId - Conversation UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Conversation with messages
   * @throws {Error} If conversation not found or doesn't belong to user
   */
  async fetchConversation(conversationId, userId) {
    const startTime = Date.now();
    
    logger.info('AssessmentOrchestrator: Fetching conversation', {
      conversationId,
      userId
    });

    const conversation = await this.db.Conversation.findOne({
      where: {
        id: conversationId,
        userId: userId
      },
      include: [
        {
          model: this.db.Message,
          as: 'messages',
          attributes: ['id', 'role', 'content', 'createdAt'],
          // Limit to last 20 messages for performance and token optimization
          limit: 20,
          separate: true,
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!conversation) {
      throw new Error('Conversation not found or does not belong to user');
    }

    // Reverse messages to get chronological order (oldest to newest)
    if (conversation.messages) {
      conversation.messages.reverse();
    }

    const queryTime = Date.now() - startTime;

    logger.info('AssessmentOrchestrator: Conversation fetched successfully', {
      conversationId,
      messageCount: conversation.messages?.length || 0,
      queryTimeMs: queryTime,
      limited: conversation.messages?.length === 20
    });

    return conversation;
  }

  /**
   * Extract user location from user profile
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} User location object
   * @throws {Error} If user not found
   */
  async extractUserLocation(userId) {
    logger.info('AssessmentOrchestrator: Extracting user location', {
      userId
    });

    const user = await this.db.User.findByPk(userId, {
      attributes: ['id', 'location']
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Handle missing location gracefully
    const location = user.location || {};
    
    const userLocation = {
      latitude: location.lat || location.latitude || null,
      longitude: location.lng || location.longitude || null,
      city: location.city || null,
      state: location.state || null
    };

    // If location is missing, log warning but don't fail
    if (!userLocation.latitude || !userLocation.longitude) {
      logger.warn('AssessmentOrchestrator: User location is incomplete', {
        userId,
        location: userLocation
      });
      
      // Set default location (e.g., center of US) to allow workflow to continue
      userLocation.latitude = userLocation.latitude || 39.8283;
      userLocation.longitude = userLocation.longitude || -98.5795;
      userLocation.city = userLocation.city || 'Unknown';
      userLocation.state = userLocation.state || 'Unknown';
    }

    logger.info('AssessmentOrchestrator: User location extracted', {
      userId,
      hasLocation: !!(location.lat || location.latitude)
    });

    return userLocation;
  }

  /**
   * Validate conversation has sufficient data
   * @param {Object} conversation - Conversation object with messages
   * @throws {Error} If conversation has insufficient data
   */
  validateConversation(conversation) {
    logger.info('AssessmentOrchestrator: Validating conversation', {
      conversationId: conversation.id,
      messageCount: conversation.messages?.length || 0
    });

    if (!conversation.messages || conversation.messages.length === 0) {
      throw new Error('Conversation has no messages');
    }

    // Count user messages
    const userMessages = conversation.messages.filter(msg => msg.role === 'user');
    
    if (userMessages.length < 2) {
      throw new Error('Insufficient conversation data. At least 2 user messages are required.');
    }

    logger.info('AssessmentOrchestrator: Conversation validation passed', {
      conversationId: conversation.id,
      totalMessages: conversation.messages.length,
      userMessages: userMessages.length
    });
  }

  /**
   * Initialize state object for workflow
   * @param {string} conversationId - Conversation UUID
   * @param {string} userId - User UUID
   * @param {Array} messages - Array of message objects
   * @param {Object} userLocation - User location object
   * @returns {Object} Initial state object
   */
  initializeState(conversationId, userId, messages, userLocation) {
    logger.info('AssessmentOrchestrator: Initializing state', {
      conversationId,
      userId,
      messageCount: messages.length
    });

    // Format messages for the workflow
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.createdAt
    }));

    const initialState = {
      // Input data
      conversationId,
      userId,
      messages: formattedMessages,
      userLocation,
      
      // Agent outputs (initialized as empty)
      symptoms: [],
      urgency: 'routine',
      redFlags: [],
      condition: {
        name: null,
        description: null,
        commonTriggers: [],
        initialSelfCare: [],
        requiredSpecialty: null,
        confidence: 0
      },
      providers: [],
      products: [],
      nextSteps: [],
      
      // Metadata
      executionStartTime: null,
      executionEndTime: null,
      executionTimeMs: 0,
      tokensUsed: 0,
      errors: [],
      retryCount: {}
    };

    logger.info('AssessmentOrchestrator: State initialized successfully');

    return initialState;
  }

  /**
   * Aggregate and format results from workflow execution
   * @param {Object} finalState - Final state from workflow
   * @returns {Object} Formatted assessment result
   */
  aggregateResults(finalState) {
    logger.info('AssessmentOrchestrator: Aggregating results', {
      conversationId: finalState.conversationId
    });

    const urgency = finalState.urgency || 'routine';
    const redFlags = finalState.redFlags || [];
    const confidence = finalState.condition?.confidence || 0;
    const products = finalState.products || [];
    const hasProducts = products.length > 0;

    // Generate comprehensive disclaimer based on assessment characteristics
    const disclaimer = generateAssessmentDisclaimer({
      confidence,
      urgency,
      redFlags,
      hasProducts
    });

    // Generate warnings for the assessment
    const warnings = generateWarnings({
      confidence,
      urgency,
      redFlags
    });

    // Add medication disclaimers to products
    const productsWithDisclaimers = addMedicationDisclaimers(products);

    // Extract all agent outputs
    const aggregatedResult = {
      conversationId: finalState.conversationId,
      userId: finalState.userId,
      
      // Symptom extraction results
      symptoms: finalState.symptoms || [],
      urgency,
      redFlags,
      
      // Medical analysis results
      condition: finalState.condition || {
        name: null,
        description: null,
        commonTriggers: [],
        initialSelfCare: [],
        requiredSpecialty: null,
        confidence: 0
      },
      
      // Provider recommendations
      providers: finalState.providers || [],
      
      // Product recommendations with disclaimers
      products: productsWithDisclaimers,
      
      // Next steps
      nextSteps: finalState.nextSteps || [],
      
      // Metadata
      executionTimeMs: finalState.executionTimeMs || 0,
      tokensUsed: finalState.tokensUsed || 0,
      errors: finalState.errors || [],
      
      // Derived fields for API response
      severity: this.calculateSeverity(urgency, confidence),
      confidence,
      
      // Safety features
      disclaimer,
      warnings
    };

    logger.info('AssessmentOrchestrator: Results aggregated successfully', {
      conversationId: finalState.conversationId,
      hasCondition: !!aggregatedResult.condition.name,
      providerCount: aggregatedResult.providers.length,
      productCount: aggregatedResult.products.length,
      nextStepsCount: aggregatedResult.nextSteps.length,
      warningCount: warnings.length,
      hasEmergencyWarning: warnings.some(w => w.type === 'emergency')
    });

    return aggregatedResult;
  }

  /**
   * Calculate severity level based on urgency and confidence
   * @param {string} urgency - Urgency level (routine, urgent, emergency)
   * @param {number} confidence - Confidence score (0-1)
   * @returns {string} Severity level (low, medium, high, emergency)
   */
  calculateSeverity(urgency, confidence = 0) {
    if (urgency === 'emergency') {
      return 'emergency';
    }
    
    if (urgency === 'urgent') {
      return 'high';
    }
    
    // For routine cases, use confidence to determine severity
    if (confidence >= 0.7) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Get workflow visualization
   * @returns {string} Mermaid diagram of the workflow
   */
  getVisualization() {
    return getWorkflowVisualization();
  }
}

module.exports = {
  AssessmentOrchestrator,
  AssessmentStateAnnotation
};
