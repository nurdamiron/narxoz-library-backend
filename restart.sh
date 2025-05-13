#!/bin/bash
# Restart script for the backend server

# Find and kill the process listening on port 5001
pid=$(lsof -ti:5001)
if [ -n "$pid" ]; then
  echo "Killing process $pid that was listening on port 5001"
  kill -9 $pid
fi

# Start the server
echo "Starting server..."
node src/server.js