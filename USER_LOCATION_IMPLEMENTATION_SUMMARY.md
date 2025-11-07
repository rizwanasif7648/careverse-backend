# User Location API - Implementation Summary

## ✅ What Was Implemented

### 1. New Files Created

#### Controllers
- **`src/controllers/user.controller.js`**
  - `getProfile()` - Get user profile
  - `updateProfile()` - Update user profile
  - `updateLocation()` - Update user location with validation
  - `getLocation()` - Get user location

#### Routes
- **`src/routes/user.routes.js`**
  - `GET /users/profile` - Get user profile
  - `PATCH /users/profile` - Update user profile
  - `GET /users/location` - Get user location
  - `PATCH /users/location` - Update user location

#### Documentation
- **`USER_LOCATION_API_DOCUMENTATION.md`** - Complete API reference
- **`LOCATION_API_QUICK_START.md`** - Quick start guide with examples
- **`test-user-location-api.js`** - Test script for all endpoints

### 2. Modified Files

#### Application Setup
- **`src/app.js`**
  - Added user routes import
  - Registered `/api/v1/users` endpoint

## 🔐 Authentication

All user endpoints require JWT authentication via the existing `authenticate` middleware:
```javascript
Authorization: Bearer <jwt_token>
```

## 📍 Location Data Structure

Location is stored as JSON in the User model:

```javascript
{
  lat: 40.7128,           // Required: -90 to 90
  lng: -74.0060,          // Required: -180 to 180
  city: "New York",       // Recommended
  state: "NY",            // Optional
  country: "United States", // Recommended
  countryCode: "US"       // Recommended
}
```

## 🎯 API Endpoints

### Update Location
```
PATCH /api/v1/users/location
```

**Request:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "city": "New York",
  "state": "NY",
  "country": "United States",
  "countryCode": "US"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "location": { ... }
  }
}
```

### Get Location
```
GET /api/v1/users/location
```

**Response:**
```json
{
  "success": true,
  "data": {
    "location": { ... }
  }
}
```

## ✨ Features

### Validation
- ✅ Latitude range: -90 to 90
- ✅ Longitude range: -180 to 180
- ✅ Required fields enforcement
- ✅ Type validation

### Security
- ✅ JWT authentication required
- ✅ User can only update their own location
- ✅ Proper error handling
- ✅ Input sanitization

### Logging
- ✅ All operations logged with user ID
- ✅ Error tracking
- ✅ Performance monitoring

## 🔄 Integration with Assessment System

The location data is automatically used by:

1. **Assessment Orchestrator** (`src/services/ai/orchestrator/index.js`)
   - Fetches location during assessment generation
   - Provides fallback if location is missing

2. **Provider Matcher** (`src/services/ai/agents/providerMatcher.js`)
   - Uses lat/lng for distance calculations
   - Uses city/country for booking search queries

3. **Product Recommender** (`src/services/ai/agents/productRecommender.js`)
   - Uses country/countryCode for region-specific products
   - Uses city for local availability

4. **Next Steps Generator** (`src/services/ai/agents/nextStepsGenerator.js`)
   - Uses all location fields for location-aware recommendations
   - Finds local emergency rooms, pharmacies, support groups

5. **Web Search Tool** (`src/services/ai/tools/webSearchTool.js`)
   - Uses country/countryCode for region-specific search results
   - Uses city for local results

## 📊 Location Field Priority

### Critical (Required)
- `latitude` ✓
- `longitude` ✓

### Highly Recommended
- `country` or `countryCode` ✓
- `city` ✓

### Optional
- `state`

## 🧪 Testing

### Manual Testing
```bash
# Run the test script
node test-user-location-api.js
```

### Test Coverage
- ✅ Login flow
- ✅ Update location (valid data)
- ✅ Get location
- ✅ Update profile
- ✅ Get profile
- ✅ Validation tests (invalid latitude, missing fields)

## 📝 Usage Examples

### JavaScript/Axios
```javascript
const axios = require('axios');

// Update location
await axios.patch(
  'http://localhost:3000/api/v1/users/location',
  {
    latitude: 40.7128,
    longitude: -74.0060,
    city: 'New York',
    country: 'United States',
    countryCode: 'US'
  },
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

### cURL
```bash
curl -X PATCH http://localhost:3000/api/v1/users/location \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "city": "New York",
    "country": "United States",
    "countryCode": "US"
  }'
```

## 🚀 Deployment Checklist

- [x] Controller implemented with validation
- [x] Routes configured with authentication
- [x] App.js updated with new routes
- [x] Documentation created
- [x] Test script created
- [x] Error handling implemented
- [x] Logging added
- [ ] Run test script to verify
- [ ] Update Postman collection (optional)
- [ ] Deploy to staging/production

## 🔍 Verification Steps

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Test the endpoints:**
   ```bash
   node test-user-location-api.js
   ```

3. **Verify in database:**
   - Check that location is saved as JSON in users table
   - Verify location structure matches expected format

4. **Test with assessment generation:**
   - Create an assessment after updating location
   - Verify location is used in provider/product recommendations

## 📚 Documentation Files

1. **`USER_LOCATION_API_DOCUMENTATION.md`**
   - Complete API reference
   - All endpoints documented
   - Request/response examples
   - Error codes
   - Postman collection

2. **`LOCATION_API_QUICK_START.md`**
   - Quick start guide
   - Common examples
   - JavaScript/React examples
   - Browser geolocation integration
   - Troubleshooting

3. **`test-user-location-api.js`**
   - Automated test script
   - Tests all endpoints
   - Validation testing
   - Easy to run and verify

## 🎉 Summary

The User Location API is now fully implemented and ready to use. Users can:

1. ✅ Update their location with lat/lng (required) and city/country (recommended)
2. ✅ Retrieve their current location
3. ✅ Update their profile information
4. ✅ Get their complete profile

The location data is automatically integrated into the assessment generation workflow to provide:
- 🏥 Nearby healthcare providers
- 💊 Region-specific product recommendations
- 📍 Location-aware next steps
- 🌍 Better search results

All endpoints are secured with JWT authentication and include proper validation, error handling, and logging.
