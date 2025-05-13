/**
 * Event Routes
 * 
 * Routes for Event management, registrations, and categories
 */
const express = require('express');
const { check } = require('express-validator');
const router = express.Router();

// Import controller methods
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
  updateRegistrationStatus,
  getEventCategories,
  createEventCategory,
  updateEventCategory,
  deleteEventCategory,
  getEventRegistrations,
  getMyEvents,
  getMyCreatedEvents
} = require('../controllers/eventController');

// Import middleware
const { protect, authorize } = require('../middleware/auth');

// Event category routes
router.route('/categories')
  .get(getEventCategories)
  .post(
    protect, 
    authorize('admin'), 
    [
      check('name', 'Category name is required').not().isEmpty().trim(),
      check('description').optional().trim()
    ],
    createEventCategory
  );

router.route('/categories/:id')
  .put(
    protect, 
    authorize('admin'), 
    [
      check('name', 'Category name is required').optional().not().isEmpty().trim(),
      check('description').optional().trim()
    ],
    updateEventCategory
  )
  .delete(protect, authorize('admin'), deleteEventCategory);

// User's events routes
router.get('/my-events', protect, getMyEvents);
router.get('/my-created-events', protect, getMyCreatedEvents);

// Event registration management route
router.route('/registrations/:id')
  .put(
    protect,
    authorize('admin', 'moderator'),
    [
      check('status', 'Status is required').isIn(['registered', 'attended', 'cancelled'])
    ],
    updateRegistrationStatus
  );

// Event registration routes
router.route('/:id/register')
  .post(protect, registerForEvent)
  .delete(protect, cancelRegistration);

// Event registrations list route (admin only)
router.get('/:id/registrations', protect, authorize('admin', 'moderator'), getEventRegistrations);

// Main event routes
router.route('/')
  .get(getEvents)
  .post(
    protect,
    authorize('admin', 'moderator'),
    [
      check('title', 'Title is required').not().isEmpty().trim(),
      check('description', 'Description is required').not().isEmpty().trim(),
      check('type', 'Type must be workshop, lecture, exhibition, meetup, or other')
        .isIn(['workshop', 'lecture', 'exhibition', 'meetup', 'other']),
      check('location', 'Location is required').not().isEmpty().trim(),
      check('startDate', 'Start date is required').isISO8601(),
      check('endDate', 'End date is required').isISO8601(),
      check('capacity', 'Capacity must be a positive number').isInt({ min: 1 }),
      check('registrationDeadline', 'Registration deadline is required').isISO8601(),
      check('image').optional().isURL(),
      check('isActive').optional().isBoolean(),
      check('categories').optional().isArray()
    ],
    createEvent
  );

router.route('/:id')
  .get(getEvent)
  .put(
    protect,
    authorize('admin', 'moderator'),
    [
      check('title').optional().not().isEmpty().trim(),
      check('description').optional().not().isEmpty().trim(),
      check('type').optional().isIn(['workshop', 'lecture', 'exhibition', 'meetup', 'other']),
      check('location').optional().not().isEmpty().trim(),
      check('startDate').optional().isISO8601(),
      check('endDate').optional().isISO8601(),
      check('capacity').optional().isInt({ min: 1 }),
      check('registrationDeadline').optional().isISO8601(),
      check('image').optional().isURL(),
      check('isActive').optional().isBoolean(),
      check('categories').optional().isArray()
    ],
    updateEvent
  )
  .delete(protect, authorize('admin', 'moderator'), deleteEvent);

module.exports = router;