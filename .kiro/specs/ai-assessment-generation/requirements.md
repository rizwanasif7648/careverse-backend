# Requirements Document

## Introduction

This document defines the requirements for the AI-Powered Assessment Generation feature in the Careverse healthcare platform. The feature enables users to generate comprehensive health assessments from their conversation history with the AI assistant. The assessment includes condition diagnosis, provider recommendations, product suggestions, and actionable next steps.

## Glossary

- **Assessment System**: The AI-powered system that analyzes conversation history and generates structured health assessments
- **Conversation History**: The complete record of messages exchanged between a user and the Careverse Assistant
- **Multi-Agent Orchestrator**: The coordination system that manages multiple specialized AI agents to generate assessment components
- **Symptom Extractor Agent**: An AI agent that identifies and structures symptoms from natural language conversation
- **Medical Analyzer Agent**: An AI agent that diagnoses possible conditions based on extracted symptoms using RAG
- **Provider Matcher Agent**: An AI agent that finds relevant healthcare providers based on condition and user location
- **Product Recommender Agent**: An AI agent that suggests medications and remedies related to the diagnosed condition
- **Next Steps Generator Agent**: An AI agent that creates actionable recommendations for the user
- **RAG Service**: Retrieval Augmented Generation service using Pinecone vector database for conversation history similarity search
- **Function Calling**: OpenAI's function calling feature for structured medical analysis and data extraction
- **User Location**: The geographic coordinates and address information associated with a user's profile
- **Provider Profile**: Healthcare provider information including name, specialty, location, ratings, and booking links
- **External Provider Link**: A URL that redirects users to third-party provider booking or profile pages
- **Assessment Record**: A database entity storing the complete generated assessment linked to a conversation

## Requirements

### Requirement 1: Assessment Generation Trigger

**User Story:** As a user engaged in a health conversation, I want to generate a comprehensive assessment at any point during the conversation, so that I can understand my possible condition and next steps.

#### Acceptance Criteria

1. WHEN a user clicks the "Check Assessment" button during an active conversation, THE Assessment System SHALL retrieve the complete conversation history from the database
2. WHEN the conversation history is retrieved, THE Assessment System SHALL extract the user's location information from the user profile
3. IF the conversation contains fewer than 2 user messages, THEN THE Assessment System SHALL return an error indicating insufficient information
4. WHEN the assessment generation is triggered, THE Assessment System SHALL initialize the Multi-Agent Orchestrator with conversation history and user context
5. WHILE the assessment is being generated, THE Assessment System SHALL return a processing status to the frontend

### Requirement 2: Symptom Extraction

**User Story:** As the system, I want to extract structured symptom information from natural language conversation, so that I can accurately identify the user's health concerns.

#### Acceptance Criteria

1. WHEN the Symptom Extractor Agent receives conversation messages, THE Symptom Extractor Agent SHALL identify all mentioned symptoms using natural language processing
2. WHEN symptoms are identified, THE Symptom Extractor Agent SHALL extract symptom attributes including name, severity, location, duration, and frequency
3. WHEN symptom extraction is complete, THE Symptom Extractor Agent SHALL classify the urgency level as routine, urgent, or emergency
4. IF red flag symptoms are detected (e.g., chest pain, severe bleeding), THEN THE Symptom Extractor Agent SHALL flag the assessment as requiring immediate medical attention
5. WHEN extraction is complete, THE Symptom Extractor Agent SHALL return a structured JSON object containing all extracted symptom data

### Requirement 3: Medical Condition Analysis

**User Story:** As the system, I want to analyze extracted symptoms and identify possible medical conditions, so that I can provide accurate health information to users.

#### Acceptance Criteria

1. WHEN the Medical Analyzer Agent receives extracted symptoms, THE Medical Analyzer Agent SHALL use GPT-3.5-turbo with function calling to analyze symptoms
2. WHEN analyzing symptoms, THE Medical Analyzer Agent SHALL use structured function definitions to ensure consistent output format
3. WHEN a condition is identified, THE Medical Analyzer Agent SHALL generate a detailed description of the condition
4. WHEN generating the assessment, THE Medical Analyzer Agent SHALL provide a list of common triggers for the identified condition
5. WHEN generating the assessment, THE Medical Analyzer Agent SHALL provide initial self-care recommendations
6. WHEN the analysis is complete, THE Medical Analyzer Agent SHALL calculate a confidence score between 0 and 1
7. WHEN the confidence score is below 0.6, THE Medical Analyzer Agent SHALL recommend consulting a healthcare professional for accurate diagnosis
8. WHEN the analysis is complete, THE Medical Analyzer Agent SHALL determine the required medical specialty for the condition
9. WHERE conversation history context is needed, THE Medical Analyzer Agent SHALL query the RAG Service to retrieve similar past conversations

### Requirement 4: Healthcare Provider Matching

**User Story:** As a user who received an assessment, I want to see nearby healthcare providers who specialize in my condition, so that I can book an appointment with a relevant specialist.

#### Acceptance Criteria

1. WHEN the Provider Matcher Agent receives the required specialty and user location, THE Provider Matcher Agent SHALL search for providers within a 25-mile radius
2. WHEN providers are found, THE Provider Matcher Agent SHALL calculate the distance from the user's location to each provider using the Haversine formula
3. WHEN provider data is retrieved, THE Provider Matcher Agent SHALL include provider name, specialty, address, phone number, and rating
4. WHEN provider data is retrieved, THE Provider Matcher Agent SHALL attempt to find external booking links or profile URLs for each provider
5. WHEN providers are ranked, THE Provider Matcher Agent SHALL sort results by distance and rating
6. WHEN the search is complete, THE Provider Matcher Agent SHALL return a maximum of 10 provider recommendations
7. IF no providers are found within the radius, THEN THE Provider Matcher Agent SHALL expand the search radius to 50 miles
8. WHEN provider information includes review data, THE Provider Matcher Agent SHALL display the rating and review count

### Requirement 5: Product and Remedy Recommendations

**User Story:** As a user who received an assessment, I want to see relevant medications and products for my condition, so that I can explore treatment options and purchase remedies.

#### Acceptance Criteria

1. WHEN the Product Recommender Agent receives the condition name and symptoms, THE Product Recommender Agent SHALL search for relevant over-the-counter medications
2. WHEN products are identified, THE Product Recommender Agent SHALL include product name, type, description, and purchase URL
3. WHEN generating recommendations, THE Product Recommender Agent SHALL prioritize safe, commonly recommended products for the condition
4. WHEN prescription medications are relevant, THE Product Recommender Agent SHALL include them with a note to consult a doctor
5. WHEN the recommendations are complete, THE Product Recommender Agent SHALL return a maximum of 8 product suggestions
6. IF product images are available, THEN THE Product Recommender Agent SHALL include image URLs in the response

### Requirement 6: Next Steps Generation

**User Story:** As a user who received an assessment, I want to see actionable next steps, so that I know what actions to take for my health concern.

#### Acceptance Criteria

1. WHEN the Next Steps Generator Agent receives the condition and severity level, THE Next Steps Generator Agent SHALL generate 3 to 5 actionable recommendations
2. WHEN generating next steps, THE Next Steps Generator Agent SHALL include a step to book a specialist appointment
3. WHEN the condition is stress-related, THE Next Steps Generator Agent SHALL include stress management or wellness program recommendations
4. WHEN medications are relevant, THE Next Steps Generator Agent SHALL include a step to view relevant medications
5. WHEN next steps are generated, THE Next Steps Generator Agent SHALL include a title, description, icon identifier, and action type for each step
6. WHEN the severity is high or emergency, THE Next Steps Generator Agent SHALL prioritize urgent care or emergency room visit as the first step

### Requirement 7: Assessment Data Persistence

**User Story:** As the system, I want to save generated assessments to the database, so that users can view their assessment history and track their health over time.

#### Acceptance Criteria

1. WHEN all agents complete their tasks, THE Assessment System SHALL aggregate all results into a single assessment object
2. WHEN the assessment object is created, THE Assessment System SHALL save it to the assessments table in the database
3. WHEN saving the assessment, THE Assessment System SHALL link it to the conversation ID and user ID
4. WHEN saving the assessment, THE Assessment System SHALL store the possible condition, description, symptoms, triggers, and self-care recommendations
5. WHEN saving the assessment, THE Assessment System SHALL store the provider recommendations, product recommendations, and next steps as JSON fields
6. WHEN the assessment is saved, THE Assessment System SHALL set the severity level and confidence score
7. WHEN the save operation is complete, THE Assessment System SHALL return the assessment ID to the client

### Requirement 8: Assessment Retrieval

**User Story:** As a user, I want to view my generated assessment with all details, so that I can review my health information and take appropriate actions.

#### Acceptance Criteria

1. WHEN a user requests an assessment by ID, THE Assessment System SHALL retrieve the assessment record from the database
2. WHEN retrieving the assessment, THE Assessment System SHALL verify that the assessment belongs to the requesting user
3. WHEN the assessment is retrieved, THE Assessment System SHALL return the possible condition with description, triggers, and self-care recommendations
4. WHEN the assessment is retrieved, THE Assessment System SHALL return the list of suggested next steps
5. WHEN the assessment is retrieved, THE Assessment System SHALL return the provider recommendations with all details
6. WHEN the assessment is retrieved, THE Assessment System SHALL return the product recommendations with purchase links
7. IF the assessment does not exist or does not belong to the user, THEN THE Assessment System SHALL return a 404 error

### Requirement 9: Multi-Agent Orchestration

**User Story:** As the system, I want to coordinate multiple AI agents efficiently, so that assessment generation is fast and reliable.

#### Acceptance Criteria

1. WHEN the Multi-Agent Orchestrator is initialized, THE Multi-Agent Orchestrator SHALL create a shared state object containing conversation history and user context
2. WHEN the workflow begins, THE Multi-Agent Orchestrator SHALL execute the Symptom Extractor Agent first
3. WHEN symptom extraction is complete, THE Multi-Agent Orchestrator SHALL execute the Medical Analyzer Agent with extracted symptoms
4. WHEN medical analysis is complete, THE Multi-Agent Orchestrator SHALL execute the Provider Matcher Agent, Product Recommender Agent, and Next Steps Generator Agent in parallel
5. WHEN all agents complete successfully, THE Multi-Agent Orchestrator SHALL aggregate results and return the complete assessment
6. IF any agent fails, THEN THE Multi-Agent Orchestrator SHALL retry the failed agent up to 2 times
7. IF an agent fails after retries, THEN THE Multi-Agent Orchestrator SHALL log the error and continue with partial results
8. WHEN the orchestration is complete, THE Multi-Agent Orchestrator SHALL log the total execution time and token usage

### Requirement 10: Error Handling and Fallbacks

**User Story:** As the system, I want to handle errors gracefully, so that users receive helpful information even when components fail.

#### Acceptance Criteria

1. IF the OpenAI API is unavailable, THEN THE Assessment System SHALL return an error message indicating the service is temporarily unavailable
2. IF the RAG Service fails to retrieve conversation history, THEN THE Medical Analyzer Agent SHALL proceed with analysis using only the current conversation
3. IF the Provider Matcher Agent finds no providers, THEN THE Assessment System SHALL include a message suggesting online consultation options
4. IF the Product Recommender Agent fails, THEN THE Assessment System SHALL return the assessment without product recommendations
5. WHEN any component times out after 30 seconds, THE Assessment System SHALL cancel the operation and return a timeout error
6. WHEN errors occur, THE Assessment System SHALL log detailed error information for debugging
7. WHEN returning error responses, THE Assessment System SHALL include user-friendly error messages without exposing technical details

### Requirement 11: Performance and Scalability

**User Story:** As the system, I want to generate assessments efficiently, so that users receive results quickly and the system can handle multiple concurrent requests.

#### Acceptance Criteria

1. WHEN an assessment is generated, THE Assessment System SHALL complete the entire process within 15 seconds for 90% of requests
2. WHEN provider searches are performed, THE Provider Matcher Agent SHALL cache results for 1 hour to reduce API calls
3. WHEN product recommendations are generated, THE Product Recommender Agent SHALL cache results for 24 hours per condition
4. WHEN the RAG Service performs vector searches for conversation history, THE RAG Service SHALL limit results to the top 3 most relevant past conversations
5. WHEN multiple assessments are requested simultaneously, THE Assessment System SHALL handle at least 10 concurrent requests without degradation

### Requirement 12: Medical Disclaimer and Safety

**User Story:** As the system, I want to provide appropriate medical disclaimers, so that users understand the limitations of AI-generated health information.

#### Acceptance Criteria

1. WHEN an assessment is generated, THE Assessment System SHALL include a disclaimer stating that the assessment is not a medical diagnosis
2. WHEN the assessment is displayed, THE Assessment System SHALL recommend consulting a healthcare professional for accurate diagnosis
3. IF emergency symptoms are detected, THEN THE Assessment System SHALL display a prominent warning to seek immediate medical attention
4. WHEN medication recommendations are provided, THE Assessment System SHALL include a disclaimer to consult a doctor before taking any medication
5. WHEN the confidence score is below 0.6, THE Assessment System SHALL display a message indicating low confidence and recommending professional consultation
