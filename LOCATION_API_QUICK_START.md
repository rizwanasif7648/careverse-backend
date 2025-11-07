# User Location API - Quick Start Guide

## 🚀 Quick Setup

The User Location API is now available at:
```
PATCH /api/v1/users/location
GET /api/v1/users/location
```

## 📋 What You Need

### Required Fields
- ✅ `latitude` (number, -90 to 90)
- ✅ `longitude` (number, -180 to 180)

### Recommended Fields (for better results)
- 🌍 `country` or `countryCode` (e.g., "US", "GB", "CA")
- 🏙️ `city` (e.g., "New York", "London")

### Optional Fields
- 📍 `state` (e.g., "NY", "California")

## 🔐 Authentication

All endpoints require JWT token:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 💡 Quick Examples

### Update Location (Minimal)
```bash
curl -X PATCH http://localhost:3000/api/v1/users/location \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

### Update Location (Recommended)
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

### Get Location
```bash
curl -X GET http://localhost:3000/api/v1/users/location \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🌐 JavaScript/React Example

```javascript
// Update location
const updateUserLocation = async (locationData) => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch('http://localhost:3000/api/v1/users/location', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        city: locationData.city,
        country: locationData.country,
        countryCode: locationData.countryCode
      })
    });
    
    const data = await response.json();
    console.log('Location updated:', data);
    return data;
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
};

// Get current location
const getUserLocation = async () => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch('http://localhost:3000/api/v1/users/location', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    return data.data.location;
  } catch (error) {
    console.error('Error getting location:', error);
    throw error;
  }
};
```

## 🗺️ Getting User's Browser Location

```javascript
// Get location from browser's Geolocation API
const getBrowserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      }
    );
  });
};

// Reverse geocode to get city/country (using a geocoding service)
const reverseGeocode = async (lat, lng) => {
  // Example using OpenStreetMap Nominatim (free)
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
  );
  const data = await response.json();
  
  return {
    city: data.address.city || data.address.town || data.address.village,
    state: data.address.state,
    country: data.address.country,
    countryCode: data.address.country_code?.toUpperCase()
  };
};

// Complete flow: Get browser location and update user location
const updateLocationFromBrowser = async () => {
  try {
    // Get coordinates from browser
    const coords = await getBrowserLocation();
    
    // Get city/country from coordinates
    const locationDetails = await reverseGeocode(coords.latitude, coords.longitude);
    
    // Update user location in database
    await updateUserLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      ...locationDetails
    });
    
    console.log('Location updated successfully!');
  } catch (error) {
    console.error('Failed to update location:', error);
  }
};
```

## 📍 Common Locations for Testing

```javascript
const testLocations = {
  newYork: {
    latitude: 40.7128,
    longitude: -74.0060,
    city: 'New York',
    state: 'NY',
    country: 'United States',
    countryCode: 'US'
  },
  london: {
    latitude: 51.5074,
    longitude: -0.1278,
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB'
  },
  toronto: {
    latitude: 43.6532,
    longitude: -79.3832,
    city: 'Toronto',
    state: 'Ontario',
    country: 'Canada',
    countryCode: 'CA'
  },
  sydney: {
    latitude: -33.8688,
    longitude: 151.2093,
    city: 'Sydney',
    state: 'New South Wales',
    country: 'Australia',
    countryCode: 'AU'
  }
};
```

## ✅ Testing

Run the test script:
```bash
node test-user-location-api.js
```

## 🎯 Why Location Matters

Your location data is used to provide:

1. **Nearby Healthcare Providers** - Find doctors within 25-50 miles
2. **Local Product Availability** - Region-specific medications and products
3. **Location-Aware Next Steps** - Local emergency rooms, pharmacies, support groups
4. **Better Search Results** - Country/city-specific web search results

## 🔒 Privacy

- Location is stored securely in your user profile
- Only used for generating personalized healthcare recommendations
- You can update or remove it anytime

## 📚 Full Documentation

See `USER_LOCATION_API_DOCUMENTATION.md` for complete API reference.

## 🐛 Troubleshooting

### "Latitude and longitude are required"
- Make sure you're sending both `latitude` and `longitude` in the request body

### "Latitude must be between -90 and 90"
- Check your latitude value is valid

### "No token provided"
- Include the JWT token in the Authorization header: `Bearer YOUR_TOKEN`

### "User not found"
- Your token might be expired or invalid - try logging in again

## 🆘 Support

For issues or questions, check the logs or contact the development team.
