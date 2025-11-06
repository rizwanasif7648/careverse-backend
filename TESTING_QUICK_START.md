# Testing Quick Start Guide

## 🚀 How to Test the Assessment Feature

You have **4 easy ways** to test the AI Assessment Generation feature:

---

## Option 1: Quick Bash Script (Fastest) ⚡

**Best for**: Quick validation that everything works

```bash
./quick-test.sh
```

This will:
- ✅ Register a new user
- ✅ Create a conversation
- ✅ Add symptom messages
- ✅ Generate an assessment
- ✅ Display the results

**Time**: ~10-20 seconds

---

## Option 2: Node.js Test Script (Most Detailed) 📊

**Best for**: Seeing detailed assessment results

```bash
# Test migraine scenario (default)
node test-assessment-simple.js

# Test allergic reaction scenario
node test-assessment-simple.js allergic

# Test emergency scenario
node test-assessment-simple.js emergency
```

This will:
- ✅ Show formatted assessment results
- ✅ Display all next steps
- ✅ Show provider recommendations
- ✅ Show product recommendations
- ✅ Display execution time

**Time**: ~10-20 seconds per scenario

---

## Option 3: Postman (Most Interactive) 🎯

**Best for**: Manual testing and experimentation

1. **Import Collection**:
   - Open Postman
   - Import `postman_collection.json`

2. **Set Environment**:
   - Create environment with `base_url`: `http://localhost:5000`

3. **Run Requests**:
   - Register → Login → Create Conversation → Add Messages → Generate Assessment

**See**: `POSTMAN_GUIDE.md` for detailed instructions

---

## Option 4: Automated Test Suite (Most Comprehensive) 🧪

**Best for**: Running all test scenarios at once

```bash
# Run all E2E tests
npm test -- --testPathPattern=assessment.test.js

# Run specific test suite
npm test -- --testPathPattern=assessment.test.js -t "18.2"
```

**Note**: Currently has a database schema issue that needs to be resolved first.

---

## Prerequisites ✅

Before testing, make sure:

1. **Server is running**:
   ```bash
   npm run dev
   ```

2. **Database is migrated**:
   ```bash
   npm run db:migrate
   ```

3. **Redis is running**:
   ```bash
   redis-server
   # or
   brew services start redis
   ```

4. **Environment variables are set** (`.env` file):
   ```
   OPENAI_API_KEY=your_key
   PINECONE_API_KEY=your_key
   GOOGLE_PLACES_API_KEY=your_key
   JWT_SECRET=your_secret
   ```

---

## Quick Test Examples

### Example 1: Test Migraine Symptoms
```bash
node test-assessment-simple.js migraine
```

**Expected Output**:
```
📋 ASSESSMENT RESULTS
🏥 Possible Condition: Migraine
📊 Severity: moderate
🎯 Confidence: high
📝 Next Steps: 3 recommendations
```

### Example 2: Test Emergency Symptoms
```bash
node test-assessment-simple.js emergency
```

**Expected Output**:
```
📋 ASSESSMENT RESULTS
🏥 Possible Condition: Acute Coronary Syndrome
📊 Severity: emergency
🎯 Confidence: high
⚠️  Red Flags Detected
📝 Next Steps: Immediate medical attention required
```

---

## What to Look For

### ✅ Successful Assessment Should Have:
- `assessmentId` (UUID)
- `possibleCondition` with name and description
- `severity` (routine/urgent/emergency)
- `confidence` (low/medium/high)
- `nextSteps` array (1-5 items)
- `disclaimer` text
- Execution time < 15 seconds

### ✅ Optional Fields (depending on scenario):
- `providers` array (nearby healthcare providers)
- `products` array (OTC product recommendations)
- `redFlags` array (for emergency cases)
- `warnings` array (for urgent cases)

---

## Troubleshooting

### Server not responding?
```bash
# Check if server is running
curl http://localhost:5000/health

# Should return: {"status":"ok"}
```

### Database errors?
```bash
# Run migrations
npm run db:migrate

# Check database connection
psql -d careverse_db -c "SELECT 1"
```

### Redis errors?
```bash
# Check if Redis is running
redis-cli ping

# Should return: PONG
```

### API errors?
- Check `.env` file has all required API keys
- Verify API keys are valid
- Check API quota limits

---

## Performance Benchmarks

Expected execution times:
- **Simple assessment**: 5-8 seconds
- **With providers**: 8-12 seconds  
- **With products**: 10-15 seconds
- **Emergency (minimal processing)**: 3-5 seconds

---

## Next Steps After Testing

1. ✅ Verify assessment accuracy
2. ✅ Test all three scenarios (routine, urgent, emergency)
3. ✅ Check provider recommendations are relevant
4. ✅ Verify product recommendations are appropriate
5. ✅ Confirm medical disclaimers are present
6. ✅ Monitor token usage and costs

---

## Additional Resources

- **Detailed Manual Testing**: See `MANUAL_TESTING_GUIDE.md`
- **API Documentation**: See `API_DOCUMENTATION.md`
- **Postman Guide**: See `POSTMAN_GUIDE.md`
- **Test Suite Documentation**: See `src/tests/README.md`
- **Architecture Details**: See `.kiro/specs/ai-assessment-generation/design.md`

---

## Quick Commands Reference

```bash
# Start server
npm run dev

# Run quick test
./quick-test.sh

# Test specific scenario
node test-assessment-simple.js [migraine|allergic|emergency]

# Run automated tests
npm test -- --testPathPattern=assessment.test.js

# Check server health
curl http://localhost:5000/health

# View server logs
npm run dev | grep "Assessment"
```

---

## Need Help?

1. Check server logs for errors
2. Review `MANUAL_TESTING_GUIDE.md` for detailed instructions
3. Check database and Redis connections
4. Verify all environment variables are set
5. Review API key quotas and limits
