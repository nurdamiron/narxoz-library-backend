const { sequelize } = require('./src/models');

async function checkData() {
  try {
    // Check events
    const eventsCount = await sequelize.query('SELECT COUNT(*) as count FROM events', { type: sequelize.QueryTypes.SELECT });
    console.log('Events count:', eventsCount[0].count);
    
    // Check registrations
    const regsCount = await sequelize.query('SELECT COUNT(*) as count FROM event_registrations', { type: sequelize.QueryTypes.SELECT });
    console.log('Registrations count:', regsCount[0].count);
    
    // Check sample event with registrations
    const eventWithRegs = await sequelize.query(`
      SELECT e.id, e.title, e.capacity, 
             COUNT(CASE WHEN r.status IN ('registered', 'attended') THEN 1 END) as registered_count
      FROM events e 
      LEFT JOIN event_registrations r ON e.id = r.eventId 
      GROUP BY e.id 
      LIMIT 3
    `, { type: sequelize.QueryTypes.SELECT });
    console.log('Events with registration counts:', JSON.stringify(eventWithRegs, null, 2));
    
    // Check registration statuses
    const statusCount = await sequelize.query(`
      SELECT status, COUNT(*) as count 
      FROM event_registrations 
      GROUP BY status
    `, { type: sequelize.QueryTypes.SELECT });
    console.log('Registration status distribution:', JSON.stringify(statusCount, null, 2));
    
    // Check specific registrations
    const recentRegs = await sequelize.query(`
      SELECT r.id, r.eventId, r.userId, r.status, r.registrationDate, e.title
      FROM event_registrations r
      JOIN events e ON r.eventId = e.id
      ORDER BY r.registrationDate DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });
    console.log('Recent registrations:', JSON.stringify(recentRegs, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkData();