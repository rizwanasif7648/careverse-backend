# Implementation Plan

- [x] 1. Setup dependencies and infrastructure
  - Install LangGraph, OpenAI, and Pinecone packages
  - Configure environment variables for APIs
  - Setup Redis connection for caching
  - _Requirements: 1.4, 9.1_

- [x] 1.1 Install required npm packages
  - Install @langchain/langgraph, @langchain/openai, @langchain/pinecone
  - Install axios for external API calls
  - Install ioredis for Redis caching
  - _Requirements: 1.4, 9.1_

- [x] 1.2 Update environment configuration
  - Add OpenAI API key configuration
  - Add Pinecone configuration for conversation history
  - Add Google Places API key configuration
  - Add Redis configuration
  - Update config.js with new environment variables
  - _Requirements: 1.4, 9.1_

- [x] 1.3 Create Redis service wrapper
  - Write Redis connection utility in src/services/cache/redis.service.js
  - Implement get, set, setex, and del methods
  - Add error handling and connection retry logic
  - _Requirements: 11.2, 11.3_

- [x] 2. Update database models for enhanced assessments
  - Modify Assessment model with new fields
  - Create database migration script
  - Test model changes
  - _Requirements: 7.2, 7.5, 7.6_

- [x] 2.1 Add new fields to Assessment model
  - Add extractedSymptoms JSON field
  - Add initialSelfCare JSON field
  - Add nextSteps JSON field
  - Add providers JSON field
  - Add products JSON field
  - Add requiredSpecialty string field
  - Add urgency enum field
  - Add redFlags JSON field
  - Add executionTimeMs and tokensUsed integer fields
  - Update src/models/Assessment.js
  - _Requirements: 7.2, 7.5, 7.6_

- [x] 2.2 Create database migration script
  - Write migration to add new columns to assessments table
  - Test migration on development database
  - _Requirements: 7.2_

- [x] 3. Implement Pinecone conversation history service
  - Create Pinecone service for conversation embeddings
  - Implement conversation indexing
  - Implement similarity search
  - _Requirements: 3.9, 11.4_

- [x] 3.1 Create Pinecone service class
  - Write src/services/ai/rag/pinecone.service.js
  - Initialize Pinecone client with API key
  - Create methods for index operations
  - _Requirements: 3.9_

- [x] 3.2 Implement conversation embedding and indexing
  - Create method to generate embeddings for conversations
  - Implement upsert method to store conversation vectors
  - Add metadata (conversationId, userId, timestamp)
  - _Requirements: 3.9_

- [x] 3.3 Implement similarity search for conversation history
  - Create method to search similar past conversations
  - Return top 3 most relevant conversations
  - Handle empty results gracefully
  - _Requirements: 3.9, 11.4_

- [x] 4. Create function calling schemas and prompts
  - Define OpenAI function schemas for each agent
  - Write system prompts for each agent
  - Create prompt templates
  - _Requirements: 2.2, 3.2, 5.2, 6.2_

- [x] 4.1 Create symptom extraction function schema
  - Define extract_symptoms function with parameters
  - Include symptom properties (name, severity, location, duration, frequency)
  - Include urgency and redFlags fields
  - Write in src/services/ai/prompts/symptomExtraction.js
  - _Requirements: 2.2, 2.5_

- [x] 4.2 Create medical analysis function schema
  - Define diagnose_condition function with parameters
  - Include condition properties (name, description, triggers, selfCare, specialty, confidence)
  - Write in src/services/ai/prompts/medicalAnalysis.js
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 4.3 Create product recommendation function schema
  - Define recommend_products function with parameters
  - Include product properties (name, type, description, isPrescription)
  - Write in src/services/ai/prompts/productRecommendation.js
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 4.4 Create next steps generation function schema
  - Define generate_next_steps function with parameters
  - Include step properties (title, description, icon, actionType, url)
  - Write in src/services/ai/prompts/nextStepsGeneration.js
  - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 5. Implement Symptom Extractor Agent
  - Create agent class with OpenAI function calling
  - Implement symptom extraction logic
  - Add urgency classification
  - Add red flag detection
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5.1 Create SymptomExtractorAgent class
  - Write src/services/ai/agents/symptomExtractor.js
  - Initialize with OpenAI client
  - Create analyze method that accepts messages
  - _Requirements: 2.1_

- [x] 5.2 Implement symptom extraction with function calling
  - Call OpenAI API with extract_symptoms function
  - Parse function call response
  - Extract structured symptom data
  - Handle API errors with retry logic
  - _Requirements: 2.2, 2.5_

- [x] 5.3 Implement urgency classification logic
  - Classify as routine, urgent, or emergency based on symptoms
  - Use function calling output for urgency
  - _Requirements: 2.3_

- [x] 5.4 Implement red flag detection
  - Identify emergency symptoms (chest pain, severe bleeding, etc.)
  - Add to redFlags array
  - _Requirements: 2.4_

- [x] 6. Implement Medical Analyzer Agent
  - Create agent class with RAG integration
  - Implement condition diagnosis logic
  - Add confidence scoring
  - Determine required specialty
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 6.1 Create MedicalAnalyzerAgent class
  - Write src/services/ai/agents/medicalAnalyzer.js
  - Initialize with OpenAI client and Pinecone service
  - Create analyze method that accepts symptoms
  - _Requirements: 3.1_

- [x] 6.2 Implement conversation history retrieval
  - Query Pinecone for similar past conversations
  - Use similarity search with top 3 results
  - Handle Pinecone failures gracefully
  - _Requirements: 3.9, 10.2_

- [x] 6.3 Implement condition diagnosis with function calling
  - Call OpenAI API with diagnose_condition function
  - Include conversation history context if available
  - Parse function call response
  - Extract condition details
  - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 6.4 Implement confidence scoring
  - Calculate confidence score from 0 to 1
  - Add low confidence warning when score < 0.6
  - _Requirements: 3.6, 3.7_

- [x] 6.5 Implement specialty determination
  - Determine required medical specialty from condition
  - Use function calling output
  - _Requirements: 3.8_

- [x] 7. Implement Provider Matcher Agent
  - Create agent class with database and API integration
  - Implement provider search logic
  - Add distance calculation
  - Integrate Google Places API
  - Add booking link enrichment
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 7.1 Create ProviderMatcherAgent class
  - Write src/services/ai/agents/providerMatcher.js
  - Initialize with database connection and Redis client
  - Create findProviders method that accepts specialty and location
  - _Requirements: 4.1_

- [x] 7.2 Implement Redis caching for provider searches
  - Check cache before searching
  - Cache key format: providers:{specialty}:{lat}:{lng}
  - Set TTL to 1 hour
  - _Requirements: 11.2_

- [x] 7.3 Implement database provider search
  - Query Provider model with specialty filter
  - Calculate distance using Haversine formula
  - Filter by 25-mile radius
  - Sort by distance
  - _Requirements: 4.1, 4.2_

- [x] 7.4 Create Google Places API service wrapper
  - Write src/services/ai/tools/googlePlaces.js
  - Implement searchProviders method
  - Implement getPlaceDetails method
  - Add error handling and rate limiting
  - _Requirements: 4.1, 4.3_

- [x] 7.5 Integrate Google Places API for additional providers
  - Call Google Places API if database results < 5
  - Parse and format Google Places results
  - Merge with database results
  - _Requirements: 4.1, 4.7_

- [x] 7.6 Implement booking link enrichment
  - Create web scraping utility for booking links
  - Check Zocdoc, Healthgrades, etc.
  - Add profileUrl and bookingUrl to provider objects
  - Handle scraping failures gracefully
  - _Requirements: 4.4_

- [x] 7.7 Implement provider ranking and limiting
  - Sort providers by distance and rating
  - Return maximum of 10 providers
  - Include all required fields in response
  - _Requirements: 4.5, 4.6, 4.8_

- [x] 8. Implement Product Recommender Agent
  - Create agent class with function calling
  - Implement product recommendation logic
  - Add purchase link enrichment
  - Implement caching
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 8.1 Create ProductRecommenderAgent class
  - Write src/services/ai/agents/productRecommender.js
  - Initialize with OpenAI client and Redis client
  - Create recommend method that accepts condition and symptoms
  - _Requirements: 5.1_

- [x] 8.2 Implement Redis caching for product recommendations
  - Check cache before generating recommendations
  - Cache key format: products:{conditionName}
  - Set TTL to 24 hours
  - _Requirements: 11.3_

- [x] 8.3 Implement product recommendation with function calling
  - Call OpenAI API with recommend_products function
  - Parse function call response
  - Extract product list with details
  - _Requirements: 5.2, 5.3_

- [x] 8.4 Create product link enrichment utility
  - Write src/services/ai/tools/productSearch.js
  - Search Amazon Product API or 1mg API
  - Add purchaseUrl and imageUrl to products
  - Handle API failures gracefully
  - _Requirements: 5.2, 5.6_

- [x] 8.5 Implement prescription medication handling
  - Mark prescription medications with isPrescription flag
  - Add doctor consultation disclaimer
  - _Requirements: 5.4_

- [x] 8.6 Limit and return product recommendations
  - Return maximum of 8 products
  - Prioritize safe, commonly recommended products
  - _Requirements: 5.5_

- [x] 9. Implement Next Steps Generator Agent
  - Create agent class with function calling
  - Implement next steps generation logic
  - Add action type and URL assignment
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 9.1 Create NextStepsGeneratorAgent class
  - Write src/services/ai/agents/nextStepsGenerator.js
  - Initialize with OpenAI client
  - Create generate method that accepts full state
  - _Requirements: 6.1_

- [x] 9.2 Implement next steps generation with function calling
  - Call OpenAI API with generate_next_steps function
  - Parse function call response
  - Extract next steps list
  - _Requirements: 6.2_

- [x] 9.3 Implement action type and URL assignment
  - Add URLs based on actionType
  - view_providers → /providers?specialty=...
  - view_products → /products?condition=...
  - external_link → use provided URL
  - emergency → emergency care instructions
  - _Requirements: 6.2, 6.5_

- [x] 9.4 Implement urgency-based prioritization
  - For high/emergency severity, prioritize urgent care
  - Include specialist booking for routine cases
  - Add stress management for stress-related conditions
  - _Requirements: 6.3, 6.4, 6.6_

- [x] 9.5 Limit next steps to 3-5 recommendations
  - Return between 3 and 5 actionable steps
  - Include all required fields (title, description, icon, actionType)
  - _Requirements: 6.2_

- [x] 10. Implement LangGraph orchestrator
  - Create state annotation
  - Define workflow graph
  - Add agent nodes
  - Configure edges and routing
  - Implement parallel execution
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

- [x] 10.1 Create LangGraph state annotation
  - Write src/services/ai/orchestrator/state.js
  - Define AssessmentStateAnnotation with all fields
  - Include input, output, and metadata fields
  - _Requirements: 9.1_

- [x] 10.2 Create workflow graph definition
  - Write src/services/ai/orchestrator/workflow.js
  - Create StateGraph with AssessmentStateAnnotation
  - Add all agent nodes
  - _Requirements: 9.2_

- [x] 10.3 Configure sequential execution flow
  - Add edge from start to symptomExtractor
  - Add edge from symptomExtractor to medicalAnalyzer
  - _Requirements: 9.3_

- [x] 10.4 Configure parallel execution flow
  - Add conditional edges from medicalAnalyzer
  - Route to providerMatcher, productRecommender in parallel
  - Handle emergency case (skip to nextStepsGenerator)
  - _Requirements: 9.4_

- [x] 10.5 Configure convergence to next steps generator
  - Add edges from providerMatcher to nextStepsGenerator
  - Add edges from productRecommender to nextStepsGenerator
  - Add edge from nextStepsGenerator to end
  - _Requirements: 9.5_

- [x] 10.6 Implement error handling and retry logic
  - Wrap agent calls in try-catch blocks
  - Retry failed agents up to 2 times
  - Log errors and continue with partial results
  - _Requirements: 9.6, 9.7_

- [x] 10.7 Implement execution time and token tracking
  - Track start and end time for workflow
  - Sum token usage from all agents
  - Add to state metadata
  - _Requirements: 9.8_

- [x] 10.8 Compile and export workflow
  - Compile the workflow graph
  - Export invoke method
  - Add workflow visualization utility
  - _Requirements: 9.2_

- [x] 11. Create main orchestrator service
  - Create orchestrator class that uses LangGraph workflow
  - Implement conversation fetching
  - Implement state initialization
  - Implement result aggregation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.1, 9.5_

- [x] 11.1 Create AssessmentOrchestrator class
  - Write src/services/ai/orchestrator/index.js
  - Initialize with database connection and workflow
  - Create generateAssessment method
  - _Requirements: 1.1, 9.1_

- [x] 11.2 Implement conversation fetching
  - Fetch conversation by ID from database
  - Include all messages ordered by createdAt
  - Verify conversation belongs to user
  - _Requirements: 1.1, 8.2_

- [x] 11.3 Implement user location extraction
  - Extract location from user profile
  - Include latitude, longitude, city, state
  - Handle missing location gracefully
  - _Requirements: 1.2_

- [x] 11.4 Implement conversation validation
  - Check conversation has at least 2 user messages
  - Return error if insufficient data
  - _Requirements: 1.3_

- [x] 11.5 Implement state initialization
  - Create initial state object with conversation and user data
  - Initialize empty arrays for agent outputs
  - Add metadata fields
  - _Requirements: 1.4, 9.1_

- [x] 11.6 Implement workflow execution
  - Call workflow.invoke with initial state
  - Handle workflow errors
  - Return final state
  - _Requirements: 9.5_

- [x] 11.7 Implement result aggregation
  - Extract all agent outputs from final state
  - Format for API response
  - _Requirements: 9.5_

- [x] 12. Update assessment controller
  - Modify generateAssessment endpoint
  - Integrate orchestrator service
  - Save assessment to database
  - Return formatted response
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 12.1 Update generateAssessment controller method
  - Import AssessmentOrchestrator
  - Call orchestrator.generateAssessment
  - Handle orchestrator errors
  - Update src/controllers/assessment.controller.js
  - _Requirements: 7.1, 8.1_

- [x] 12.2 Implement assessment saving logic
  - Create Assessment record with all fields
  - Link to conversationId and userId
  - Store all agent outputs as JSON
  - Store metadata (executionTime, tokensUsed)
  - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 12.3 Format and return API response
  - Structure response with possibleCondition, nextSteps, providers, products
  - Include severity, confidence, disclaimer
  - Return 201 Created with assessment data
  - _Requirements: 7.7, 8.3, 8.4, 8.5, 8.6_

- [x] 12.4 Implement error responses
  - Handle insufficient data error (400)
  - Handle OpenAI API errors (500)
  - Handle timeout errors (504)
  - Return user-friendly error messages
  - _Requirements: 10.1, 10.5, 10.7_

- [x] 13. Update assessment retrieval endpoint
  - Modify getAssessmentById controller
  - Return all new fields
  - Format response for frontend
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 13.1 Update getAssessmentById controller method
  - Fetch assessment with all new fields
  - Verify ownership
  - Format response with all sections
  - Update src/controllers/assessment.controller.js
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 14. Implement error handling and logging
  - Add comprehensive error handling
  - Implement logging for all operations
  - Add performance monitoring
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 14.1 Add error handling to all agents
  - Wrap agent operations in try-catch
  - Log errors with context
  - Return graceful error responses
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6_

- [x] 14.2 Implement timeout handling
  - Set 30-second timeout for workflow execution
  - Cancel operation on timeout
  - Return 504 error
  - _Requirements: 10.5_

- [x] 14.3 Add performance logging
  - Log execution time for each agent
  - Log total workflow execution time
  - Log token usage per agent
  - Log cache hit rates
  - _Requirements: 10.7_

- [x] 15. Add medical disclaimers and safety features
  - Implement disclaimer text
  - Add emergency warnings
  - Add low confidence warnings
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 15.1 Add disclaimer to all assessments
  - Include standard medical disclaimer
  - Add to assessment response
  - Store in database
  - _Requirements: 12.1_

- [x] 15.2 Add professional consultation recommendation
  - Include in all assessment responses
  - Emphasize for low confidence scores
  - _Requirements: 12.2_

- [x] 15.3 Implement emergency symptom warnings
  - Detect emergency symptoms in red flags
  - Display prominent warning message
  - Prioritize emergency care in next steps
  - _Requirements: 12.3_

- [x] 15.4 Add medication consultation disclaimer
  - Include with all medication recommendations
  - Warn about prescription medications
  - _Requirements: 12.4_

- [x] 15.5 Add low confidence warning
  - Display when confidence < 0.6
  - Recommend professional consultation
  - _Requirements: 12.5_

- [x] 16. Create API documentation
  - Document new assessment generation endpoint
  - Document request/response formats
  - Add example requests and responses
  - Update Postman collection
  - _Requirements: 7.7, 8.3, 8.4, 8.5, 8.6_

- [x] 16.1 Document POST /api/v1/assessments/generate endpoint
  - Add request body schema
  - Add success response schema
  - Add error response schemas
  - Include example requests
  - _Requirements: 7.7, 8.3_

- [x] 16.2 Document GET /api/v1/assessments/:id endpoint updates
  - Document new response fields
  - Add example response with all sections
  - _Requirements: 8.4, 8.5, 8.6_

- [x] 16.3 Update Postman collection
  - Add new assessment generation request
  - Add environment variables
  - Add test scripts
  - _Requirements: 7.7_

- [x] 17. Performance optimization and caching
  - Implement Redis caching
  - Optimize database queries
  - Add token usage optimization
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 17.1 Verify Redis caching implementation
  - Test provider search caching
  - Test product recommendation caching
  - Verify TTL settings
  - Monitor cache hit rates
  - _Requirements: 11.2, 11.3_

- [x] 17.2 Optimize conversation retrieval query
  - Add database indexes if needed
  - Limit message history to last 20 messages
  - Test query performance
  - _Requirements: 11.1_

- [x] 17.3 Implement token usage optimization
  - Use concise system prompts
  - Limit conversation history length
  - Implement token counting
  - _Requirements: 11.1_

- [x] 17.4 Verify parallel execution performance
  - Measure time savings from parallel agents
  - Ensure <15 second total execution time
  - _Requirements: 11.1, 11.5_

- [x] 18. End-to-end testing
  - Test complete assessment generation flow
  - Test error scenarios
  - Test with various conversation types
  - Verify database persistence
  - _Requirements: All_

- [x] 18.1 Create test conversations
  - Create test data with various symptom types
  - Include edge cases (emergency, low confidence)
  - Seed test database
  - _Requirements: All_

- [x] 18.2 Test successful assessment generation
  - Trigger assessment generation
  - Verify all agents execute
  - Verify response format
  - Verify database record created
  - _Requirements: All_

- [x] 18.3 Test error scenarios
  - Test with insufficient conversation data
  - Test with API failures
  - Test with timeout scenarios
  - Verify error responses
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 18.4 Test assessment retrieval
  - Retrieve saved assessment
  - Verify all fields present
  - Verify ownership validation
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 18.5 Performance testing
  - Test with concurrent requests
  - Verify execution time <15 seconds
  - Monitor token usage
  - Test cache effectiveness
  - _Requirements: 11.1, 11.2, 11.3, 11.5_
