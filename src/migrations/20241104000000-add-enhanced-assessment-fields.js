'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new columns to assessments table
    await queryInterface.addColumn('assessments', 'extracted_symptoms', {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Structured symptom data extracted by Symptom Extractor Agent'
    });

    await queryInterface.addColumn('assessments', 'initial_self_care', {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Initial self-care recommendations from Medical Analyzer Agent'
    });

    await queryInterface.addColumn('assessments', 'providers', {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Array of healthcare provider recommendations'
    });

    await queryInterface.addColumn('assessments', 'products', {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Array of product and medication recommendations'
    });

    await queryInterface.addColumn('assessments', 'required_specialty', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Medical specialty required for this condition'
    });

    await queryInterface.addColumn('assessments', 'urgency', {
      type: Sequelize.ENUM('routine', 'urgent', 'emergency'),
      defaultValue: 'routine',
      comment: 'Urgency level determined by Symptom Extractor Agent'
    });

    await queryInterface.addColumn('assessments', 'red_flags', {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Array of red flag symptoms requiring immediate attention'
    });

    await queryInterface.addColumn('assessments', 'execution_time_ms', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Total execution time for assessment generation in milliseconds'
    });

    await queryInterface.addColumn('assessments', 'tokens_used', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Total tokens used across all AI agents'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the added columns in reverse order
    await queryInterface.removeColumn('assessments', 'tokens_used');
    await queryInterface.removeColumn('assessments', 'execution_time_ms');
    await queryInterface.removeColumn('assessments', 'red_flags');
    await queryInterface.removeColumn('assessments', 'urgency');
    await queryInterface.removeColumn('assessments', 'required_specialty');
    await queryInterface.removeColumn('assessments', 'products');
    await queryInterface.removeColumn('assessments', 'providers');
    await queryInterface.removeColumn('assessments', 'initial_self_care');
    await queryInterface.removeColumn('assessments', 'extracted_symptoms');
  }
};
