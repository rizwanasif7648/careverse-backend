const { Assessment, Conversation } = require('../models');
const logger = require('../config/logger');
const { AssessmentOrchestrator } = require('../services/ai/orchestrator');

// Initialize orchestrator
const orchestrator = new AssessmentOrchestrator();

// Get all assessments for user
const getUserAssessments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: assessments } = await Assessment.findAndCountAll({
      where: { userId },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: Conversation,
        as: 'conversation',
        attributes: ['id', 'title']
      }]
    });

    res.status(200).json({
      success: true,
      data: {
        assessments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single assessment
const getAssessmentById = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const userId = req.user.id;

    // Fetch assessment with all new fields
    const assessment = await Assessment.findOne({
      where: { id: assessmentId, userId },
      include: [{
        model: Conversation,
        as: 'conversation',
        attributes: ['id', 'title']
      }]
    });

    // Verify ownership - assessment not found or doesn't belong to user
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Format response with all sections for frontend
    const formattedAssessment = {
      assessmentId: assessment.id,
      possibleCondition: {
        name: assessment.possibleCondition,
        description: assessment.description,
        commonTriggers: assessment.commonTriggers || [],
        initialSelfCare: assessment.initialSelfCare || assessment.selfCareRecommendations || []
      },
      extractedSymptoms: assessment.extractedSymptoms || [],
      nextSteps: assessment.nextSteps || [],
      providers: assessment.providers || [],
      products: assessment.products || [],
      severity: assessment.severity,
      confidence: assessment.confidence,
      urgency: assessment.urgency,
      redFlags: assessment.redFlags || [],
      requiredSpecialty: assessment.requiredSpecialty,
      disclaimer: assessment.disclaimer,
      warnings: assessment.warnings || [],
      executionTimeMs: assessment.executionTimeMs,
      tokensUsed: assessment.tokensUsed,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
      conversation: assessment.conversation
    };

    res.status(200).json({
      success: true,
      data: { assessment: formattedAssessment }
    });
  } catch (error) {
    logger.error('Error fetching assessment', {
      assessmentId: req.params.assessmentId,
      userId: req.user?.id,
      error: error.message
    });
    next(error);
  }
};

// Generate new assessment from conversation
const generateAssessment = async (req, res, next) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user.id;

    logger.info('Assessment generation requested', { conversationId, userId });

    // Verify conversation belongs to user
    const conversation = await Conversation.findOne({
      where: { id: conversationId, userId }
    });

    if (!conversation) {
      logger.warn('Conversation not found', { conversationId, userId });
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Call orchestrator to generate assessment with 30-second timeout
    let orchestratorResult;
    try {
      orchestratorResult = await orchestrator.generateAssessment(conversationId, userId, 30000);
    } catch (orchestratorError) {
      logger.error('Orchestrator failed to generate assessment', {
        conversationId,
        userId,
        error: orchestratorError.message,
        errorType: orchestratorError.name,
        errorCode: orchestratorError.code
      });

      // Handle specific error types
      if (orchestratorError.message.includes('Insufficient conversation data')) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient conversation data. Please continue the conversation before generating an assessment.',
          error: 'INSUFFICIENT_DATA'
        });
      }

      // Handle timeout errors specifically
      if (orchestratorError.name === 'TimeoutError' || 
          orchestratorError.code === 'WORKFLOW_TIMEOUT' ||
          orchestratorError.message.includes('timeout') || 
          orchestratorError.message.includes('timed out')) {
        return res.status(504).json({
          success: false,
          message: 'Assessment generation timed out after 30 seconds. Please try again.',
          error: 'TIMEOUT'
        });
      }

      // Handle OpenAI API errors
      if (orchestratorError.message.includes('OpenAI') || 
          orchestratorError.message.includes('API') ||
          orchestratorError.name === 'APIError') {
        return res.status(503).json({
          success: false,
          message: 'AI service is temporarily unavailable. Please try again in a moment.',
          error: 'SERVICE_UNAVAILABLE'
        });
      }

      // Generic error for other issues
      return res.status(500).json({
        success: false,
        message: 'Failed to generate assessment. Please try again.',
        error: 'GENERATION_FAILED'
      });
    }

    // Save assessment to database
    const assessment = await Assessment.create({
      userId,
      conversationId,
      
      // Condition information
      possibleCondition: orchestratorResult.condition.name || 'Unknown Condition',
      description: orchestratorResult.condition.description || '',
      
      // Symptoms
      symptoms: orchestratorResult.symptoms.map(s => s.name) || [],
      extractedSymptoms: orchestratorResult.symptoms || [],
      
      // Triggers and self-care
      commonTriggers: orchestratorResult.condition.commonTriggers || [],
      selfCareRecommendations: orchestratorResult.condition.initialSelfCare || [],
      initialSelfCare: orchestratorResult.condition.initialSelfCare || [],
      
      // Recommendations
      nextSteps: orchestratorResult.nextSteps || [],
      providers: orchestratorResult.providers || [],
      products: orchestratorResult.products || [],
      
      // Metadata
      requiredSpecialty: orchestratorResult.condition.requiredSpecialty || null,
      urgency: orchestratorResult.urgency || 'routine',
      redFlags: orchestratorResult.redFlags || [],
      severity: orchestratorResult.severity || 'medium',
      confidence: orchestratorResult.confidence || 0,
      disclaimer: orchestratorResult.disclaimer,
      warnings: orchestratorResult.warnings || [],
      
      // Performance metrics
      executionTimeMs: orchestratorResult.executionTimeMs || 0,
      tokensUsed: orchestratorResult.tokensUsed || 0
    });

    logger.info('Assessment saved to database', {
      assessmentId: assessment.id,
      conversationId,
      userId,
      executionTimeMs: assessment.executionTimeMs,
      tokensUsed: assessment.tokensUsed
    });

    // Format response
    const response = {
      assessmentId: assessment.id,
      possibleCondition: {
        name: assessment.possibleCondition,
        description: assessment.description,
        commonTriggers: assessment.commonTriggers,
        initialSelfCare: assessment.initialSelfCare
      },
      nextSteps: assessment.nextSteps,
      providers: assessment.providers,
      products: assessment.products,
      severity: assessment.severity,
      confidence: assessment.confidence,
      disclaimer: assessment.disclaimer,
      warnings: orchestratorResult.warnings || []
    };

    res.status(201).json({
      success: true,
      message: 'Assessment generated successfully',
      data: response
    });
  } catch (error) {
    logger.error('Unexpected error in generateAssessment', {
      conversationId: req.body.conversationId,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

module.exports = {
  getUserAssessments,
  getAssessmentById,
  generateAssessment
};
