# End-to-End Tests

This directory contains end-to-end tests for the Careverse AI Assessment Generation feature.

## Test Structure

### E2E Tests (`e2e/assessment.test.js`)

Comprehensive tests covering the entire assessment generation workflow:

1. **Test Conversations** - Various scenarios including:
   - Routine case (migraine symptoms)
   - Urgent case (severe allergic reaction)
   - Emergency case (chest pain)
   - Insufficient data case (single message)

2. **Successful Assessment Generation** - Tests for:
   - Complete workflow execution
   - Response structure validation
   - Database persistence
   - Different severity levels

3. **Error Scenarios** - Tests for:
   - Insufficient conversation data
   - Non-existent conversations
   - Unauthorized access
   - Missing parameters

4. **Assessment Retrieval** - Tests for:
   - Fetching by ID
   - Field completeness
   - Ownership validation
   - List retrieval

5. **Performance Testing** - Tests for:
   - Execution time (<15 seconds)
   - Token usage tracking
   - Concurrent request handling
   - Cache effectiveness

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run with coverage
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test -- assessment.test.js
```

## Prerequisites

Before running tests, ensure:

1. **Environment Variables** - Set up `.env` file with:
   - `OPENAI_API_KEY` - OpenAI API key
   - `PINECONE_API_KEY` - Pinecone API key
   - `PINECONE_ENVIRONMENT` - Pinecone environment
   - `PINECONE_INDEX_NAME` - Pinecone index name
   - `GOOGLE_PLACES_API_KEY` - Google Places API key
   - `REDIS_HOST` - Redis host
   - `REDIS_PORT` - Redis port
   - `JWT_SECRET` - JWT secret for authentication
   - Database configuration

2. **Database** - Test database should be set up and migrations run:
   ```bash
   npm run db:migrate
   ```

3. **Redis** - Redis server should be running

4. **External APIs** - API keys should be valid and have sufficient quota

## Test Data

Tests create and clean up their own data:
- Test user: `test@assessment.com`
- Multiple test conversations with different scenarios
- Assessments are created and deleted per test

## Notes

- Tests use real API calls (OpenAI, Pinecone, Google Places)
- Each test has a 30-second timeout to accommodate API latency
- Concurrent tests have a 60-second timeout
- Database is cleaned before and after each test
- Tests verify both API responses and database state

## Troubleshooting

### Tests timing out
- Check API key validity
- Verify network connectivity
- Ensure Redis is running
- Check database connection

### Database errors
- Run migrations: `npm run db:migrate`
- Check database credentials in `.env`
- Ensure test database exists

### Authentication errors
- Verify `JWT_SECRET` is set in `.env`
- Check token generation logic

### API errors
- Verify all API keys are valid
- Check API quota limits
- Review error logs for specific failures
