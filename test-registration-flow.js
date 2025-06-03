const { Event, EventRegistration, User } = require('./src/models');
const { Op } = require('sequelize');

async function testRegistrationFlow() {
  try {
    console.log('=== Testing Event Registration Flow ===\n');
    
    // Get a test event
    const event = await Event.findOne({
      where: { isActive: true },
      order: [['id', 'ASC']]
    });
    
    if (!event) {
      console.log('No active events found');
      return;
    }
    
    console.log(`Testing with event: "${event.title}" (ID: ${event.id})`);
    console.log(`Capacity: ${event.capacity}`);
    
    // Get test user
    const user = await User.findOne({
      where: { role: 'student' },
      order: [['id', 'ASC']]
    });
    
    if (!user) {
      console.log('No student user found');
      return;
    }
    
    console.log(`Testing with user: ${user.email} (ID: ${user.id})\n`);
    
    // Check current registrations for this event
    console.log('--- Current Registration State ---');
    const currentRegistrations = await EventRegistration.findAll({
      where: { eventId: event.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName']
        }
      ]
    });
    
    console.log(`Current registrations: ${currentRegistrations.length}`);
    currentRegistrations.forEach(reg => {
      console.log(`- User ${reg.user.email}: ${reg.status}`);
    });
    
    // Count active registrations
    const activeCount = await EventRegistration.count({
      where: {
        eventId: event.id,
        status: {
          [Op.or]: ['registered', 'attended']
        }
      }
    });
    
    console.log(`\nActive registrations count: ${activeCount}`);
    console.log(`Available spots: ${event.capacity - activeCount}`);
    
    // Check if user is already registered
    const existingRegistration = await EventRegistration.findOne({
      where: {
        eventId: event.id,
        userId: user.id
      }
    });
    
    if (existingRegistration) {
      console.log(`\nUser already has registration with status: ${existingRegistration.status}`);
      
      if (existingRegistration.status === 'cancelled') {
        console.log('Testing re-registration after cancellation...');
        
        // Test re-registration
        await existingRegistration.update({
          status: 'registered',
          registrationDate: new Date()
        });
        
        console.log('✅ Re-registration successful');
      } else {
        console.log('User is already registered and active');
      }
    } else {
      console.log('\nTesting new registration...');
      
      // Test capacity check
      if (activeCount >= event.capacity) {
        console.log('❌ Event is at capacity');
        return;
      }
      
      // Create new registration
      const newRegistration = await EventRegistration.create({
        eventId: event.id,
        userId: user.id,
        status: 'registered',
        registrationDate: new Date()
      });
      
      console.log('✅ New registration created:', {
        id: newRegistration.id,
        eventId: newRegistration.eventId,
        userId: newRegistration.userId,
        status: newRegistration.status
      });
    }
    
    // Final count check
    console.log('\n--- Final Registration State ---');
    const finalCount = await EventRegistration.count({
      where: {
        eventId: event.id,
        status: {
          [Op.or]: ['registered', 'attended']
        }
      }
    });
    
    console.log(`Final active registrations: ${finalCount}`);
    console.log(`Final available spots: ${event.capacity - finalCount}`);
    
    // Test the same logic as in controller
    console.log('\n--- Testing Controller Logic ---');
    
    // Simulate what the getEvent controller does
    const eventWithRegistrations = await Event.findByPk(event.id, {
      include: [
        {
          model: EventRegistration,
          as: 'registrations',
          attributes: ['id', 'userId', 'status', 'registrationDate']
        }
      ]
    });
    
    const registeredCountFromController = eventWithRegistrations.registrations.filter(
      reg => reg.status === 'registered' || reg.status === 'attended'
    ).length;
    
    console.log(`Registered count (controller logic): ${registeredCountFromController}`);
    console.log(`Available spots (controller logic): ${event.capacity - registeredCountFromController}`);
    
    // Check if there's a discrepancy
    if (finalCount !== registeredCountFromController) {
      console.log('⚠️  DISCREPANCY FOUND between direct count and controller logic!');
      console.log(`Direct count: ${finalCount}`);
      console.log(`Controller count: ${registeredCountFromController}`);
    } else {
      console.log('✅ Count logic is consistent');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    process.exit(0);
  }
}

testRegistrationFlow();