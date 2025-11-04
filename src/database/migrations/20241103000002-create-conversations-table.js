'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('conversations', {
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
      title: {
        type: Sequelize.STRING,
        defaultValue: 'New Conversation'
      },
      summary: {
        type: Sequelize.TEXT
      },
      symptoms: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      condition: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.ENUM('active', 'completed', 'archived'),
        defaultValue: 'active'
      },
      last_message_at: {
        type: Sequelize.DATE
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
    await queryInterface.addIndex('conversations', ['user_id']);
    await queryInterface.addIndex('conversations', ['status']);
    await queryInterface.addIndex('conversations', ['last_message_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('conversations');
  }
};
