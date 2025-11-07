/**
 * Test script for User Location API
 * 
 * This script demonstrates how to:
 * 1. Login to get authentication token
 * 2. Update user location
 * 3. Get user location
 * 4. Update user profile
 * 5. Get user profile
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_VERSION = 'v1';
const API_BASE = `${BASE_URL}/api/${API_VERSION}`;

// Test user credentials (update with your test user)
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123456'
};

// Test location data
const TEST_LOCATION = {
  latitude: 40.7128,
  longitude: -74.0060,
  city: 'New York',
  state: 'NY',
  country: 'United States',
  countryCode: 'US'
};

let authToken = null;

/**
 * Login and get authentication token
 */
async function login() {
  try {
    console.log('\n1. Logging in...');
    const response = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    
    authToken = response.data.data.token;
    console.log('✓ Login successful');
    console.log('Token:', authToken.substring(0, 20) + '...');
    
    return authToken;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update user location
 */
async function updateLocation() {
  try {
    console.log('\n2. Updating user location...');
    const response = await axios.patch(
      `${API_BASE}/users/location`,
      TEST_LOCATION,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✓ Location updated successfully');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('✗ Update location failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get user location
 */
async function getLocation() {
  try {
    console.log('\n3. Getting user location...');
    const response = await axios.get(
      `${API_BASE}/users/location`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('✓ Location retrieved successfully');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('✗ Get location failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update user profile
 */
async function updateProfile() {
  try {
    console.log('\n4. Updating user profile...');
    const profileData = {
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      gender: 'male'
    };
    
    const response = await axios.patch(
      `${API_BASE}/users/profile`,
      profileData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✓ Profile updated successfully');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('✗ Update profile failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get user profile
 */
async function getProfile() {
  try {
    console.log('\n5. Getting user profile...');
    const response = await axios.get(
      `${API_BASE}/users/profile`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log('✓ Profile retrieved successfully');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('✗ Get profile failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Test location validation
 */
async function testLocationValidation() {
  try {
    console.log('\n6. Testing location validation...');
    
    // Test invalid latitude
    try {
      await axios.patch(
        `${API_BASE}/users/location`,
        { latitude: 100, longitude: -74.0060 }, // Invalid latitude
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✗ Validation should have failed for invalid latitude');
    } catch (error) {
      console.log('✓ Validation correctly rejected invalid latitude');
      console.log('Error:', error.response?.data?.message);
    }
    
    // Test missing required fields
    try {
      await axios.patch(
        `${API_BASE}/users/location`,
        { city: 'New York' }, // Missing latitude and longitude
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✗ Validation should have failed for missing required fields');
    } catch (error) {
      console.log('✓ Validation correctly rejected missing required fields');
      console.log('Error:', error.response?.data?.message);
    }
  } catch (error) {
    console.error('✗ Validation test failed:', error.message);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('User Location API Test Suite');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_BASE}`);
  
  try {
    // Step 1: Login
    await login();
    
    // Step 2: Update location
    await updateLocation();
    
    // Step 3: Get location
    await getLocation();
    
    // Step 4: Update profile
    await updateProfile();
    
    // Step 5: Get profile
    await getProfile();
    
    // Step 6: Test validation
    await testLocationValidation();
    
    console.log('\n' + '='.repeat(60));
    console.log('✓ All tests completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('✗ Test suite failed');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Run tests
runTests();
