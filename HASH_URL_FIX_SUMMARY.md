# Hash URL Fix Summary

## Problem

The Next Steps Generator was returning `#` (hash) URLs for some next steps, particularly for:
- General wellness recommendations (e.g., "Explore Lifestyle Changes", "Join Wellness Program")
- Steps when user location data was missing
- External link action types that didn't match specific keywords

Example problematic response:
```json
{
  "title": "Explore Lifestyle Changes",
  "description": "Consider lifestyle modifications...",
  "icon": "calendar",
  "actionType": "external_link",
  "url": "#"
}
```

## Root Cause

The issue occurred in the `enrichStepsWithLocationAwareUrls` method in `nextStepsGenerator.js`:

1. **Limited keyword matching**: The code only searched for location-specific resources if the step title included specific keywords (clinic, hospital, pharmacy, urgent care, health center)
2. **No fallback for general topics**: For general wellness topics (lifestyle, stress, exercise, diet), the code fell back to `#` instead of searching or using reputable health sources
3. **Missing location fallback**: When user location data was missing, `view_providers` and `view_products` action types fell back to `#` instead of generic search URLs

## Solution

### 1. Enhanced External Link Handling

Updated the `external_link` case to:
- Check if OpenAI provided a valid URL first (use it if available)
- Build intelligent search queries based on topic keywords:
  - Lifestyle → "healthy lifestyle tips"
  - Stress → "stress management techniques"
  - Wellness/Program → "wellness program [condition] [location]"
  - Support/Group → "[condition] support group [location]"
  - Exercise → "exercise recommendations [condition]"
  - Diet/Nutrition → "nutrition advice [condition]"
  - Sleep → "sleep hygiene tips"
- Perform web search with location-aware queries
- Fallback to reputable health sources if search fails:
  - Lifestyle: Mayo Clinic Healthy Lifestyle
  - Stress: Mayo Clinic Stress Management
  - Exercise: CDC Physical Activity
  - Diet: Nutrition.gov
  - Sleep: CDC Sleep Hygiene
  - Default: Mayo Clinic homepage

### 2. Location Fallback for Providers

When location data is missing:
- Use generic Google search: `find [specialty] near me`
- Allows users to find providers based on their browser location

### 3. Location Fallback for Products

When location data is missing:
- Use generic Google search: `buy [condition] online`
- Provides general product search results

### 4. Updated OpenAI Prompt

Modified the system prompt to instruct OpenAI to:
- ALWAYS provide reputable health information URLs for `external_link` action types
- Use sources like Mayo Clinic, CDC, WebMD, Healthline
- Leave URLs empty for `view_providers` and `view_products` (system handles these)

## Testing

Created comprehensive tests to verify the fix:

### Test 1: No Hash URLs (`test-next-steps-no-hash-urls.js`)
- Tests post-exertional fatigue scenario with lifestyle recommendations
- Verifies all steps have valid URLs (no `#` or empty URLs)
- ✅ PASSED

### Test 2: Fallback URLs (`test-next-steps-fallback-urls.js`)
- Tests stress/anxiety scenario with NO location data
- Verifies fallback URLs are used when web search fails
- ✅ PASSED

### Test 3: Location-Aware URLs (`test-next-steps-location-aware.js`)
- Tests multiple locations (US, Pakistan, UK)
- Verifies location-specific URLs are discovered
- ✅ PASSED

## Results

### Before Fix
```json
{
  "title": "Explore Lifestyle Changes",
  "url": "#"  // ❌ Invalid
}
```

### After Fix
```json
{
  "title": "Explore Lifestyle Changes",
  "url": "https://www.mayoclinic.org/healthy-lifestyle"  // ✅ Valid
}
```

## URL Priority Logic

For each action type, the system now follows this priority:

### external_link
1. OpenAI-provided URL (if valid HTTP URL)
2. Web search result (topic + location)
3. Fallback to reputable health source (Mayo Clinic, CDC, etc.)

### view_providers
1. Web search result (specialty + location)
2. Generic Google search (if no location)

### view_products
1. Web search result (condition + location)
2. Generic Google search (if no location)

### emergency
1. Web search result (emergency room + location)
2. Frontend route `/emergency-care` (if no location)

## Impact

- ✅ No more `#` URLs in Next Steps
- ✅ All external links point to reputable health sources
- ✅ Graceful fallback when location data is missing
- ✅ Better user experience with actionable URLs
- ✅ Works globally for users in any country

## Files Modified

1. `src/services/ai/agents/nextStepsGenerator.js`
   - Enhanced `enrichStepsWithLocationAwareUrls` method
   - Added intelligent topic detection and search query building
   - Added fallback URLs for common health topics
   - Added location fallback for providers and products

2. `src/services/ai/prompts/nextStepsGeneration.js`
   - Updated system prompt to require URLs for external_link
   - Clarified URL requirements in function schema
   - Emphasized use of reputable health sources

## Monitoring

To monitor URL quality in production:

```javascript
// Check logs for fallback usage
grep "Using fallback URL" logs/app.log

// Check for any remaining hash URLs (should be zero)
grep '"url":"#"' logs/app.log
```

## Future Improvements

1. **URL Validation**: Add URL validation to ensure all URLs are accessible
2. **URL Caching**: Cache fallback URLs to reduce API calls
3. **Regional Health Sources**: Use region-specific health authorities (NHS for UK, CDC for US, etc.)
4. **URL Quality Scoring**: Rank search results by domain authority and relevance
