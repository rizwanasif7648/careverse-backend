'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('providers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      specialty: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      address: {
        type: Sequelize.STRING
      },
      city: {
        type: Sequelize.STRING
      },
      state: {
        type: Sequelize.STRING
      },
      zip_code: {
        type: Sequelize.STRING
      },
      country: {
        type: Sequelize.STRING,
        defaultValue: 'USA'
      },
      latitude: {
        type: Sequelize.FLOAT
      },
      longitude: {
        type: Sequelize.FLOAT
      },
      phone: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING
      },
      website: {
        type: Sequelize.STRING
      },
      rating: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      review_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      is_accepting_new_patients: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      insurance_accepted: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      languages: {
        type: Sequelize.JSON,
        defaultValue: ['English']
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
    await queryInterface.addIndex('providers', ['specialty']);
    await queryInterface.addIndex('providers', ['city', 'state']);
    await queryInterface.addIndex('providers', ['latitude', 'longitude']);
    await queryInterface.addIndex('providers', ['is_accepting_new_patients']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('providers');
  }
};
