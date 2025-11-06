/**
 * Tool Registry
 * Manages LangGraph tools and binds them to agents
 * Provides tool schemas and wrappers for agent invocation
 */

const WebSearchTool = require('./webSearchTool');
const logger = require('../../../config/logger');

/**
 * Web Search Tool Schema for LangGraph
 * Defines the structure and parameters for the web search tool
 */
const webSearchToolSchema = {
  name: 'web_search',
  description: 'Search the web to find current information about healthcare providers, booking platforms, medical products, or health resources. Use this to find location-specific booking links, product purchase URLs, and provider information. The tool performs intelligent searches with location context and returns relevant URLs with titles and snippets.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query - be specific and include relevant context. Examples: "book appointment cardiologist", "buy ibuprofen online", "emergency care near me"'
      },
      location: {
        type: 'object',
        description: 'User location context for localized search results',
        properties: {
          country: {
            type: 'string',
            description: 'Full country name (e.g., "United States", "Pakistan", "India")'
          },
          city: {
            type: 'string',
            description: 'City name (e.g., "New York", "Lahore", "Mumbai")'
          },
          countryCode: {
            type: 'string',
            description: 'ISO 3166-1 alpha-2 country code (e.g., "US", "PK", "IN")'
          }
        },
        required: ['countryCode']
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of search results to return (default: 5, max: 10)',
        default: 5
      }
    },
    required: ['query', 'location']
  }
};

class ToolRegistry {
  constructor() {
    this.webSearchTool = null;
    this.tools = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the tool registry
   * Creates tool instances and registers them
   */
  initialize() {
    if (this.initialized) {
      logger.debug('ToolRegistry: Already initialized');
      return;
    }

    try {
      // Initialize web search tool
      this.webSearchTool = new WebSearchTool();
      
      // Register web search tool
      this.tools.set('web_search', {
        schema: webSearchToolSchema,
        instance: this.webSearchTool,
        handler: this.createWebSearchHandler()
      });

      this.initialized = true;
      logger.info('ToolRegistry: Initialized successfully', {
        toolCount: this.tools.size,
        tools: Array.from(this.tools.keys())
      });
    } catch (error) {
      logger.error('ToolRegistry: Initialization failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get web search tool schema for LangGraph
   * @returns {Object} Web search tool schema
   */
  getWebSearchToolSchema() {
    return webSearchToolSchema;
  }

  /**
   * Get web search tool instance
   * @returns {WebSearchTool} Web search tool instance
   */
  getWebSearchTool() {
    if (!this.initialized) {
      this.initialize();
    }
    return this.webSearchTool;
  }

  /**
   * Create web search handler function
   * This handler wraps the web search tool for agent invocation
   * @returns {Function} Web search handler
   */
  createWebSearchHandler() {
    return async (params) => {
      const startTime = Date.now();
      
      try {
        logger.info('ToolRegistry: Web search invoked', {
          query: params.query,
          location: params.location?.countryCode,
          maxResults: params.maxResults
        });

        // Validate parameters
        if (!params.query || !params.location) {
          throw new Error('Missing required parameters: query and location are required');
        }

        // Invoke web search tool
        const result = await this.webSearchTool.search(params);

        const executionTime = Date.now() - startTime;
        
        logger.info('ToolRegistry: Web search completed', {
          success: result.success,
          resultsCount: result.results?.length || 0,
          executionTimeMs: executionTime,
          cached: result.metadata?.cached
        });

        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        logger.error('ToolRegistry: Web search handler failed', {
          error: error.message,
          stack: error.stack,
          executionTimeMs: executionTime,
          params: {
            query: params.query,
            location: params.location?.countryCode
          }
        });

        // Return error response
        return {
          success: false,
          results: [],
          metadata: {
            query: params.query,
            location: params.location?.countryCode,
            executionTimeMs: executionTime,
            cached: false
          },
          error: {
            code: 'TOOL_HANDLER_ERROR',
            message: error.message
          }
        };
      }
    };
  }

  /**
   * Bind web search tool to an agent
   * Adds the web search tool to the agent instance
   * @param {Object} agent - Agent instance to bind tool to
   * @returns {Object} Agent with bound tool
   */
  bindWebSearchToolToAgent(agent) {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      // Add web search tool to agent
      agent.webSearchTool = this.webSearchTool;
      
      // Add tool schema for reference
      agent.webSearchToolSchema = webSearchToolSchema;
      
      // Add convenience method for invoking web search
      agent.invokeWebSearch = async (params) => {
        const handler = this.tools.get('web_search').handler;
        return await handler(params);
      };

      logger.info('ToolRegistry: Web search tool bound to agent', {
        agentName: agent.constructor.name
      });

      return agent;
    } catch (error) {
      logger.error('ToolRegistry: Failed to bind tool to agent', {
        error: error.message,
        agentName: agent.constructor?.name
      });
      throw error;
    }
  }

  /**
   * Get all registered tools
   * @returns {Array} Array of tool schemas
   */
  getAllToolSchemas() {
    if (!this.initialized) {
      this.initialize();
    }

    return Array.from(this.tools.values()).map(tool => tool.schema);
  }

  /**
   * Get tool by name
   * @param {string} toolName - Name of the tool
   * @returns {Object|null} Tool object or null if not found
   */
  getTool(toolName) {
    if (!this.initialized) {
      this.initialize();
    }

    return this.tools.get(toolName) || null;
  }

  /**
   * Check if a tool is registered
   * @param {string} toolName - Name of the tool
   * @returns {boolean} True if tool is registered
   */
  hasTool(toolName) {
    if (!this.initialized) {
      this.initialize();
    }

    return this.tools.has(toolName);
  }

  /**
   * Get tool handler by name
   * @param {string} toolName - Name of the tool
   * @returns {Function|null} Tool handler function or null
   */
  getToolHandler(toolName) {
    if (!this.initialized) {
      this.initialize();
    }

    const tool = this.tools.get(toolName);
    return tool ? tool.handler : null;
  }
}

// Export singleton instance
const toolRegistry = new ToolRegistry();

module.exports = toolRegistry;
module.exports.ToolRegistry = ToolRegistry;
module.exports.webSearchToolSchema = webSearchToolSchema;
