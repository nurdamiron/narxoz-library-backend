const axios = require('axios');

async function testAPIRegistration() {
  try {
    console.log('=== Testing API Registration Endpoint ===\n');
    
    const baseURL = 'http://localhost:5002/api';
    
    // Test credentials
    const credentials = {
      email: 'student@narxoz.kz',
      password: 'student123'
    };
    
    // Create auth header
    const authHeader = 'Basic ' + Buffer.from(`${credentials.email}:${credentials.password}`).toString('base64');
    
    console.log('Testing with user:', credentials.email);
    
    // Test event ID (newly created test event)
    const eventId = 5;
    
    console.log('Testing registration for event ID:', eventId);
    
    // First, get the event details
    console.log('\n--- Getting Event Details ---');
    try {
      const eventResponse = await axios.get(`${baseURL}/events/${eventId}`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Event details retrieved successfully');
      console.log('Event title:', eventResponse.data.data.title);
      console.log('Is registered:', eventResponse.data.data.isRegistered);
      console.log('Registration status:', eventResponse.data.data.registrationStatus);
      console.log('Registered count:', eventResponse.data.data.registeredCount);
      console.log('Available spots:', eventResponse.data.data.availableSpots);
      
      if (eventResponse.data.data.isRegistered && eventResponse.data.data.registrationStatus === 'registered') {
        console.log('\n--- Testing Registration Cancellation First ---');
        
        try {
          const cancelResponse = await axios.delete(`${baseURL}/events/${eventId}/register`, {
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('✅ Cancellation successful:', cancelResponse.status);
          
          // Wait a moment and get updated event details
          setTimeout(async () => {
            const updatedEventResponse = await axios.get(`${baseURL}/events/${eventId}`, {
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
              }
            });
            
            console.log('\nUpdated event details after cancellation:');
            console.log('Is registered:', updatedEventResponse.data.data.isRegistered);
            console.log('Registration status:', updatedEventResponse.data.data.registrationStatus);
            console.log('Registered count:', updatedEventResponse.data.data.registeredCount);
            console.log('Available spots:', updatedEventResponse.data.data.availableSpots);
            
            // Now test registration
            testRegistration();
          }, 1000);
          
        } catch (cancelError) {
          console.log('❌ Cancellation failed:', cancelError.response?.data || cancelError.message);
          testRegistration();
        }
      } else {
        testRegistration();
      }
      
    } catch (eventError) {
      console.log('❌ Failed to get event details:', eventError.response?.data || eventError.message);
      return;
    }
    
    async function testRegistration() {
      console.log('\n--- Testing Registration ---');
      
      try {
        const registerResponse = await axios.post(`${baseURL}/events/${eventId}/register`, {}, {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Registration successful:', registerResponse.status);
        console.log('Response data:', JSON.stringify(registerResponse.data, null, 2));
        
        // Get updated event details
        setTimeout(async () => {
          try {
            const finalEventResponse = await axios.get(`${baseURL}/events/${eventId}`, {
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
              }
            });
            
            console.log('\n--- Final Event State ---');
            console.log('Is registered:', finalEventResponse.data.data.isRegistered);
            console.log('Registration status:', finalEventResponse.data.data.registrationStatus);
            console.log('Registered count:', finalEventResponse.data.data.registeredCount);
            console.log('Available spots:', finalEventResponse.data.data.availableSpots);
            
          } catch (finalError) {
            console.log('❌ Failed to get final event state:', finalError.response?.data || finalError.message);
          } finally {
            process.exit(0);
          }
        }, 1000);
        
      } catch (registerError) {
        console.log('❌ Registration failed:', registerError.response?.status);
        console.log('Error response:', JSON.stringify(registerError.response?.data, null, 2));
        
        // Log request details for debugging
        console.log('\nRequest details:');
        console.log('URL:', `${baseURL}/events/${eventId}/register`);
        console.log('Headers:', { 'Authorization': 'Basic [HIDDEN]', 'Content-Type': 'application/json' });
        
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  }
}

testAPIRegistration();