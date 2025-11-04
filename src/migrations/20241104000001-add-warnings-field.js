'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('assessments', 'warnings', {
      type: Sequelize.JSON,
      defaultValue: [],
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('assessments', 'warnings');
  }
};
