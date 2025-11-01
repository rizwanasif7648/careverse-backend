const { Assessment, Conversation } = require('../models');
const logger = require('../config/logger');

// Get all assessments for user
const getUserAssessments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: assessments } = await Assessment.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
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

    const assessment = await Assessment.findOne({
      where: { id: assessmentId, userId },
      include: [{
        model: Conversation,
        as: 'conversation',
        attributes: ['id', 'title']
      }]
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { assessment }
    });
  } catch (error) {
    next(error);
  }
};

// Generate new assessment from conversation
const generateAssessment = async (req, res, next) => {
  try {
    const { conversationId } = req.body;
    const userId = req.user.id;

    // Verify conversation belongs to user
    const conversation = await Conversation.findOne({
      where: { id: conversationId, userId }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // TODO: Call AI service to generate assessment
    // For now, we'll create a placeholder assessment
    const assessment = await Assessment.create({
      userId,
      conversationId,
      possibleCondition: 'Migraine',
      description: 'A neurological condition that can cause multiple symptoms, often characterized by intense, debilitating headaches.',
      symptoms: ['Severe headache', 'Sensitivity to light', 'Nausea'],
      commonTriggers: ['Stress', 'Lack of sleep', 'Certain foods'],
      selfCareRecommendations: [
        'Rest in a quiet, dark room',
        'Apply cold compress',
        'Stay hydrated'
      ],
      nextSteps: [
        'Book a Neurologist',
        'Explore Stress Relief Programs',
        'View Relevant Medications'
      ],
      severity: 'medium',
      confidence: 0.75
    });

    logger.info(`Assessment generated for conversation ${conversationId}`);

    res.status(201).json({
      success: true,
      message: 'Assessment generated successfully',
      data: { assessment }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserAssessments,
  getAssessmentById,
  generateAssessment
};
