/**
 * Script to kill the existing server process and start a new one
 */
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Kill existing server process
exec('lsof -ti :5001 | xargs kill -9', (error, stdout, stderr) => {
  if (error) {
    console.log(`Could not kill existing process: ${error.message}`);
    return;
  }
  
  console.log('Successfully killed existing server process');
  
  // Start the server again
  exec('node src/server.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting server: ${error.message}`);
      return;
    }
    
    console.log('Server restarted successfully');
    console.log(stdout);
  });
});