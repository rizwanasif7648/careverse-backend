/**
 * LangGraph State Annotation
 * Defines the shared state structure for the assessment generation workflow
 */

const { Annotation } = require('@langchain/langgraph');

/**
 * Assessment State Annotation
 * This defines the structure of the state object that flows through the workflow
 */
const AssessmentStateAnnotation = Annotation.Root({
  // Input data
  conversationId: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => null
  }),
  
  userId: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => null
  }),
  
  messages: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => []
  }),
  
  userLocation: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => ({
      latitude: null,
      longitude: null,
      city: null,
      state: null
    })
  }),
  
  // Agent outputs - Symptom Extractor
  symptoms: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => []
  }),
  
  urgency: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => 'routine'
  }),
  
  redFlags: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => []
  }),
  
  // Agent outputs - Medical Analyzer
  condition: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => ({
      name: null,
      description: null,
      commonTriggers: [],
      initialSelfCare: [],
      requiredSpecialty: null,
      confidence: 0
    })
  }),
  
  // Agent outputs - Provider Matcher
  providers: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => []
  }),
  
  // Agent outputs - Product Recommender
  products: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => []
  }),
  
  // Agent outputs - Next Steps Generator
  nextSteps: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => []
  }),
  
  // Metadata fields
  executionStartTime: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => null
  }),
  
  executionEndTime: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => null
  }),
  
  executionTimeMs: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => 0
  }),
  
  tokensUsed: Annotation({
    reducer: (prev, next) => {
      // Sum token usage from all agents
      if (typeof next === 'number') {
        return (prev || 0) + next;
      }
      return prev || 0;
    },
    default: () => 0
  }),
  
  errors: Annotation({
    reducer: (prev, next) => {
      // Accumulate errors
      if (Array.isArray(next)) {
        return [...(prev || []), ...next];
      } else if (next) {
        return [...(prev || []), next];
      }
      return prev || [];
    },
    default: () => []
  }),
  
  // Retry tracking
  retryCount: Annotation({
    reducer: (prev, next) => next ?? prev,
    default: () => {}
  })
});

module.exports = {
  AssessmentStateAnnotation
};
