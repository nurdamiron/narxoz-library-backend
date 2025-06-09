const mysql = require('mysql2/promise');
const path = require('path');

async function updateNullEventImages() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'root', 
    database: 'library_system'
  });

  try {
    // Update all events with null or empty images to use default image
    const [result] = await connection.execute(`
      UPDATE events 
      SET image = 'test-event-1-1749462400-123456789.jpg', 
          imageStoredLocally = true 
      WHERE image IS NULL OR image = ''
    `);

    console.log(`Updated ${result.affectedRows} events with default image`);
    
    // Show updated events
    const [events] = await connection.execute('SELECT id, title, image FROM events');
    console.log('\nAll events after update:');
    events.forEach(event => {
      console.log(`Event ${event.id}: ${event.title} - Image: ${event.image}`);
    });

  } catch (error) {
    console.error('Error updating events:', error);
  } finally {
    await connection.end();
  }
}

updateNullEventImages();