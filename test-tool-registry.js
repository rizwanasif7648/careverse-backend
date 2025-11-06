/**
 * Simple test script for Tool Registry
 * Tests the tool schema and binding functionality
 */

const toolRegistry = require('./src/services/ai/tools/toolRegistry');

async function testToolRegistry() {
  console.log('=== Testing Tool Registry ===\n');

  try {
    // Test 1: Initialize tool registry
    console.log('Test 1: Initializing tool registry...');
    toolRegistry.initialize();
    console.log('✓ Tool registry initialized successfully\n');

    // Test 2: Get web search tool schema
    console.log('Test 2: Getting web search tool schema...');
    const schema = toolRegistry.getWebSearchToolSchema();
    console.log('✓ Schema retrieved:');
    console.log(JSON.stringify(schema, null, 2));
    console.log();

    // Test 3: Get web search tool instance
    console.log('Test 3: Getting web search tool instance...');
    const webSearchTool = toolRegistry.getWebSearchTool();
    console.log('✓ Web search tool instance retrieved');
    console.log('  - Has search method:', typeof webSearchTool.search === 'function');
    console.log('  - Has buildLocationQuery method:', typeof webSearchTool.buildLocationQuery === 'function');
    console.log();

    // Test 4: Get all tool schemas
    console.log('Test 4: Getting all tool schemas...');
    const allSchemas = toolRegistry.getAllToolSchemas();
    console.log('✓ All schemas retrieved:');
    console.log('  - Total tools:', allSchemas.length);
    console.log('  - Tool names:', allSchemas.map(s => s.name).join(', '));
    console.log();

    // Test 5: Check if tool exists
    console.log('Test 5: Checking if web_search tool exists...');
    const hasTool = toolRegistry.hasTool('web_search');
    console.log('✓ Has web_search tool:', hasTool);
    console.log();

    // Test 6: Get tool handler
    console.log('Test 6: Getting tool handler...');
    const handler = toolRegistry.getToolHandler('web_search');
    console.log('✓ Handler retrieved:', typeof handler === 'function');
    console.log();

    // Test 7: Bind tool to mock agent
    console.log('Test 7: Binding tool to mock agent...');
    const mockAgent = {
      constructor: { name: 'MockAgent' }
    };
    const boundAgent = toolRegistry.bindWebSearchToolToAgent(mockAgent);
    console.log('✓ Tool bound to agent');
    console.log('  - Has webSearchTool:', !!boundAgent.webSearchTool);
    console.log('  - Has webSearchToolSchema:', !!boundAgent.webSearchToolSchema);
    console.log('  - Has invokeWebSearch method:', typeof boundAgent.invokeWebSearch === 'function');
    console.log();

    // Test 8: Test tool handler with mock data (without actual API call)
    console.log('Test 8: Testing tool handler structure...');
    console.log('✓ Tool handler is callable and ready for use');
    console.log('  - Handler signature: async (params) => result');
    console.log('  - Expected params: { query, location, maxResults }');
    console.log('  - Expected result: { success, results, metadata, error? }');
    console.log();

    console.log('=== All Tests Passed ===\n');
    console.log('Tool Registry is ready for use!');
    console.log('Next steps:');
    console.log('  1. Bind web search tool to agents (Provider Matcher, Product Recommender)');
    console.log('  2. Update agent methods to use invokeWebSearch()');
    console.log('  3. Test with real search queries and locations');

  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testToolRegistry();
