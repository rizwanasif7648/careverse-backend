# User Location API Documentation

## Overview

This API allows authenticated users to manage their location data, which is used to provide location-aware healthcare recommendations including nearby providers, local products, and region-specific next steps.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Update User Location

Updates the authenticated user's location information.

**Endpoint:** `PATCH /users/location`

**Authentication:** Required

**Request Body:**

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

**Required Fields:**
- `latitude` (number): Latitude coordinate (-90 to 90)
- `longitude` (number): Longitude coordinate (-180 to 180)

**Optional Fields:**
- `city` (string): City name
- `state` (string): State/province name
- `country` (string): Country name
- `countryCode` (string): ISO country code (e.g., "US", "UK", "CA")

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "location": {
      "lat": 40.7128,
      "lng": -74.0060,
      "city": "New York",
      "state": "NY",
      "country": "United States",
      "countryCode": "US"
    }
  }
}
```

**Error Responses:**

```json
// 400 Bad Request - Missing required fields
{
  "success": false,
  "message": "Latitude and longitude are required"
}

// 400 Bad Request - Invalid latitude
{
  "success": false,
  "message": "Latitude must be between -90 and 90"
}

// 400 Bad Request - Invalid longitude
{
  "success": false,
  "message": "Longitude must be between -180 and 180"
}

// 401 Unauthorized - No token or invalid token
{
  "success": false,
  "message": "No token provided. Authorization denied."
}

// 404 Not Found - User not found
{
  "success": false,
  "message": "User not found"
}
```

**cURL Example:**

```bash
curl -X PATCH http://localhost:3000/api/v1/users/location \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "city": "New York",
    "state": "NY",
    "country": "United States",
    "countryCode": "US"
  }'
```

**JavaScript Example:**

```javascript
const axios = require('axios');

const updateLocation = async (token) => {
  try {
    const response = await axios.patch(
      'http://localhost:3000/api/v1/users/location',
      {
        latitude: 40.7128,
        longitude: -74.0060,
        city: 'New York',
        state: 'NY',
        country: 'United States',
        countryCode: 'US'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Location updated:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};
```

---

### 2. Get User Location

Retrieves the authenticated user's current location.

**Endpoint:** `GET /users/location`

**Authentication:** Required

**Request Body:** None

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "location": {
      "lat": 40.7128,
      "lng": -74.0060,
      "city": "New York",
      "state": "NY",
      "country": "United States",
      "countryCode": "US"
    }
  }
}
```

**If no location is set:**

```json
{
  "success": true,
  "data": {
    "location": null
  }
}
```

**Error Responses:**

```json
// 401 Unauthorized
{
  "success": false,
  "message": "No token provided. Authorization denied."
}

// 404 Not Found
{
  "success": false,
  "message": "User not found"
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:3000/api/v1/users/location \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript Example:**

```javascript
const axios = require('axios');

const getLocation = async (token) => {
  try {
    const response = await axios.get(
      'http://localhost:3000/api/v1/users/location',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Current location:', response.data.data.location);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};
```

---

### 3. Update User Profile

Updates the authenticated user's profile information.

**Endpoint:** `PATCH /users/profile`

**Authentication:** Required

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "gender": "male",
  "phone": "+1234567890",
  "medicalHistory": [
    {
      "type": "condition",
      "name": "Asthma",
      "diagnosedDate": "2015-03-20"
    }
  ]
}
```

**All Fields are Optional:**
- `firstName` (string): User's first name
- `lastName` (string): User's last name
- `dateOfBirth` (string): Date of birth (ISO format)
- `gender` (string): Gender (male, female, other, prefer_not_to_say)
- `phone` (string): Phone number
- `medicalHistory` (array): Medical history records

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-15",
      "gender": "male",
      "phone": "+1234567890",
      "location": { ... },
      "medicalHistory": [ ... ],
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-02T00:00:00.000Z"
    }
  }
}
```

---

### 4. Get User Profile

Retrieves the authenticated user's complete profile.

**Endpoint:** `GET /users/profile`

**Authentication:** Required

**Request Body:** None

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-15",
      "gender": "male",
      "phone": "+1234567890",
      "location": {
        "lat": 40.7128,
        "lng": -74.0060,
        "city": "New York",
        "state": "NY",
        "country": "United States",
        "countryCode": "US"
      },
      "medicalHistory": [],
      "isActive": true,
      "lastLogin": "2024-01-02T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-02T00:00:00.000Z"
    }
  }
}
```

---

## Location Data Usage

The location data you provide is used throughout the assessment generation process:

### 1. Provider Matching
- **latitude/longitude**: Used for distance calculations to find nearby healthcare providers
- **city/country**: Used to build location-specific search queries for booking platforms

### 2. Product Recommendations
- **country/countryCode**: Used to find region-specific product availability and purchase links
- **city**: Used to enhance product search relevance

### 3. Next Steps Generation
- **All fields**: Used to generate location-aware next steps including:
  - Finding nearby emergency rooms
  - Locating local pharmacies
  - Discovering regional support groups
  - Accessing country-specific health resources

### 4. Web Search Enhancement
- **country/countryCode**: Prioritizes search results from your region
- **city**: Provides more specific local results

---

## Location Priority

### Critical (Required for core functionality):
- `latitude` ✓ Required
- `longitude` ✓ Required

### Highly Recommended (Better results):
- `country` or `countryCode` ✓ Recommended
- `city` ✓ Recommended

### Optional (Display only):
- `state`

---

## Common Location Examples

### United States - New York
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

### United Kingdom - London
```json
{
  "latitude": 51.5074,
  "longitude": -0.1278,
  "city": "London",
  "country": "United Kingdom",
  "countryCode": "GB"
}
```

### Canada - Toronto
```json
{
  "latitude": 43.6532,
  "longitude": -79.3832,
  "city": "Toronto",
  "state": "Ontario",
  "country": "Canada",
  "countryCode": "CA"
}
```

### Australia - Sydney
```json
{
  "latitude": -33.8688,
  "longitude": 151.2093,
  "city": "Sydney",
  "state": "New South Wales",
  "country": "Australia",
  "countryCode": "AU"
}
```

---

## Testing

Run the test script to verify the API:

```bash
# Update test credentials in test-user-location-api.js
node test-user-location-api.js
```

---

## Postman Collection

Import the following into Postman:

```json
{
  "info": {
    "name": "User Location API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Update Location",
      "request": {
        "method": "PATCH",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"latitude\": 40.7128,\n  \"longitude\": -74.0060,\n  \"city\": \"New York\",\n  \"state\": \"NY\",\n  \"country\": \"United States\",\n  \"countryCode\": \"US\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/users/location",
          "host": ["{{baseUrl}}"],
          "path": ["users", "location"]
        }
      }
    },
    {
      "name": "Get Location",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/users/location",
          "host": ["{{baseUrl}}"],
          "path": ["users", "location"]
        }
      }
    },
    {
      "name": "Update Profile",
      "request": {
        "method": "PATCH",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"firstName\": \"John\",\n  \"lastName\": \"Doe\",\n  \"phone\": \"+1234567890\",\n  \"gender\": \"male\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/users/profile",
          "host": ["{{baseUrl}}"],
          "path": ["users", "profile"]
        }
      }
    },
    {
      "name": "Get Profile",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/users/profile",
          "host": ["{{baseUrl}}"],
          "path": ["users", "profile"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api/v1"
    },
    {
      "key": "token",
      "value": "your_jwt_token_here"
    }
  ]
}
```

---

## Notes

1. **Location is stored as JSON** in the User model's `location` field
2. **Coordinates are critical** for distance-based provider searches
3. **Country/City enhance** web search results and recommendations
4. **Fallback behavior**: If location is missing, the system uses default US coordinates (39.8283, -98.5795)
5. **Privacy**: Location data is only used for generating personalized healthcare recommendations
