# Performance Verification Scripts

This directory contains scripts for verifying and testing the performance optimizations implemented in the AI Assessment Generation system.

## Available Scripts

### 1. Redis Caching Verification

**File:** `verify-redis-caching.js`

**Purpose:** Tests Redis caching implementation for provider searches and product recommendations.

**What it tests:**
- Redis connection and status
- Provider search caching (1-hour TTL)
- Product recommendation caching (24-hour TTL)
- TTL settings and countdown
- Cache hit rate monitoring

**How to run:**
```bash
node src/scripts/verify-redis-caching.js
```

**Expected output:**
```
=== Redis Caching Verification ===

Test 1: Redis Connection
✓ Redis connection successful
✓ Redis status: Connected

Test 2: Provider Search Caching
✓ First call completed in 3200ms
✓ Cache entry created successfully
✓ Second call completed in 150ms
✓ Cache hit was 95.3% faster
✓ Cached data matches original data

Test 3: Product Recommendation Caching
✓ First call completed in 2800ms
✓ Cache entry created successfully
✓ Second call completed in 120ms
✓ No tokens used on cache hit (as expected)
✓ Cache hit was 95.7% faster
✓ Cached data matches original data

Test 4: TTL Settings Verification
✓ Provider cache TTL is correct (1 hour)
✓ Product cache TTL is correct (24 hours)
✓ TTL is counting down

Test 5: Cache Hit Rate Monitoring
Cache Statistics:
  Hits: 2
  Misses: 3
  Hit Rate: 40.0%
✓ Cache hit rate is as expected

=== Test Summary ===
✓ All tests passed!
```

---

### 2. Query Performance Testing

**File:** `test-query-performance.js`

**Purpose:** Tests database query performance improvements from indexes and message limiting.

**What it tests:**
- Query performance with LIMIT 20 (optimized)
- Query performance without LIMIT (unoptimized)
- Performance improvement comparison

**How to run:**
```bash
node src/scripts/test-query-performance.js
```

**Expected output:**
```
=== Query Performance Testing ===

Using conversation: abc-123-def-456
Total messages: 30

Test 1: Query with LIMIT 20 (Optimized)
  Iteration 1: 45ms
  Iteration 2: 42ms
  Iteration 3: 44ms
  Iteration 4: 43ms
  Iteration 5: 45ms
  Average: 43.80ms

Test 2: Query without LIMIT (Unoptimized)
  Iteration 1: 68ms
  Iteration 2: 71ms
  Iteration 3: 69ms
  Iteration 4: 70ms
  Iteration 5: 72ms
  Average: 70.00ms

=== Performance Results ===
Query with LIMIT 20:    43.80ms (avg)
Query without LIMIT:    70.00ms (avg)

✓ Performance improvement: 37.4% faster with LIMIT

Benefits of LIMIT 20:
  • Faster query execution
  • Reduced memory usage
  • Lower token consumption in AI processing
  • Better scalability for conversations with many messages
```

---

### 3. Parallel Execution Verification

**File:** `verify-parallel-execution.js`

**Purpose:** Verifies parallel execution performance and ensures <15 second requirement is met.

**What it tests:**
- Actual parallel execution time (3 iterations)
- Sequential execution time estimate
- Time savings from parallelization
- Compliance with <15 second requirement

**How to run:**
```bash
node src/scripts/verify-parallel-execution.js
```

**Expected output:**
```
=== Parallel Execution Performance Verification ===

Using conversation: abc-123-def-456
User: user-789-ghi-012

Test 1: Parallel Execution Performance
Running iteration 1/3...
  ✓ Completed in 8.45s
  Waiting 5 seconds before next iteration...
Running iteration 2/3...
  ✓ Completed in 7.82s
  Waiting 5 seconds before next iteration...
Running iteration 3/3...
  ✓ Completed in 8.13s

Average execution time: 8.13s

Test 2: Sequential Execution Estimate
Estimated agent execution times:
  Symptom Extractor:     2000ms
  Medical Analyzer:      2500ms
  Provider Matcher:      3000ms
  Product Recommender:   2500ms
  Next Steps Generator:  1500ms

Sequential execution:  11.50s
Parallel execution:    9.00s

Test 3: Time Savings Calculation
Parallel execution:    8.13s
Sequential estimate:   11.50s
Time savings:          29.3%

✓ Good time savings (>20%)

Test 4: 15-Second Requirement Verification
Average execution time: 8.13s
Maximum execution time: 8.45s
Requirement:            15.00s

✓ Average time meets requirement (8.13s < 15s)
✓ Maximum time meets requirement (8.45s < 15s)

=== Performance Summary ===

Parallel Execution:
  Average: 8.13s
  Min:     7.82s
  Max:     8.45s

Time Savings: 29.3%
Meets <15s Requirement: ✓ YES

✓ All performance requirements met!
```

---

## Prerequisites

Before running these scripts, ensure:

1. **Database is set up and running:**
   ```bash
   # Run migrations
   npx sequelize-cli db:migrate
   ```

2. **Redis is running:**
   ```bash
   # Check Redis status
   redis-cli ping
   # Should return: PONG
   ```

3. **Environment variables are configured:**
   ```bash
   # Required variables in .env
   OPENAI_API_KEY=your_key_here
   REDIS_HOST=localhost
   REDIS_PORT=6379
   DATABASE_URL=your_database_url
   ```

4. **Dependencies are installed:**
   ```bash
   npm install
   ```

## Running All Tests

To run all verification scripts in sequence:

```bash
# Run Redis caching tests
node src/scripts/verify-redis-caching.js

# Run query performance tests
node src/scripts/test-query-performance.js

# Run parallel execution tests
node src/scripts/verify-parallel-execution.js
```

## Interpreting Results

### Success Criteria

All tests should show:
- ✓ Redis connection successful
- ✓ Cache hit rates of 40-60% in test scenarios
- ✓ Query performance improvement of 20-40%
- ✓ Parallel execution 30-40% faster than sequential
- ✓ Average execution time <15 seconds

### Common Issues

**Redis connection failed:**
- Ensure Redis is running: `redis-cli ping`
- Check Redis configuration in `.env`
- Verify Redis port is not blocked

**Query performance not improved:**
- Run database migrations: `npx sequelize-cli db:migrate`
- Check if indexes were created: `\d+ conversations` in psql
- Ensure test data exists

**Parallel execution too slow:**
- Check OpenAI API rate limits
- Verify Redis caching is working
- Check network latency
- Review token usage (should be optimized)

## Monitoring in Production

After deployment, monitor these metrics:

1. **Cache Hit Rates:**
   - Target: >50% for providers and products
   - Check logs for cache hit/miss events

2. **Execution Time:**
   - Target: <10 seconds average
   - Alert if >12 seconds

3. **Token Usage:**
   - Target: <3500 tokens per assessment
   - Alert if >4500 tokens

4. **Query Performance:**
   - Target: <100ms for conversation retrieval
   - Monitor slow query logs

## Additional Resources

- **Token Optimization Guide:** `src/docs/TOKEN_OPTIMIZATION.md`
- **Task 17 Summary:** `.kiro/specs/ai-assessment-generation/TASK_17_SUMMARY.md`
- **Design Document:** `.kiro/specs/ai-assessment-generation/design.md`
- **Requirements:** `.kiro/specs/ai-assessment-generation/requirements.md`
