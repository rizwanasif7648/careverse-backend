const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Embedding = sequelize.define('Embedding', {
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
  pineconeVectorId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'pinecone_vector_id',
    comment: 'Reference to the vector ID in Pinecone'
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'AI-generated summary of the conversation segment'
  },
  messageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'message_count',
    comment: 'Number of messages included in this embedding'
  },
  startMessageId: {
    type: DataTypes.UUID,
    field: 'start_message_id',
    comment: 'First message ID in this embedding segment'
  },
  endMessageId: {
    type: DataTypes.UUID,
    field: 'end_message_id',
    comment: 'Last message ID in this embedding segment'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Additional metadata (model version, token count, etc.)'
  }
}, {
  tableName: 'embeddings',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['conversation_id']
    },
    {
      fields: ['pinecone_vector_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = Embedding;
