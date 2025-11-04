/**
 * LangGraph Workflow Definition
 * Defines the multi-agent workflow for assessment generation
 */

const { StateGraph, START, END } = require('@langchain/langgraph');
const { AssessmentStateAnnotation } = require('./state');
const logger = require('../../../config/logger');

// Import agents
const SymptomExtractorAgent = require('../agents/symptomExtractor');
const MedicalAnalyzerAgent = require('../agents/medicalAnalyzer');
const ProviderMatcherAgent = require('../agents/providerMatcher');
const ProductRecommenderAgent = require('../agents/productRecommender');
const NextStepsGeneratorAgent = require('../agents/nextStepsGenerator');

// Initialize agents
const symptomExtractor = new SymptomExtractorAgent();
const medicalAnalyzer = new MedicalAnalyzerAgent();
const providerMatcher = new ProviderMatcherAgent();
const productRecommender = new ProductRecommenderAgent();
const nextStepsGenerator = new NextStepsGeneratorAgent();

/**
 * Retry wrapper for agent execution
 * @param {Function} agentFn - Agent function to execute
 * @param {string} agentName - Name of the agent for logging
 * @param {Object} state - Current state
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @returns {Promise<Object>} Agent result or error
 */
async function executeWithRetry(agentFn, agentName, state, maxRetries = 2) {
  const retryCount = state.retryCount || {};
  const currentRetries = retryCount[agentName] || 0;
  const startTime = Date.now();
  
  try {
    logger.info(`Workflow: Starting ${agentName} execution`, {
      agent: agentName,
      attempt: currentRetries + 1,
      maxRetries: maxRetries + 1
    });
    
    const result = await agentFn();
    
    const executionTime = Date.now() - startTime;
    
    // Log successful execution with performance metrics
    logger.info(`Workflow: ${agentName} completed successfully`, {
      agent: agentName,
      executionTimeMs: executionTime,
      retriesUsed: currentRetries,
      tokensUsed: result.tokensUsed || 0
    });
    
    // Reset retry count on success
    if (currentRetries > 0) {
      logger.info(`Workflow: ${agentName} succeeded after ${currentRetries} retries`);
    }
    
    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Log detailed error information with context
    logger.error(`Workflow: ${agentName} failed (attempt ${currentRetries + 1})`, {
      agent: agentName,
      attempt: currentRetries + 1,
      maxRetries: maxRetries + 1,
      executionTimeMs: executionTime,
      error: error.message,
      errorType: error.name,
      stack: error.stack,
      conversationId: state.conversationId,
      userId: state.userId
    });
    
    // Check if we should retry
    if (currentRetries < maxRetries) {
      const backoffMs = Math.pow(2, currentRetries) * 1000;
      
      logger.info(`Workflow: Retrying ${agentName} after ${backoffMs}ms backoff`, {
        agent: agentName,
        nextAttempt: currentRetries + 2,
        backoffMs
      });
      
      // Update retry count
      const newRetryCount = {
        ...retryCount,
        [agentName]: currentRetries + 1
      };
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      
      // Retry with updated state
      return executeWithRetry(
        agentFn,
        agentName,
        { ...state, retryCount: newRetryCount },
        maxRetries
      );
    }
    
    // Max retries reached, log error and continue with partial results
    logger.error(`Workflow: ${agentName} failed after ${maxRetries + 1} attempts, continuing with partial results`, {
      agent: agentName,
      totalAttempts: maxRetries + 1,
      error: error.message,
      errorType: error.name,
      conversationId: state.conversationId,
      userId: state.userId
    });
    
    // Record error in state for tracking
    const errorRecord = {
      agent: agentName,
      message: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      retriesAttempted: currentRetries,
      totalExecutionTimeMs: executionTime
    };
    
    // Return graceful error response with empty results
    return {
      errors: [errorRecord],
      // Return empty/default values based on agent type
      ...(agentName === 'symptomExtractor' && {
        symptoms: [],
        urgency: 'routine',
        redFlags: [],
        tokensUsed: 0
      }),
      ...(agentName === 'medicalAnalyzer' && {
        condition: {
          name: 'Unable to determine',
          description: 'We were unable to analyze your symptoms at this time. Please consult with a healthcare professional.',
          commonTriggers: [],
          initialSelfCare: [],
          requiredSpecialty: 'General Practitioner',
          confidence: 0
        },
        tokensUsed: 0
      }),
      ...(agentName === 'providerMatcher' && {
        providers: []
      }),
      ...(agentName === 'productRecommender' && {
        products: [],
        tokensUsed: 0
      }),
      ...(agentName === 'nextStepsGenerator' && {
        nextSteps: [],
        tokensUsed: 0
      })
    };
  }
}

/**
 * Symptom Extractor Node
 * Extracts structured symptom data from conversation messages
 */
async function symptomExtractorNode(state) {
  logger.info('Workflow: Executing symptomExtractorNode');
  
  const result = await executeWithRetry(
    async () => {
      const agentResult = await symptomExtractor.analyze(state.messages);
      
      return {
        symptoms: agentResult.symptoms,
        urgency: agentResult.urgency,
        redFlags: agentResult.redFlags,
        tokensUsed: agentResult.tokensUsed
      };
    },
    'symptomExtractor',
    state
  );
  
  // Accumulate tokens and errors
  return {
    ...result,
    tokensUsed: (state.tokensUsed || 0) + (result.tokensUsed || 0),
    errors: [...(state.errors || []), ...(result.errors || [])]
  };
}

/**
 * Medical Analyzer Node
 * Analyzes symptoms and diagnoses possible condition
 */
async function medicalAnalyzerNode(state) {
  logger.info('Workflow: Executing medicalAnalyzerNode');
  
  const result = await executeWithRetry(
    async () => {
      const symptomData = {
        symptoms: state.symptoms,
        urgency: state.urgency,
        redFlags: state.redFlags
      };
      
      const agentResult = await medicalAnalyzer.analyze(
        symptomData,
        state.conversationId,
        state.messages
      );
      
      return {
        condition: {
          name: agentResult.name,
          description: agentResult.description,
          commonTriggers: agentResult.commonTriggers,
          initialSelfCare: agentResult.initialSelfCare,
          requiredSpecialty: agentResult.requiredSpecialty,
          confidence: agentResult.confidence
        },
        tokensUsed: agentResult.tokensUsed
      };
    },
    'medicalAnalyzer',
    state
  );
  
  // Accumulate tokens and errors
  return {
    ...result,
    tokensUsed: (state.tokensUsed || 0) + (result.tokensUsed || 0),
    errors: [...(state.errors || []), ...(result.errors || [])]
  };
}

/**
 * Provider Matcher Node
 * Finds relevant healthcare providers
 */
async function providerMatcherNode(state) {
  logger.info('Workflow: Executing providerMatcherNode');
  
  const result = await executeWithRetry(
    async () => {
      const providers = await providerMatcher.findProviders({
        specialty: state.condition.requiredSpecialty,
        location: state.userLocation
      });
      
      return {
        providers: providers
      };
    },
    'providerMatcher',
    state
  );
  
  // Accumulate errors (no tokens for this agent)
  return {
    ...result,
    errors: [...(state.errors || []), ...(result.errors || [])]
  };
}

/**
 * Product Recommender Node
 * Recommends medications and healthcare products
 */
async function productRecommenderNode(state) {
  logger.info('Workflow: Executing productRecommenderNode');
  
  const result = await executeWithRetry(
    async () => {
      const agentResult = await productRecommender.recommend(
        state.condition,
        state.symptoms
      );
      
      return {
        products: agentResult.products,
        tokensUsed: agentResult.tokensUsed
      };
    },
    'productRecommender',
    state
  );
  
  // Accumulate tokens and errors
  return {
    ...result,
    tokensUsed: (state.tokensUsed || 0) + (result.tokensUsed || 0),
    errors: [...(state.errors || []), ...(result.errors || [])]
  };
}

/**
 * Next Steps Generator Node
 * Generates actionable next steps for the user
 */
async function nextStepsGeneratorNode(state) {
  logger.info('Workflow: Executing nextStepsGeneratorNode');
  
  const result = await executeWithRetry(
    async () => {
      const agentResult = await nextStepsGenerator.generate(state);
      
      return {
        nextSteps: agentResult.nextSteps,
        tokensUsed: agentResult.tokensUsed
      };
    },
    'nextStepsGenerator',
    state
  );
  
  // Accumulate tokens and errors
  return {
    ...result,
    tokensUsed: (state.tokensUsed || 0) + (result.tokensUsed || 0),
    errors: [...(state.errors || []), ...(result.errors || [])]
  };
}

/**
 * Conditional routing function after medical analysis
 * Determines which agents to execute next based on urgency
 */
function routeAfterMedicalAnalysis(state) {
  logger.info('Workflow: Routing after medical analysis', {
    urgency: state.urgency
  });
  
  // For emergency cases, skip provider/product search and go directly to next steps
  if (state.urgency === 'emergency') {
    logger.info('Workflow: Emergency detected, routing to nextStepsGenerator');
    return ['nextStepsGenerator'];
  }
  
  // For routine and urgent cases, execute provider and product search in parallel
  logger.info('Workflow: Routing to parallel execution (provider + product)');
  return ['providerMatcher', 'productRecommender'];
}

/**
 * Start tracking node - records execution start time
 */
async function startTrackingNode(state) {
  const startTime = Date.now();
  
  logger.info('Workflow: Starting execution time tracking', {
    conversationId: state.conversationId,
    userId: state.userId,
    messageCount: state.messages?.length || 0,
    startTime: new Date(startTime).toISOString()
  });
  
  return {
    executionStartTime: startTime
  };
}

/**
 * End tracking node - calculates total execution time
 */
async function endTrackingNode(state) {
  const endTime = Date.now();
  const executionTimeMs = endTime - (state.executionStartTime || endTime);
  const errorCount = state.errors?.length || 0;
  
  // Log completion with comprehensive metrics
  logger.info('Workflow: Execution completed', {
    conversationId: state.conversationId,
    userId: state.userId,
    executionTimeMs,
    tokensUsed: state.tokensUsed || 0,
    errorCount,
    hasErrors: errorCount > 0,
    endTime: new Date(endTime).toISOString(),
    // Performance breakdown
    performance: {
      totalTimeMs: executionTimeMs,
      averageTimePerMessage: state.messages?.length 
        ? Math.round(executionTimeMs / state.messages.length) 
        : 0,
      tokensPerSecond: executionTimeMs > 0 
        ? Math.round((state.tokensUsed || 0) / (executionTimeMs / 1000)) 
        : 0
    },
    // Results summary
    results: {
      symptomsExtracted: state.symptoms?.length || 0,
      conditionIdentified: !!state.condition?.name,
      providersFound: state.providers?.length || 0,
      productsRecommended: state.products?.length || 0,
      nextStepsGenerated: state.nextSteps?.length || 0
    }
  });
  
  // Log warning if execution took too long
  if (executionTimeMs > 15000) {
    logger.warn('Workflow: Execution time exceeded target threshold', {
      conversationId: state.conversationId,
      executionTimeMs,
      targetMs: 15000,
      exceededBy: executionTimeMs - 15000
    });
  }
  
  // Log errors if any occurred
  if (errorCount > 0) {
    logger.error('Workflow: Completed with errors', {
      conversationId: state.conversationId,
      errorCount,
      errors: state.errors
    });
  }
  
  return {
    executionEndTime: endTime,
    executionTimeMs
  };
}

/**
 * Create the workflow graph
 */
function createWorkflowGraph() {
  const workflow = new StateGraph(AssessmentStateAnnotation);
  
  // Add tracking nodes
  workflow.addNode('startTracking', startTrackingNode);
  workflow.addNode('endTracking', endTrackingNode);
  
  // Add all agent nodes
  workflow.addNode('symptomExtractor', symptomExtractorNode);
  workflow.addNode('medicalAnalyzer', medicalAnalyzerNode);
  workflow.addNode('providerMatcher', providerMatcherNode);
  workflow.addNode('productRecommender', productRecommenderNode);
  workflow.addNode('nextStepsGenerator', nextStepsGeneratorNode);
  
  // Configure sequential execution flow with tracking
  // Start -> Start Tracking -> Symptom Extractor -> Medical Analyzer
  workflow.addEdge(START, 'startTracking');
  workflow.addEdge('startTracking', 'symptomExtractor');
  workflow.addEdge('symptomExtractor', 'medicalAnalyzer');
  
  // Configure parallel execution flow with conditional routing
  // Medical Analyzer -> (Provider Matcher + Product Recommender) OR Next Steps Generator
  workflow.addConditionalEdges(
    'medicalAnalyzer',
    routeAfterMedicalAnalysis
  );
  
  // Configure convergence to next steps generator
  // Provider Matcher -> Next Steps Generator
  // Product Recommender -> Next Steps Generator
  workflow.addEdge('providerMatcher', 'nextStepsGenerator');
  workflow.addEdge('productRecommender', 'nextStepsGenerator');
  
  // Next Steps Generator -> End Tracking -> End
  workflow.addEdge('nextStepsGenerator', 'endTracking');
  workflow.addEdge('endTracking', END);
  
  return workflow;
}

/**
 * Compile and create the workflow
 * @returns {Object} Compiled workflow with invoke method
 */
function compileWorkflow() {
  const graph = createWorkflowGraph();
  const compiledWorkflow = graph.compile();
  
  logger.info('Workflow: Graph compiled successfully');
  
  return compiledWorkflow;
}

/**
 * Get workflow visualization in Mermaid format
 * @returns {string} Mermaid diagram of the workflow
 */
function getWorkflowVisualization() {
  return `
graph TD
    START([Start]) --> startTracking[Start Tracking]
    startTracking --> symptomExtractor[Symptom Extractor]
    symptomExtractor --> medicalAnalyzer[Medical Analyzer]
    medicalAnalyzer -->|Emergency| nextStepsGenerator[Next Steps Generator]
    medicalAnalyzer -->|Routine/Urgent| providerMatcher[Provider Matcher]
    medicalAnalyzer -->|Routine/Urgent| productRecommender[Product Recommender]
    providerMatcher --> nextStepsGenerator
    productRecommender --> nextStepsGenerator
    nextStepsGenerator --> endTracking[End Tracking]
    endTracking --> END([End])
  `;
}

// Create and export the compiled workflow
const workflow = compileWorkflow();

module.exports = {
  workflow,
  compileWorkflow,
  createWorkflowGraph,
  getWorkflowVisualization,
  // Export individual nodes for testing
  symptomExtractorNode,
  medicalAnalyzerNode,
  providerMatcherNode,
  productRecommenderNode,
  nextStepsGeneratorNode,
  startTrackingNode,
  endTrackingNode
};
