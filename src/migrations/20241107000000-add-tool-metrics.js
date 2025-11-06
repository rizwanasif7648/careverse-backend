'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('assessments', 'tool_metrics', {
      type: Sequelize.JSON,
      defaultValue: {
        webSearchInvocations: 0,
        webSearchExecutionTimeMs: 0,
        webSearchCacheHits: 0,
        webSearchCacheMisses: 0,
        webSearchErrors: 0,
        webSearchRetries: 0,
        cacheHitRate: '0%'
      },
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('assessments', 'tool_metrics');
  }
};
