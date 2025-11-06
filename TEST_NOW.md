# 🚀 Test the Assessment Feature NOW!

## Fastest Way to Test (30 seconds)

### Step 1: Make sure server is running
```bash
npm run dev
```

### Step 2: Run the quick test
```bash
./quick-test.sh
```

That's it! You'll see:
- ✅ User registration
- ✅ Conversation creation
- ✅ Messages added
- ✅ Assessment generated
- ✅ Full results displayed

---

## Want More Control? Use Node.js Script

### Test Different Scenarios:

**Migraine (Routine)**
```bash
node test-assessment-simple.js migraine
```

**Allergic Reaction (Urgent)**
```bash
node test-assessment-simple.js allergic
```

**Chest Pain (Emergency)**
```bash
node test-assessment-simple.js emergency
```

---

## What You'll See

### Example Output:
```
📋 ASSESSMENT RESULTS
================================================================================

🆔 Assessment ID: 123e4567-e89b-12d3-a456-426614174000
⏱️  Generation Time: 8.5s
📊 Severity: moderate
🎯 Confidence: high

🏥 Possible Condition: Migraine
   Description: A neurological condition characterized by intense, 
   debilitating headaches often accompanied by nausea and sensitivity to light.
   
   Common Triggers:
     • Stress and anxiety
     • Lack of sleep
     • Certain foods and drinks
     • Hormonal changes

📝 Next Steps (3):
   1. Schedule Primary Care Visit
      Book an appointment with your primary care physician for evaluation
      Action: view_providers
      
   2. Try Over-the-Counter Relief
      Consider OTC pain relievers and rest in a dark, quiet room
      Action: view_products
      
   3. Track Your Symptoms
      Keep a headache diary to identify triggers
      Action: external_link

🏥 Healthcare Providers (5):
   1. Dr. Smith - Family Medicine
      123 Main St, San Francisco, CA
      Distance: 0.5 miles
      
   2. City Medical Center
      456 Oak Ave, San Francisco, CA
      Distance: 1.2 miles

💊 Product Recommendations (3):
   1. Excedrin Migraine
      Fast-acting migraine relief with acetaminophen, aspirin, and caffeine
      
   2. Advil Migraine
      Ibuprofen-based migraine relief

⚠️  Disclaimer: This assessment is for informational purposes only...
================================================================================
```

---

## Troubleshooting

### "Connection refused"
Server not running. Start it:
```bash
npm run dev
```

### "Database error"
Run migrations:
```bash
npm run db:migrate
```

### "Redis error"
Start Redis:
```bash
redis-server
# or
brew services start redis
```

### "API key error"
Check your `.env` file has:
```
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
GOOGLE_PLACES_API_KEY=...
```

---

## Next Steps

After testing:

1. **Try all 3 scenarios** to see different severity levels
2. **Check the database** to see stored assessments
3. **Review the logs** to see agent execution
4. **Test with Postman** for more control
5. **Run automated tests** for comprehensive coverage

---

## More Testing Options

- **Detailed Guide**: `MANUAL_TESTING_GUIDE.md`
- **Quick Start**: `TESTING_QUICK_START.md`
- **Postman**: `POSTMAN_GUIDE.md`
- **Automated Tests**: `src/tests/README.md`

---

## Questions?

Check the logs:
```bash
# Server logs show detailed execution
npm run dev

# Look for these log messages:
# - "Assessment generation requested"
# - "AssessmentOrchestrator: Starting"
# - Agent execution logs
# - "Assessment saved successfully"
```

---

**Ready? Let's test!**

```bash
./quick-test.sh
```
