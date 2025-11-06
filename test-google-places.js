/**
 * Quick test script to validate Google Places API key
 * Run: node test-google-places.js
 */

require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

async function testGooglePlacesAPI() {
  console.log('🔍 Testing Google Places API Key...\n');

  // Check if key exists
  if (!API_KEY) {
    console.log('❌ GOOGLE_PLACES_API_KEY not found in .env file');
    console.log('   Add it to your .env file: GOOGLE_PLACES_API_KEY=your_key_here\n');
    process.exit(1);
  }

  console.log('✅ API Key found in .env');
  console.log(`   Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}\n`);

  // Test API call
  console.log('🌐 Making test API call to Google Places...');
  
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: {
        query: 'hospital in San Francisco',
        key: API_KEY
      },
      timeout: 10000
    });

    console.log(`   Status: ${response.data.status}\n`);

    if (response.data.status === 'OK') {
      console.log('✅ SUCCESS! Google Places API key is valid and working!');
      console.log(`   Found ${response.data.results.length} results`);
      
      if (response.data.results.length > 0) {
        console.log('\n📍 Sample result:');
        const place = response.data.results[0];
        console.log(`   Name: ${place.name}`);
        console.log(`   Address: ${place.formatted_address || place.vicinity}`);
        console.log(`   Rating: ${place.rating || 'N/A'}`);
      }
      
      console.log('\n✨ Your Google Places API is ready to use!\n');
      process.exit(0);
      
    } else if (response.data.status === 'REQUEST_DENIED') {
      console.log('❌ FAILED: API key is invalid or Places API is not enabled');
      console.log('\n📋 To fix this:');
      console.log('   1. Go to https://console.cloud.google.com/');
      console.log('   2. Select your project');
      console.log('   3. Go to "APIs & Services" → "Library"');
      console.log('   4. Search for "Places API" and click "Enable"');
      console.log('   5. Make sure your API key has Places API enabled\n');
      
      if (response.data.error_message) {
        console.log(`   Error: ${response.data.error_message}\n`);
      }
      process.exit(1);
      
    } else if (response.data.status === 'ZERO_RESULTS') {
      console.log('✅ API key is valid (but no results for test query)');
      console.log('   This is fine - the key works!\n');
      process.exit(0);
      
    } else {
      console.log(`⚠️  Unexpected status: ${response.data.status}`);
      if (response.data.error_message) {
        console.log(`   Error: ${response.data.error_message}`);
      }
      console.log('\n   The key might still work, but check the error above.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.log('❌ FAILED: Error making API call');
    
    if (error.response) {
      console.log(`   HTTP Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data.error_message || error.message}`);
    } else if (error.request) {
      console.log('   Network error - check your internet connection');
    } else {
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n');
    process.exit(1);
  }
}

// Run the test
testGooglePlacesAPI();
