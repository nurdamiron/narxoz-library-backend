-- SQL commands to update event images for testing cover display
-- These commands update events to use existing image files in public/uploads/events/

-- Update event ID 6 with the test event image
UPDATE events 
SET image = 'test-event-1-1749462400-123456789.jpg', 
    imageStoredLocally = true 
WHERE id = 6;

-- Update event ID 5 with placeholder image
UPDATE events 
SET image = 'event-placeholder.jpg', 
    imageStoredLocally = true 
WHERE id = 5;

-- Update event ID 4 with placeholder image
UPDATE events 
SET image = 'event-placeholder.jpg', 
    imageStoredLocally = true 
WHERE id = 4;

-- Verify the changes
SELECT id, title, image, imageStoredLocally 
FROM events 
WHERE id IN (4, 5, 6);

-- Check all events with their image status
SELECT id, title, image, imageStoredLocally 
FROM events 
ORDER BY id DESC;