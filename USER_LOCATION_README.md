# User Location API - Complete Implementation

## 📦 What's Included

This implementation provides a complete API for managing user location data with JWT authentication.

### Files Created

#### Backend Implementation
- ✅ `src/controllers/user.controller.js` - User controller with location management
- ✅ `src/routes/user.routes.js` - User routes with authentication
- ✅ `src/app.js` - Updated with user routes

#### Documentation
- ✅ `USER_LOCATION_API_DOCUMENTATION.md` - Complete API reference
- ✅ `LOCATION_API_QUICK_START.md` - Quick start guide
- ✅ `USER_LOCATION_IMPLEMENTATION_SUMMARY.md` - Implementation details

#### Testing
- ✅ `test-user-location-api.js` - Automated test script
- ✅ `user-location-api.postman_collection.json` - Postman collection

## 🚀 Quick Start

### 1. Start Your Server
```bash
npm start
```

### 2. Test the API
```bash
node test-user-location-api.js
```

### 3. Import Postman Collection
Import `user-location-api.postman_collection.json` into Postman for easy testing.

## 📍 API Endpoints

All endpoints require JWT authentication: `Authorization: Bearer <token>`

### Location Management
- `PATCH /api/v1/users/location` - Update user location
- `GET /api/v1/users/location` - Get user location

### Profile Management
- `PATCH /api/v1/users/profile` - Update user profile
- `GET /api/v1/users/profile` - Get user profile

## 💡 Quick Example

```javascript
// Update location
const response = await fetch('http://localhost:3000/api/v1/users/location', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    latitude: 40.7128,
    longitude: -74.0060,
    city: 'New York',
    country: 'United States',
    countryCode: 'US'
  })
});

const data = await response.json();
console.log(data);
```

## 📋 Location Data Structure

### Required Fields
- `latitude` (number, -90 to 90) ✓
- `longitude` (number, -180 to 180) ✓

### Recommended Fields
- `country` or `countryCode` (string) - For better search results
- `city` (string) - For local recommendations

### Optional Fields
- `state` (string) - For display purposes

## 🎯 Why Location Matters

Location data is used throughout the assessment system:

1. **Provider Matching** - Find nearby healthcare providers (25-50 mile radius)
2. **Product Recommendations** - Region-specific medications and products
3. **Next Steps** - Local emergency rooms, pharmacies, support groups
4. **Web Search** - Country/city-specific search results

## 📚 Documentation

### For Developers
- **`USER_LOCATION_API_DOCUMENTATION.md`** - Complete API reference with all endpoints, request/response formats, and error codes

### For Quick Reference
- **`LOCATION_API_QUICK_START.md`** - Quick examples, common use cases, and troubleshooting

### For Implementation Details
- **`USER_LOCATION_IMPLEMENTATION_SUMMARY.md`** - Technical implementation details and integration points

## 🧪 Testing

### Automated Testing
```bash
node test-user-location-api.js
```

This will test:
- ✅ Login flow
- ✅ Update location
- ✅ Get location
- ✅ Update profile
- ✅ Get profile
- ✅ Validation (invalid data)

### Manual Testing with Postman
1. Import `user-location-api.postman_collection.json`
2. Update the `baseUrl` variable if needed
3. Run the "Login" request first (saves token automatically)
4. Test other endpoints

### Manual Testing with cURL
```bash
# Login first
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}' \
  | jq -r '.data.token')

# Update location
curl -X PATCH http://localhost:3000/api/v1/users/location \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "city": "New York",
    "country": "United States",
    "countryCode": "US"
  }'

# Get location
curl -X GET http://localhost:3000/api/v1/users/location \
  -H "Authorization: Bearer $TOKEN"
```

## 🔐 Security

- ✅ JWT authentication required for all endpoints
- ✅ Users can only access/update their own data
- ✅ Input validation (latitude/longitude ranges)
- ✅ Proper error handling
- ✅ Secure password handling (existing auth system)

## 🔄 Integration

The location data is automatically integrated with:

1. **Assessment Orchestrator** - Fetches location during assessment generation
2. **Provider Matcher** - Uses coordinates for distance calculations
3. **Product Recommender** - Uses country for region-specific products
4. **Next Steps Generator** - Uses all fields for location-aware recommendations
5. **Web Search Tool** - Uses country/city for better search results

No additional code changes needed - it just works!

## 📊 Database

Location is stored as JSON in the `users` table:

```sql
-- Example location data in database
{
  "lat": 40.7128,
  "lng": -74.0060,
  "city": "New York",
  "state": "NY",
  "country": "United States",
  "countryCode": "US"
}
```

## 🐛 Troubleshooting

### "No token provided"
- Make sure you're including the Authorization header
- Format: `Authorization: Bearer <token>`

### "Latitude and longitude are required"
- Both fields must be included in the request body
- They must be numbers, not strings

### "Latitude must be between -90 and 90"
- Check your latitude value
- Valid range: -90 (South Pole) to 90 (North Pole)

### "Longitude must be between -180 and 180"
- Check your longitude value
- Valid range: -180 (West) to 180 (East)

### "User not found"
- Your token might be expired
- Try logging in again to get a fresh token

## 🌍 Common Test Locations

```javascript
// New York, USA
{ latitude: 40.7128, longitude: -74.0060, city: "New York", countryCode: "US" }

// London, UK
{ latitude: 51.5074, longitude: -0.1278, city: "London", countryCode: "GB" }

// Toronto, Canada
{ latitude: 43.6532, longitude: -79.3832, city: "Toronto", countryCode: "CA" }

// Sydney, Australia
{ latitude: -33.8688, longitude: 151.2093, city: "Sydney", countryCode: "AU" }
```

## ✅ Verification Checklist

- [ ] Server is running
- [ ] Test script passes: `node test-user-location-api.js`
- [ ] Can login and get token
- [ ] Can update location with valid data
- [ ] Can retrieve location
- [ ] Validation rejects invalid data
- [ ] Location is used in assessment generation
- [ ] Postman collection works (optional)

## 🎉 You're All Set!

The User Location API is ready to use. Users can now:

1. Update their location (required: lat/lng, recommended: city/country)
2. Get their current location
3. Update their profile
4. Get their complete profile

The location data will automatically enhance:
- Healthcare provider recommendations (nearby doctors)
- Product recommendations (region-specific)
- Next steps (local resources)
- Search results (location-aware)

## 📞 Support

For questions or issues:
1. Check the troubleshooting section above
2. Review the complete documentation in `USER_LOCATION_API_DOCUMENTATION.md`
3. Check the logs for detailed error messages
4. Contact the development team

---

**Happy coding! 🚀**
