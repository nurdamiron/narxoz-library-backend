const { Event, EventRegistration, User } = require('./src/models');

async function debugEventController() {
  try {
    console.log('=== Debugging Event Controller Logic ===\n');
    
    const eventId = 5;
    const userId = 2; // student user ID
    
    // Replicate the exact logic from getEvent controller
    const event = await Event.findByPk(eventId, {
      include: [
        {
          model: EventRegistration,
          as: 'registrations',
          attributes: ['id', 'userId', 'status', 'registrationDate'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'firstName', 'lastName', 'email']
            }
          ]
        }
      ]
    });
    
    if (!event) {
      console.log('Event not found');
      return;
    }
    
    console.log('Event found:', event.title);
    console.log('Event registrations count:', event.registrations.length);
    
    event.registrations.forEach(reg => {
      console.log(`Registration ${reg.id}: userId=${reg.userId}, status=${reg.status}`);
    });
    
    // Simulate the req.user object
    const reqUser = await User.findByPk(userId, {
      attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'role']
    });
    
    console.log('\nSimulating req.user:', {
      id: reqUser.id,
      email: reqUser.email
    });
    
    // Test the exact logic from controller
    console.log('\n--- Testing Controller Logic ---');
    
    if (reqUser) {
      console.log('req.user exists, looking for registration...');
      
      const userRegistration = event.registrations.find(
        reg => {
          console.log(`Comparing reg.userId (${reg.userId}) === reqUser.id (${reqUser.id})`);
          return reg.userId === reqUser.id;
        }
      );
      
      console.log('userRegistration found:', !!userRegistration);
      
      if (userRegistration) {
        console.log('userRegistration details:', {
          id: userRegistration.id,
          userId: userRegistration.userId,
          status: userRegistration.status
        });
        
        const isRegistered = !!userRegistration;
        const registrationStatus = userRegistration.status;
        const registrationId = userRegistration.id;
        
        console.log('\nResult:');
        console.log('isRegistered:', isRegistered);
        console.log('registrationStatus:', registrationStatus);
        console.log('registrationId:', registrationId);
      } else {
        console.log('No registration found for this user');
      }
    } else {
      console.log('No req.user provided');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

debugEventController();