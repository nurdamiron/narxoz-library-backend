const axios = require('axios');

async function testGetEvent() {
  try {
    console.log('=== Testing GET Event with Authentication ===\n');
    
    const baseURL = 'http://localhost:5001/api';
    const eventId = 5;
    
    // Test credentials
    const credentials = {
      email: 'student@narxoz.kz',
      password: 'student123'
    };
    
    // Create auth header
    const authHeader = 'Basic ' + Buffer.from(`${credentials.email}:${credentials.password}`).toString('base64');
    
    console.log('Testing with user:', credentials.email);
    console.log('Testing event ID:', eventId);
    
    // Get event with authentication
    console.log('\n--- Getting Event with Auth ---');
    try {
      const response = await axios.get(`${baseURL}/events/${eventId}`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Event details retrieved successfully');
      console.log('Event title:', response.data.data.title);
      console.log('Registered count:', response.data.data.registeredCount);
      console.log('Available spots:', response.data.data.availableSpots);
      console.log('Is registered:', response.data.data.isRegistered);
      console.log('Registration status:', response.data.data.registrationStatus);
      console.log('Registration ID:', response.data.data.registrationId);
      
      // Show all registrations in the event data
      if (response.data.data.registrations) {
        console.log('\nAll registrations in event:');
        response.data.data.registrations.forEach(reg => {
          console.log(`- User ${reg.userId}: ${reg.status} (ID: ${reg.id})`);
        });
      }
      
    } catch (error) {
      console.log('❌ Failed to get event:', error.response?.data || error.message);
    }
    
    // Get event without authentication for comparison
    console.log('\n--- Getting Event without Auth ---');
    try {
      const response = await axios.get(`${baseURL}/events/${eventId}`);
      
      console.log('✅ Event details retrieved without auth');
      console.log('Is registered:', response.data.data.isRegistered);
      console.log('Registration status:', response.data.data.registrationStatus);
      
    } catch (error) {
      console.log('❌ Failed to get event without auth:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  } finally {
    process.exit(0);
  }
}

testGetEvent();