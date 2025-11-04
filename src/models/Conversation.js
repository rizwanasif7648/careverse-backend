const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Conversation = sequelize.define('Conversation', {
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
  title: {
    type: DataTypes.STRING,
    defaultValue: 'New Conversation'
  },
  summary: {
    type: DataTypes.TEXT,
    // AI-generated summary of the conversation
  },
  symptoms: {
    type: DataTypes.JSON,
    // Array of identified symptoms
    defaultValue: []
  },
  condition: {
    type: DataTypes.STRING,
    // Identified condition/diagnosis
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'archived'),
    defaultValue: 'active'
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    field: 'last_message_at'
  }
}, {
  tableName: 'conversations',
  timestamps: true,
  underscored: true
});

module.exports = Conversation;
