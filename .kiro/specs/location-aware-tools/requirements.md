# Requirements Document

## Introduction

This feature enhances the existing AI assessment system to be truly dynamic and location-aware by implementing LangGraph tool calling capabilities. Instead of using hardcoded URLs and static service providers (e.g., Zocdoc for US only), the system will dynamically determine appropriate healthcare platforms, e-commerce sites, and booking services based on the user's geographic location. Agents will use tools to perform real-time searches and retrieve location-specific information, making the assessment system globally applicable and contextually relevant.

## Glossary

- **Assessment_System**: The existing AI-powered medical assessment orchestrator that analyzes symptoms and provides recommendations
- **LangGraph_Tool**: A callable function that agents can invoke to perform external operations like API calls or web searches
- **Location_Context**: Geographic information including country, city, latitude, and longitude extracted from user profile
- **Booking_Platform**: Healthcare appointment scheduling services (e.g., Zocdoc, Marham.pk, Practo)
- **E-commerce_Adapter**: Service that routes product searches to region-appropriate platforms (e.g., Amazon, Dawaai.pk, 1mg)
- **Provider_Matcher_Agent**: The agent responsible for finding healthcare providers
- **Product_Recommender_Agent**: The agent responsible for recommending medical products
- **Next_Steps_Generator_Agent**: The agent responsible for generating actionable next steps
- **Tool_Registry**: Central registry that manages available tools and their configurations
- **Region_Detector**: Service that determines appropriate platforms based on location

## Requirements

### Requirement 1: Location-Based Platform Detection

**User Story:** As a user from any country, I want the system to automatically detect my location and use appropriate local healthcare and e-commerce platforms, so that I receive relevant and actionable recommendations.

#### Acceptance Criteria

1. WHEN the Assessment_System receives a user request, THE Region_Detector SHALL extract the Location_Context from the user profile
2. THE Region_Detector SHALL determine the user's country code from the Location_Context
3. THE Region_Detector SHALL map the country code to appropriate Booking_Platform services for that region
4. THE Region_Detector SHALL map the country code to appropriate E-commerce_Adapter services for that region
5. WHERE the Location_Context is missing or invalid, THE Region_Detector SHALL default to generic international platforms

### Requirement 2: LangGraph Tool Integration

**User Story:** As a developer, I want agents to use LangGraph tools to perform dynamic searches and API calls, so that the system can retrieve real-time, location-specific information instead of using hardcoded data.

#### Acceptance Criteria

1. THE Assessment_System SHALL implement a Tool_Registry that manages all available LangGraph_Tool instances
2. THE Provider_Matcher_Agent SHALL bind to location-aware provider search tools
3. THE Product_Recommender_Agent SHALL bind to location-aware product search tools
4. THE Next_Steps_Generator_Agent SHALL bind to booking platform discovery tools
5. WHEN an agent needs external data, THE agent SHALL invoke the appropriate LangGraph_Tool with required parameters

### Requirement 3: Dynamic Provider Booking Platform Tool

**User Story:** As a user, I want to receive booking links for healthcare providers that work in my country, so that I can actually schedule appointments through familiar local platforms.

#### Acceptance Criteria

1. THE Assessment_System SHALL implement a booking platform discovery LangGraph_Tool
2. WHEN the Provider_Matcher_Agent finds healthcare providers, THE tool SHALL search for booking URLs on region-appropriate platforms
3. THE tool SHALL support multiple booking platforms including Zocdoc (US), Marham.pk (Pakistan), Practo (India), Doctolib (Europe), and HealthEngine (Australia)
4. THE tool SHALL accept provider name, specialty, and Location_Context as input parameters
5. THE tool SHALL return booking URLs and profile URLs specific to the detected region
6. WHERE no booking platform is available for a region, THE tool SHALL return the provider's direct website URL

### Requirement 4: Dynamic Product Search Tool

**User Story:** As a user, I want product recommendations with purchase links from e-commerce platforms available in my country, so that I can easily buy recommended medical products locally.

#### Acceptance Criteria

1. THE Assessment_System SHALL implement a product search LangGraph_Tool
2. THE tool SHALL route product searches to region-appropriate e-commerce platforms based on Location_Context
3. THE tool SHALL support Amazon (US, UK, international), Dawaai.pk (Pakistan), 1mg (India), Chemist Warehouse (Australia), and generic search fallback
4. WHEN the Product_Recommender_Agent recommends products, THE tool SHALL search for purchase URLs on the appropriate platform
5. THE tool SHALL return product name, description, price, purchase URL, and image URL
6. THE tool SHALL cache product search results for 24 hours to reduce API calls

### Requirement 5: Real-Time Web Search Tool

**User Story:** As a user, I want the system to search the web for current provider information and availability, so that I receive up-to-date and accurate recommendations.

#### Acceptance Criteria

1. THE Assessment_System SHALL implement a web search LangGraph_Tool using a search API (e.g., Serper, Brave Search)
2. THE tool SHALL accept search queries and Location_Context as parameters
3. THE tool SHALL return search results including titles, URLs, and snippets
4. THE Provider_Matcher_Agent SHALL use the web search tool to find provider contact information and booking details
5. THE tool SHALL limit results to a maximum of 5 entries to control token usage

### Requirement 6: Tool Error Handling and Fallbacks

**User Story:** As a user, I want the system to continue working even when external tools fail, so that I always receive some form of assessment results.

#### Acceptance Criteria

1. WHEN a LangGraph_Tool invocation fails, THE Assessment_System SHALL log the error with context
2. THE Assessment_System SHALL retry failed tool calls up to 2 times with exponential backoff
3. WHERE a tool fails after retries, THE agent SHALL continue with available data and mark the section as incomplete
4. THE Assessment_System SHALL return partial results with a warning message when tools fail
5. THE Assessment_System SHALL track tool success rates for monitoring

### Requirement 7: Tool Response Validation

**User Story:** As a developer, I want all tool responses to be validated before being used by agents, so that invalid or malicious data doesn't break the assessment flow.

#### Acceptance Criteria

1. THE Assessment_System SHALL validate all LangGraph_Tool responses against expected schemas
2. WHERE a tool returns invalid data, THE Assessment_System SHALL log a validation error and discard the response
3. THE Assessment_System SHALL sanitize URLs returned by tools to prevent injection attacks
4. THE Assessment_System SHALL verify that booking URLs and purchase URLs are from trusted domains
5. THE Assessment_System SHALL limit tool response sizes to prevent memory issues

### Requirement 8: Location-Aware Caching Strategy

**User Story:** As a system administrator, I want tool results to be cached based on location, so that users in the same region benefit from faster responses without redundant API calls.

#### Acceptance Criteria

1. THE Assessment_System SHALL implement location-aware cache keys for tool results
2. THE cache key format SHALL include tool name, parameters, and country code
3. THE Assessment_System SHALL cache provider booking platform results for 1 hour
4. THE Assessment_System SHALL cache product search results for 24 hours
5. THE Assessment_System SHALL cache web search results for 6 hours

### Requirement 9: Tool Configuration Management

**User Story:** As a developer, I want to configure tool settings (API keys, endpoints, rate limits) through environment variables, so that I can easily manage different environments and regions.

#### Acceptance Criteria

1. THE Assessment_System SHALL load tool configurations from environment variables
2. THE configuration SHALL include API keys for booking platforms, e-commerce APIs, and search APIs
3. THE configuration SHALL include rate limit settings for each tool
4. THE configuration SHALL include region-to-platform mappings
5. WHERE required configuration is missing, THE Assessment_System SHALL disable the corresponding tool and log a warning

### Requirement 10: Agent Prompt Updates for Tool Usage

**User Story:** As a developer, I want agent prompts to instruct the AI on when and how to use tools, so that agents make intelligent decisions about tool invocation.

#### Acceptance Criteria

1. THE Provider_Matcher_Agent prompt SHALL include instructions for using booking platform discovery tools
2. THE Product_Recommender_Agent prompt SHALL include instructions for using product search tools
3. THE Next_Steps_Generator_Agent prompt SHALL include instructions for using web search tools
4. THE prompts SHALL specify when to invoke tools versus when to use existing data
5. THE prompts SHALL include examples of tool usage patterns

### Requirement 11: Tool Performance Monitoring

**User Story:** As a system administrator, I want to monitor tool performance and usage, so that I can identify bottlenecks and optimize the system.

#### Acceptance Criteria

1. THE Assessment_System SHALL track execution time for each tool invocation
2. THE Assessment_System SHALL track success and failure rates for each tool
3. THE Assessment_System SHALL track cache hit rates for tool results
4. THE Assessment_System SHALL log tool usage statistics to the console
5. THE Assessment_System SHALL include tool metrics in the assessment response metadata

### Requirement 12: Multi-Region Testing Support

**User Story:** As a developer, I want to test the system with different location contexts, so that I can verify it works correctly for users worldwide.

#### Acceptance Criteria

1. THE Assessment_System SHALL accept an optional location override parameter for testing
2. THE test suite SHALL include test cases for US, Pakistan, India, UK, and Australia locations
3. THE test suite SHALL verify correct platform selection for each region
4. THE test suite SHALL verify tool invocations return region-appropriate results
5. THE test suite SHALL verify fallback behavior when region-specific platforms are unavailable
