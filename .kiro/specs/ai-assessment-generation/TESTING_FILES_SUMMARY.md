# Testing Files Summary

## Overview
Complete testing infrastructure created for manual and automated testing of the AI Assessment Generation feature.

## Files Created

### 1. Quick Start Guides

#### `TEST_NOW.md` ⚡
**Purpose**: Absolute fastest way to test
**Use when**: You want to test RIGHT NOW in 30 seconds
**Contains**:
- Single command to run
- Expected output examples
- Quick troubleshooting

#### `TESTING_QUICK_START.md` 🎯
**Purpose**: Overview of all testing methods
**Use when**: You want to choose the best testing method for your needs
**Contains**:
- 4 testing options comparison
- Quick examples for each method
- Performance benchmarks
- Command reference

#### `MANUAL_TESTING_GUIDE.md` 📚
**Purpose**: Comprehensive manual testing guide
**Use when**: You want detailed step-by-step instructions
**Contains**:
- Postman setup and workflow
- cURL command examples
- Test scenarios (routine, urgent, emergency)
- Monitoring and debugging tips
- Troubleshooting guide

### 2. Test Scripts

#### `quick-test.sh` 🚀
**Purpose**: Bash script for instant testing
**Language**: Bash
**Runtime**: ~10-20 seconds
**Features**:
- Registers new user
- Creates conversation
- Adds 3 symptom messages
- Generates assessment
- Displays results with colors
- Shows execution time

**Usage**:
```bash
chmod +x quick-test.sh
./quick-test.sh
```

#### `test-assessment-simple.js` 📊
**Purpose**: Node.js script with detailed output
**Language**: JavaScript (Node.js)
**Runtime**: ~10-20 seconds per scenario
**Features**:
- 3 pre-defined scenarios (migraine, allergic, emergency)
- Formatted output with emojis
- Detailed assessment breakdown
- Shows all fields (providers, products, next steps)
- Error handling

**Usage**:
```bash
# Default (migraine)
node test-assessment-simple.js

# Specific scenario
node test-assessment-simple.js emergency
node test-assessment-simple.js allergic
```

### 3. Automated Test Suite

#### `src/tests/e2e/assessment.test.js` 🧪
**Purpose**: Comprehensive E2E test suite
**Framework**: Jest + Supertest
**Test Count**: 16 tests across 5 categories
**Features**:
- Test data creation (4 scenarios)
- Successful generation tests
- Error scenario tests
- Retrieval tests
- Performance tests
- Concurrent request tests

**Usage**:
```bash
npm test -- --testPathPattern=assessment.test.js
```

#### `jest.config.js` ⚙️
**Purpose**: Jest configuration
**Features**:
- 30-second timeout for API calls
- Coverage configuration
- Test environment setup

#### `src/tests/README.md` 📖
**Purpose**: Test suite documentation
**Contains**:
- Test structure explanation
- Running instructions
- Prerequisites
- Troubleshooting

### 4. Documentation Updates

#### `README.md` (Updated) 📝
**Changes**:
- Added testing section
- Links to all testing guides
- Quick start commands
- Feature list updated

## Testing Methods Comparison

| Method | Speed | Detail | Interactivity | Best For |
|--------|-------|--------|---------------|----------|
| **quick-test.sh** | ⚡⚡⚡ | ⭐⭐ | ⭐ | Quick validation |
| **test-assessment-simple.js** | ⚡⚡ | ⭐⭐⭐ | ⭐⭐ | Detailed results |
| **Postman** | ⚡⚡ | ⭐⭐⭐ | ⭐⭐⭐ | Manual exploration |
| **Jest Tests** | ⚡ | ⭐⭐⭐ | ⭐ | Comprehensive coverage |

## Test Scenarios Included

### 1. Routine - Migraine
**Messages**:
- "I've been having really bad headaches lately."
- "The pain is usually on one side of my head, and it's throbbing. I also feel nauseous and sensitive to light."
- "They happen about 2-3 times a week and last for several hours."

**Expected**:
- Severity: moderate/routine
- Condition: Migraine
- Providers: Yes
- Products: Yes

### 2. Urgent - Allergic Reaction
**Messages**:
- "I ate something and now I have hives all over my body."
- "I have red, itchy welts on my arms, chest, and back. My throat feels a bit tight."
- "I had shrimp at a restaurant about 30 minutes ago."

**Expected**:
- Severity: urgent
- Condition: Allergic Reaction
- Warnings: Yes
- Immediate action required

### 3. Emergency - Chest Pain
**Messages**:
- "I'm having severe chest pain right now."
- "It's a crushing pain in the center of my chest. I'm also sweating a lot and feel short of breath."
- "The pain is radiating to my left arm."

**Expected**:
- Severity: emergency
- Condition: Acute Coronary Syndrome
- Red Flags: Yes
- Call 911 message

### 4. Insufficient Data
**Messages**:
- "Hello"

**Expected**:
- 400 error
- Message: Insufficient conversation data

## File Locations

```
careverse_backend/
├── TEST_NOW.md                          # Quickest start guide
├── TESTING_QUICK_START.md               # Testing methods overview
├── MANUAL_TESTING_GUIDE.md              # Detailed manual guide
├── quick-test.sh                        # Bash test script
├── test-assessment-simple.js            # Node.js test script
├── jest.config.js                       # Jest configuration
├── README.md                            # Updated with testing section
└── src/
    └── tests/
        ├── README.md                    # Test suite docs
        └── e2e/
            └── assessment.test.js       # E2E test suite
```

## Quick Commands Reference

```bash
# Fastest test
./quick-test.sh

# Detailed test with scenarios
node test-assessment-simple.js [migraine|allergic|emergency]

# Automated test suite
npm test -- --testPathPattern=assessment.test.js

# Specific test category
npm test -- --testPathPattern=assessment.test.js -t "18.2"

# Check server health
curl http://localhost:5000/health

# Start server
npm run dev

# Run migrations
npm run db:migrate
```

## Prerequisites Checklist

Before testing, ensure:
- [ ] Server running (`npm run dev`)
- [ ] Database migrated (`npm run db:migrate`)
- [ ] Redis running (`redis-server`)
- [ ] Environment variables set (`.env`)
  - [ ] OPENAI_API_KEY
  - [ ] PINECONE_API_KEY
  - [ ] GOOGLE_PLACES_API_KEY
  - [ ] JWT_SECRET

## Expected Results

### Successful Assessment Should Include:
- ✅ `assessmentId` (UUID)
- ✅ `possibleCondition` object
  - name
  - description
  - commonTriggers array
  - initialSelfCare array
- ✅ `severity` (routine/urgent/emergency)
- ✅ `confidence` (low/medium/high)
- ✅ `nextSteps` array (1-5 items)
- ✅ `disclaimer` text
- ✅ Execution time < 15 seconds

### Optional Fields (scenario-dependent):
- `providers` array (for routine/urgent)
- `products` array (for routine)
- `redFlags` array (for emergency)
- `warnings` array (for urgent)

## Performance Benchmarks

| Scenario | Expected Time | Agents Executed |
|----------|--------------|-----------------|
| Routine (with providers & products) | 10-15s | 6 agents |
| Urgent (with providers) | 8-12s | 5 agents |
| Emergency (minimal) | 3-5s | 3 agents |

## Next Steps

1. **Run quick test**: `./quick-test.sh`
2. **Try all scenarios**: Test migraine, allergic, emergency
3. **Review results**: Check assessment accuracy
4. **Test with Postman**: For more control
5. **Run automated tests**: For comprehensive coverage
6. **Monitor performance**: Check execution times
7. **Review logs**: Understand agent execution flow

## Troubleshooting

### Tests failing?
1. Check server is running
2. Verify database migrations
3. Ensure Redis is running
4. Validate API keys in `.env`
5. Check server logs for errors

### Slow performance?
1. Check API rate limits
2. Verify Redis caching is working
3. Review Pinecone connection
4. Check network latency

### Unexpected results?
1. Review conversation messages
2. Check agent execution logs
3. Verify RAG context retrieval
4. Test with different scenarios

## Documentation Links

- **Quick Start**: `TEST_NOW.md`
- **Testing Overview**: `TESTING_QUICK_START.md`
- **Manual Guide**: `MANUAL_TESTING_GUIDE.md`
- **Postman Guide**: `POSTMAN_GUIDE.md`
- **API Docs**: `API_DOCUMENTATION.md`
- **Test Suite**: `src/tests/README.md`
- **Design Spec**: `.kiro/specs/ai-assessment-generation/design.md`
- **Requirements**: `.kiro/specs/ai-assessment-generation/requirements.md`
