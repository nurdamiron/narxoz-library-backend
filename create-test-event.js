const { Event, User } = require('./src/models');

async function createTestEvent() {
  try {
    console.log('=== Creating Test Event ===\n');
    
    // Get admin user
    const admin = await User.findOne({ where: { role: 'admin' } });
    
    if (!admin) {
      console.log('No admin user found');
      return;
    }
    
    // Create test event with future dates
    const now = new Date();
    const registrationDeadline = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days from now
    const startDate = new Date(now.getTime() + (10 * 24 * 60 * 60 * 1000)); // 10 days from now
    const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // 2 hours after start
    
    const testEvent = await Event.create({
      title: 'Test Event - Registration Testing',
      description: 'This is a test event created to test the registration functionality',
      type: 'workshop',
      location: 'Test Location',
      capacity: 50,
      isActive: true,
      createdBy: admin.id,
      startDate: startDate,
      endDate: endDate,
      registrationDeadline: registrationDeadline
    });
    
    console.log('✅ Test event created successfully:');
    console.log(`ID: ${testEvent.id}`);
    console.log(`Title: ${testEvent.title}`);
    console.log(`Capacity: ${testEvent.capacity}`);
    console.log(`Registration deadline: ${registrationDeadline.toISOString()}`);
    console.log(`Start date: ${startDate.toISOString()}`);
    console.log(`End date: ${endDate.toISOString()}`);
    
    return testEvent.id;
    
  } catch (error) {
    console.error('Error creating test event:', error.message);
  } finally {
    process.exit(0);
  }
}

createTestEvent();