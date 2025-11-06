/**
 * Test Provider Matcher with Multiple Locations
 * Tests Provider Matcher agent with US, Pakistan, India, UK, and Australia locations
 * Verifies booking URLs are valid and location-appropriate
 */

require('dotenv').config();
const ProviderMatcherAgent = require('./src/services/ai/agents/providerMatcher');
const redisService = require('./src/services/cache/redis.service');
const { sequelize } = require('./src/config/database');
const logger = require('./src/config/logger');

// Test locations
const testLocations = {
  us: {
    country: 'US',
    countryName: 'United States',
    city: 'New York',
    state: 'NY',
    latitude: 40.7128,
    longitude: -74.0060
  },
  pakistan: {
    country: 'PK',
    countryName: 'Pakistan',
    city: 'Lahore',
    state: 'Punjab',
    latitude: 31.5204,
    longitude: 74.3587
  },
  india: {
    country: 'IN',
    countryName: 'India',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.0760,
    longitude: 72.8777
  },
  uk: {
    country: 'GB',
    countryName: 'United Kingdom',
    city: 'London',
    state: 'England',
    latitude: 51.5074,
    longitude: -0.1278
  },
  australia: {
    country: 'AU',
    countryName: 'Australia',
    city: 'Sydney',
    state: 'NSW',
    latitude: -33.8688,
    longitude: 151.2093
  }
};

// Expected platform patterns for each location
const expectedPlatforms = {
  us: ['zocdoc', 'healthgrades', 'vitals', 'webmd', 'doctor.com'],
  pakistan: ['marham', 'oladoc', 'doctoruna', 'sehat'],
  india: ['practo', 'lybrate', 'doctoruna', '1mg'],
  uk: ['doctolib', 'nhs', 'doctify', 'patient.info'],
  australia: ['healthengine', 'hotdoc', 'healthshare']
};

async function testProviderMatcherWithLocation(locationName, location, specialty = 'cardiologist') {
  console.log(`\n=== Testing Provider Matcher: ${locationName} ===\n`);
  console.log(`Location: ${location.city}, ${location.countryName}`);
  console.log(`Specialty: ${specialty}`);
  console.log(`Coordinates: ${location.latitude}, ${location.longitude}\n`);

  const providerMatcher = new ProviderMatcherAgent();

  try {
    const startTime = Date.now();
    
    const result = await providerMatcher.findProviders({
      specialty,
      location
    });

    const executionTime = Date.now() - startTime;

    console.log('✓ Provider search completed');
    console.log(`  Execution time: ${executionTime}ms`);
    console.log(`  Providers found: ${result.providers.length}`);
    
    if (result.toolMetrics) {
      console.log(`\n  Tool Metrics:`);
      console.log(`    Web search invocations: ${result.toolMetrics.webSearchInvocations}`);
      console.log(`    Web search execution time: ${result.toolMetrics.webSearchExecutionTimeMs}ms`);
      console.log(`    Cache hits: ${result.toolMetrics.webSearchCacheHits}`);
      console.log(`    Cache misses: ${result.toolMetrics.webSearchCacheMisses}`);
      console.log(`    Errors: ${result.toolMetrics.webSearchErrors}`);
      console.log(`    Retries: ${result.toolMetrics.webSearchRetries}`);
    }

    if (result.providers.length > 0) {
      console.log(`\n  Sample Providers:`);
      
      // Show first 3 providers
      result.providers.slice(0, 3).forEach((provider, index) => {
        console.log(`\n  ${index + 1}. ${provider.name}`);
        console.log(`     Specialty: ${provider.specialty}`);
        console.log(`     Address: ${provider.address}`);
        console.log(`     Distance: ${provider.distance}`);
        console.log(`     Rating: ${provider.rating}/5 (${provider.reviewCount} reviews)`);
        console.log(`     Booking URL: ${provider.bookingUrl || 'Not available'}`);
        console.log(`     Profile URL: ${provider.profileUrl || 'Not available'}`);
        console.log(`     Source: ${provider.source}`);
      });

      // Analyze booking URLs
      console.log(`\n  Booking URL Analysis:`);
      const providersWithBooking = result.providers.filter(p => p.bookingUrl);
      console.log(`    Providers with booking URLs: ${providersWithBooking.length}/${result.providers.length}`);
      
      if (providersWithBooking.length > 0) {
        // Check if URLs contain expected platform keywords
        const platformMatches = {};
        const expectedPlatformList = expectedPlatforms[locationName.toLowerCase()] || [];
        
        expectedPlatformList.forEach(platform => {
          const count = providersWithBooking.filter(p => 
            p.bookingUrl.toLowerCase().includes(platform)
          ).length;
          if (count > 0) {
            platformMatches[platform] = count;
          }
        });

        if (Object.keys(platformMatches).length > 0) {
          console.log(`    ✓ Location-appropriate platforms found:`);
          Object.entries(platformMatches).forEach(([platform, count]) => {
            console.log(`      - ${platform}: ${count} provider(s)`);
          });
        } else {
          console.log(`    ⚠ No expected platforms found in URLs`);
          console.log(`    Expected platforms: ${expectedPlatformList.join(', ')}`);
          console.log(`    Sample URLs:`);
          providersWithBooking.slice(0, 3).forEach(p => {
            console.log(`      - ${p.bookingUrl}`);
          });
        }

        // Validate URLs
        let validUrls = 0;
        let httpsUrls = 0;
        providersWithBooking.forEach(provider => {
          try {
            const url = new URL(provider.bookingUrl);
            validUrls++;
            if (url.protocol === 'https:') {
              httpsUrls++;
            }
          } catch (error) {
            console.log(`    ✗ Invalid URL for ${provider.name}: ${provider.bookingUrl}`);
          }
        });

        console.log(`    Valid URLs: ${validUrls}/${providersWithBooking.length}`);
        console.log(`    HTTPS URLs: ${httpsUrls}/${providersWithBooking.length}`);
      }
    } else {
      console.log(`\n  ⚠ No providers found for this location`);
    }

    return {
      success: true,
      providerCount: result.providers.length,
      providersWithBooking: result.providers.filter(p => p.bookingUrl).length,
      executionTime,
      toolMetrics: result.toolMetrics
    };

  } catch (error) {
    console.error(`\n✗ Provider search failed:`);
    console.error(`  Error: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
    
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('\n=== Provider Matcher Multi-Location Testing ===\n');

  try {
    // Connect to database and Redis
    await sequelize.authenticate();
    console.log('✓ Connected to database');

    await redisService.connect();
    console.log('✓ Connected to Redis');

    // Test results
    const results = {};

    // Test 1: US Location
    results.us = await testProviderMatcherWithLocation('US', testLocations.us, 'cardiologist');

    // Test 2: Pakistan Location
    results.pakistan = await testProviderMatcherWithLocation('Pakistan', testLocations.pakistan, 'cardiologist');

    // Test 3: India Location
    results.india = await testProviderMatcherWithLocation('India', testLocations.india, 'cardiologist');

    // Test 4: UK Location
    results.uk = await testProviderMatcherWithLocation('UK', testLocations.uk, 'cardiologist');

    // Test 5: Australia Location
    results.australia = await testProviderMatcherWithLocation('Australia', testLocations.australia, 'cardiologist');

    // Summary
    console.log('\n\n=== Test Summary ===\n');
    
    Object.entries(results).forEach(([location, result]) => {
      if (result.success) {
        console.log(`✓ ${location.toUpperCase()}:`);
        console.log(`  Providers found: ${result.providerCount}`);
        console.log(`  With booking URLs: ${result.providersWithBooking}`);
        console.log(`  Execution time: ${result.executionTime}ms`);
        if (result.toolMetrics) {
          console.log(`  Web searches: ${result.toolMetrics.webSearchInvocations}`);
        }
      } else {
        console.log(`✗ ${location.toUpperCase()}: ${result.error}`);
      }
    });

    // Overall statistics
    const successfulTests = Object.values(results).filter(r => r.success).length;
    const totalProviders = Object.values(results).reduce((sum, r) => sum + (r.providerCount || 0), 0);
    const totalWithBooking = Object.values(results).reduce((sum, r) => sum + (r.providersWithBooking || 0), 0);
    const totalWebSearches = Object.values(results).reduce((sum, r) => 
      sum + (r.toolMetrics?.webSearchInvocations || 0), 0
    );

    console.log(`\nOverall Statistics:`);
    console.log(`  Successful tests: ${successfulTests}/5`);
    console.log(`  Total providers found: ${totalProviders}`);
    console.log(`  Total with booking URLs: ${totalWithBooking}`);
    console.log(`  Total web searches performed: ${totalWebSearches}`);

    if (successfulTests === 5) {
      console.log(`\n✓ All location tests passed successfully!`);
    } else {
      console.log(`\n⚠ Some tests failed - see details above`);
    }

    process.exit(0);

  } catch (error) {
    console.error('\n\n=== Tests Failed ===\n');
    console.error(error);
    process.exit(1);
  } finally {
    // Close connections
    await sequelize.close();
    await redisService.disconnect();
  }
}

// Run tests
main();
