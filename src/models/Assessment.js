const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Assessment = sequelize.define('Assessment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'conversation_id',
    references: {
      model: 'conversations',
      key: 'id'
    }
  },
  possibleCondition: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'possible_condition'
  },
  description: {
    type: DataTypes.TEXT,
    // Detailed description of the condition
  },
  symptoms: {
    type: DataTypes.JSON,
    // Array of symptoms that led to this assessment
    defaultValue: []
  },
  commonTriggers: {
    type: DataTypes.JSON,
    // Array of common triggers
    field: 'common_triggers',
    defaultValue: []
  },
  selfCareRecommendations: {
    type: DataTypes.JSON,
    // Array of self-care tips
    field: 'self_care_recommendations',
    defaultValue: []
  },
  nextSteps: {
    type: DataTypes.JSON,
    // Array of suggested next steps
    field: 'next_steps',
    defaultValue: []
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'emergency'),
    defaultValue: 'medium'
  },
  disclaimer: {
    type: DataTypes.TEXT,
    defaultValue: 'This is not a medical diagnosis. Please consult with a healthcare professional for an accurate diagnosis.'
  },
  confidence: {
    type: DataTypes.FLOAT,
    // AI confidence score (0-1)
    validate: {
      min: 0,
      max: 1
    }
  }
}, {
  tableName: 'assessments',
  timestamps: true
});

module.exports = Assessment;
