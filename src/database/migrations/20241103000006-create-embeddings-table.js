'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('embeddings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      conversation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'conversations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      pinecone_vector_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Reference to the vector ID in Pinecone'
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'AI-generated summary of the conversation segment'
      },
      message_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of messages included in this embedding'
      },
      start_message_id: {
        type: Sequelize.UUID,
        comment: 'First message ID in this embedding segment'
      },
      end_message_id: {
        type: Sequelize.UUID,
        comment: 'Last message ID in this embedding segment'
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {},
        comment: 'Additional metadata (model version, token count, etc.)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('embeddings', ['user_id']);
    await queryInterface.addIndex('embeddings', ['conversation_id']);
    await queryInterface.addIndex('embeddings', ['pinecone_vector_id']);
    await queryInterface.addIndex('embeddings', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('embeddings');
  }
};
