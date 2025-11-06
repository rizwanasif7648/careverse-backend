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
  extractedSymptoms: {
    type: DataTypes.JSON,
    // Structured symptom data extracted by Symptom Extractor Agent
    field: 'extracted_symptoms',
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
  initialSelfCare: {
    type: DataTypes.JSON,
    // Initial self-care recommendations from Medical Analyzer Agent
    field: 'initial_self_care',
    defaultValue: []
  },
  nextSteps: {
    type: DataTypes.JSON,
    // Array of suggested next steps
    field: 'next_steps',
    defaultValue: []
  },
  providers: {
    type: DataTypes.JSON,
    // Array of healthcare provider recommendations
    defaultValue: []
  },
  products: {
    type: DataTypes.JSON,
    // Array of product and medication recommendations
    defaultValue: []
  },
  requiredSpecialty: {
    type: DataTypes.STRING,
    // Medical specialty required for this condition
    field: 'required_specialty'
  },
  urgency: {
    type: DataTypes.ENUM('routine', 'urgent', 'emergency'),
    // Urgency level determined by Symptom Extractor Agent
    defaultValue: 'routine'
  },
  redFlags: {
    type: DataTypes.JSON,
    // Array of red flag symptoms requiring immediate attention
    field: 'red_flags',
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
  warnings: {
    type: DataTypes.JSON,
    // Array of warning objects (emergency, low_confidence, urgent_care)
    defaultValue: []
  },
  confidence: {
    type: DataTypes.FLOAT,
    // AI confidence score (0-1)
    validate: {
      min: 0,
      max: 1
    }
  },
  executionTimeMs: {
    type: DataTypes.INTEGER,
    // Total execution time for assessment generation in milliseconds
    field: 'execution_time_ms'
  },
  tokensUsed: {
    type: DataTypes.INTEGER,
    // Total tokens used across all AI agents
    field: 'tokens_used'
  },
  toolMetrics: {
    type: DataTypes.JSON,
    // Tool usage metrics (web search invocations, cache hits, etc.)
    field: 'tool_metrics',
    defaultValue: {
      webSearchInvocations: 0,
      webSearchExecutionTimeMs: 0,
      webSearchCacheHits: 0,
      webSearchCacheMisses: 0,
      webSearchErrors: 0,
      webSearchRetries: 0,
      cacheHitRate: '0%'
    }
  }
}, {
  tableName: 'assessments',
  timestamps: true
});

module.exports = Assessment;
