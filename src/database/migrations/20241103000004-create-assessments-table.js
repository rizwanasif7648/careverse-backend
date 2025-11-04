'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('assessments', {
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
      possible_condition: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      symptoms: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      common_triggers: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      self_care_recommendations: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      next_steps: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      severity: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'emergency'),
        defaultValue: 'medium'
      },
      disclaimer: {
        type: Sequelize.TEXT,
        defaultValue: 'This is not a medical diagnosis. Please consult with a healthcare professional for an accurate diagnosis.'
      },
      confidence: {
        type: Sequelize.FLOAT
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
    await queryInterface.addIndex('assessments', ['user_id']);
    await queryInterface.addIndex('assessments', ['conversation_id']);
    await queryInterface.addIndex('assessments', ['severity']);
    await queryInterface.addIndex('assessments', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('assessments');
  }
};
