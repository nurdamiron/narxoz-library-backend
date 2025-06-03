/**
 * Test script for event registration race condition fix
 */
const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

// Test credentials
const testUser = {
  email: 'admin@narxoz.kz',
  password: 'admin123'
};

// Create basic auth header
const authHeader = 'Basic ' + Buffer.from(`${testUser.email}:${testUser.password}`).toString('base64');

async function testEventRegistration() {
  try {
    console.log('🧪 Testing event registration...');
    
    // Test with event ID 3 (should be active)
    const eventId = 3;
    
    // First, check if user is already registered and cancel if needed
    try {
      console.log('🔄 Checking current registration status...');
      const eventResponse = await axios.get(`${API_URL}/events/${eventId}`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (eventResponse.data.data.isRegistered) {
        console.log('📝 User already registered, cancelling first...');
        await axios.delete(`${API_URL}/events/${eventId}/register`, {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ Registration cancelled');
      }
    } catch (error) {
      console.log('ℹ️ No existing registration found');
    }
    
    // Test 1: Single registration
    console.log('\n📋 Test 1: Single registration');
    try {
      const response = await axios.post(`${API_URL}/events/${eventId}/register`, {}, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Registration successful:', response.data.success);
    } catch (error) {
      console.log('❌ Registration failed:', error.response?.data?.error || error.message);
    }
    
    // Test 2: Duplicate registration (should fail)
    console.log('\n📋 Test 2: Duplicate registration attempt');
    try {
      const response = await axios.post(`${API_URL}/events/${eventId}/register`, {}, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Duplicate registration should have failed but succeeded:', response.data);
    } catch (error) {
      console.log('✅ Duplicate registration correctly failed:', error.response?.data?.error || error.message);
    }
    
    // Test 3: Multiple concurrent registrations (stress test)
    console.log('\n📋 Test 3: Concurrent registration attempts');
    
    // Cancel existing registration first
    try {
      await axios.delete(`${API_URL}/events/${eventId}/register`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      console.log('🔄 Cancelled existing registration for stress test');
    } catch (error) {
      // Ignore if no registration exists
    }
    
    // Create multiple concurrent requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        axios.post(`${API_URL}/events/${eventId}/register`, {}, {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        }).catch(error => ({
          error: error.response?.data?.error || error.message,
          status: error.response?.status
        }))
      );
    }
    
    const results = await Promise.all(promises);
    
    let successCount = 0;
    let duplicateErrorCount = 0;
    
    results.forEach((result, index) => {
      if (result.error) {
        if (result.error.includes('already registered')) {
          duplicateErrorCount++;
          console.log(`✅ Request ${index + 1}: Correctly rejected duplicate`);
        } else {
          console.log(`❌ Request ${index + 1}: Unexpected error: ${result.error}`);
        }
      } else {
        successCount++;
        console.log(`✅ Request ${index + 1}: Registration successful`);
      }
    });
    
    console.log(`\n📊 Results: ${successCount} successful, ${duplicateErrorCount} correctly rejected`);
    
    if (successCount === 1 && duplicateErrorCount === 4) {
      console.log('🎉 Race condition test PASSED: Exactly one registration succeeded');
    } else {
      console.log('⚠️ Race condition test FAILED: Multiple registrations may have succeeded');
    }
    
    // Test 4: Cancel and re-register
    console.log('\n📋 Test 4: Cancel and re-register');
    try {
      await axios.delete(`${API_URL}/events/${eventId}/register`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Registration cancelled');
      
      const response = await axios.post(`${API_URL}/events/${eventId}/register`, {}, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Re-registration successful:', response.data.message);
    } catch (error) {
      console.log('❌ Re-registration failed:', error.response?.data?.error || error.message);
    }
    
  } catch (error) {
    console.error('🚫 Test failed:', error.message);
  }
}

testEventRegistration();