/**
 * AI Orchestrator - Coordinates multiple AI agents
 * Re-exports the LangGraph-based AssessmentOrchestrator implementation
 */

// Export the new LangGraph-based orchestrator implementation
const { AssessmentOrchestrator, AssessmentStateAnnotation } = require('./orchestrator/index');

// For backward compatibility, also export individual agents
const agents = {
  symptomExtractor: require('./agents/symptomExtractor'),
  medicalAnalyzer: require('./agents/medicalAnalyzer'),
  providerMatcher: require('./agents/providerMatcher'),
  productRecommender: require('./agents/productRecommender'),
  nextStepsGenerator: require('./agents/nextStepsGenerator')
};

module.exports = {
  AssessmentOrchestrator,
  AssessmentStateAnnotation,
  agents
};
