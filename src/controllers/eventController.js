/**
 * Event Controller
 * 
 * Handles all event-related operations including:
 * - Creating, updating, and deleting events
 * - Fetching events with filtering and pagination
 * - Managing event categories
 * - Handling event registrations
 */
const { Event, EventRegistration, EventCategory, User, Notification } = require('../models');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { Op } = require('sequelize');

/**
 * @desc    Get all events with optional filtering
 * @route   GET /api/events
 * @access  Public
 */
exports.getEvents = asyncHandler(async (req, res, next) => {
  const { 
    type, 
    category, 
    startDate, 
    endDate, 
    isActive, 
    search, 
    page = 1, 
    limit = 10 
  } = req.query;

  // Build filter criteria
  const filter = {};
  
  if (type) {
    filter.type = type;
  }
  
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }
  
  if (startDate) {
    filter.startDate = { [Op.gte]: new Date(startDate) };
  }
  
  if (endDate) {
    filter.endDate = { [Op.lte]: new Date(endDate) };
  }
  
  if (search) {
    filter[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { location: { [Op.like]: `%${search}%` } }
    ];
  }

  // Category filtering requires a join, handled through include
  const categoryInclude = category ? {
    model: EventCategory,
    as: 'categories',
    where: { id: category },
    through: { attributes: [] } // Don't include junction table data
  } : {
    model: EventCategory,
    as: 'categories',
    through: { attributes: [] }
  };

  // Pagination
  const offset = (page - 1) * limit;
  
  // Get events with total count
  const { count, rows: events } = await Event.findAndCountAll({
    where: filter,
    include: [
      categoryInclude,
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'role']
      }
    ],
    distinct: true, // Important for correct count with associations
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [['startDate', 'ASC']]
  });

  // Calculate pagination metadata
  const totalPages = Math.ceil(count / limit);
  const hasMore = page < totalPages;

  res.status(200).json({
    success: true,
    count,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages,
      hasMore
    },
    data: events
  });
});

/**
 * @desc    Get single event by ID
 * @route   GET /api/events/:id
 * @access  Public
 */
exports.getEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findByPk(req.params.id, {
    include: [
      {
        model: EventCategory,
        as: 'categories',
        through: { attributes: [] }
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'role']
      },
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
    return next(new ErrorResponse(`Event not found with id of ${req.params.id}`, 404));
  }

  // Add registration count and available spots
  const registeredCount = event.registrations.filter(
    reg => reg.status === 'registered' || reg.status === 'attended'
  ).length;
  
  const eventData = event.toJSON();
  eventData.registeredCount = registeredCount;
  eventData.availableSpots = event.capacity - registeredCount;

  // Check if current user is registered
  if (req.user) {
    const userRegistration = event.registrations.find(
      reg => reg.userId === req.user.id
    );
    eventData.isRegistered = !!userRegistration;
    if (userRegistration) {
      eventData.registrationStatus = userRegistration.status;
      eventData.registrationId = userRegistration.id;
    }
  }

  res.status(200).json({
    success: true,
    data: eventData
  });
});

/**
 * @desc    Create new event
 * @route   POST /api/events
 * @access  Private (Admin, Moderator)
 */
exports.createEvent = asyncHandler(async (req, res, next) => {
  // Add creator ID to request body
  req.body.createdBy = req.user.id;
  
  // Create event
  const event = await Event.create(req.body);

  // Handle categories if provided
  if (req.body.categories && Array.isArray(req.body.categories)) {
    await event.setCategories(req.body.categories);
    
    // Reload event with categories
    await event.reload({
      include: [
        {
          model: EventCategory,
          as: 'categories',
          through: { attributes: [] }
        }
      ]
    });
  }

  res.status(201).json({
    success: true,
    data: event
  });
});

/**
 * @desc    Update event
 * @route   PUT /api/events/:id
 * @access  Private (Admin, Moderator)
 */
exports.updateEvent = asyncHandler(async (req, res, next) => {
  let event = await Event.findByPk(req.params.id);

  if (!event) {
    return next(new ErrorResponse(`Event not found with id of ${req.params.id}`, 404));
  }

  // Update event fields
  event = await event.update(req.body);

  // Handle categories if provided
  if (req.body.categories && Array.isArray(req.body.categories)) {
    await event.setCategories(req.body.categories);
  }

  // Reload event with associations
  await event.reload({
    include: [
      {
        model: EventCategory,
        as: 'categories',
        through: { attributes: [] }
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'role']
      }
    ]
  });

  // Create notifications for registered users if important details changed
  if (req.body.startDate || req.body.endDate || req.body.location || req.body.isActive === false) {
    const registrations = await EventRegistration.findAll({
      where: { 
        eventId: event.id,
        status: 'registered'
      }
    });

    const notifications = registrations.map(registration => ({
      userId: registration.userId,
      eventId: event.id,
      type: 'event_update',
      message: `Event "${event.title}" has been updated. Please check the details.`,
      read: false
    }));

    if (notifications.length > 0) {
      await Notification.bulkCreate(notifications);
    }
  }

  res.status(200).json({
    success: true,
    data: event
  });
});

/**
 * @desc    Delete event
 * @route   DELETE /api/events/:id
 * @access  Private (Admin, Moderator for own events)
 */
exports.deleteEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findByPk(req.params.id);

  if (!event) {
    return next(new ErrorResponse(`Event not found with id of ${req.params.id}`, 404));
  }
  
  // Check if user is moderator and not the creator of the event
  if (req.user.role === 'moderator' && event.createdBy !== req.user.id) {
    return next(new ErrorResponse('Not authorized to delete this event', 403));
  }

  // Get all registrations for notifications
  const registrations = await EventRegistration.findAll({
    where: { 
      eventId: event.id,
      status: 'registered'
    }
  });

  // Create notifications for registered users
  const notifications = registrations.map(registration => ({
    userId: registration.userId,
    type: 'event_cancellation',
    message: `Event "${event.title}" has been cancelled.`,
    read: false
  }));

  // Delete event (this will cascade to registrations)
  await event.destroy();

  // Send notifications after deletion
  if (notifications.length > 0) {
    await Notification.bulkCreate(notifications);
  }

  res.status(200).json({
    success: true,
    data: {}
  });
});

/**
 * @desc    Register user for an event
 * @route   POST /api/events/:id/register
 * @access  Private
 */
exports.registerForEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findByPk(req.params.id);

  if (!event) {
    return next(new ErrorResponse(`Event not found with id of ${req.params.id}`, 404));
  }

  // Check if event is active
  if (!event.isActive) {
    return next(new ErrorResponse('This event is not currently active for registration', 400));
  }

  // Check if registration deadline has passed
  if (new Date() > new Date(event.registrationDeadline)) {
    return next(new ErrorResponse('Registration deadline has passed for this event', 400));
  }

  // Check if event capacity is reached
  const registeredCount = await EventRegistration.count({
    where: {
      eventId: event.id,
      status: {
        [Op.or]: ['registered', 'attended']
      }
    }
  });

  if (registeredCount >= event.capacity) {
    return next(new ErrorResponse('This event has reached its maximum capacity', 400));
  }

  // Check if user is already registered
  const existingRegistration = await EventRegistration.findOne({
    where: {
      eventId: event.id,
      userId: req.user.id
    }
  });

  if (existingRegistration) {
    // If previously cancelled, allow re-registration
    if (existingRegistration.status === 'cancelled') {
      await existingRegistration.update({
        status: 'registered',
        registrationDate: new Date()
      });

      return res.status(200).json({
        success: true,
        message: 'Your registration has been restored',
        data: existingRegistration
      });
    }

    return next(new ErrorResponse('You are already registered for this event', 400));
  }

  // Create the registration
  const registration = await EventRegistration.create({
    eventId: event.id,
    userId: req.user.id,
    status: 'registered',
    registrationDate: new Date()
  });

  // Send notification to the event creator
  await Notification.create({
    userId: event.createdBy,
    eventId: event.id,
    type: 'new_registration',
    message: `A new user has registered for your event "${event.title}".`,
    read: false
  });

  res.status(201).json({
    success: true,
    data: registration
  });
});

/**
 * @desc    Cancel registration for an event
 * @route   DELETE /api/events/:id/register
 * @access  Private
 */
exports.cancelRegistration = asyncHandler(async (req, res, next) => {
  const event = await Event.findByPk(req.params.id);

  if (!event) {
    return next(new ErrorResponse(`Event not found with id of ${req.params.id}`, 404));
  }

  // Find user's registration
  const registration = await EventRegistration.findOne({
    where: {
      eventId: event.id,
      userId: req.user.id
    }
  });

  if (!registration) {
    return next(new ErrorResponse('You are not registered for this event', 404));
  }

  // If the event has already started, don't allow cancellation
  if (new Date() > new Date(event.startDate)) {
    return next(new ErrorResponse('Cannot cancel registration after event has started', 400));
  }

  // Update registration status to cancelled
  await registration.update({
    status: 'cancelled'
  });

  // Notify event creator
  await Notification.create({
    userId: event.createdBy,
    eventId: event.id,
    type: 'cancelled_registration',
    message: `A user has cancelled their registration for your event "${event.title}".`,
    read: false
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

/**
 * @desc    Update registration status (for admin/moderator)
 * @route   PUT /api/events/registrations/:id
 * @access  Private (Admin, Moderator)
 */
exports.updateRegistrationStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (!status || !['registered', 'attended', 'cancelled'].includes(status)) {
    return next(new ErrorResponse('Please provide a valid status', 400));
  }

  const registration = await EventRegistration.findByPk(req.params.id, {
    include: [
      {
        model: Event,
        as: 'event'
      },
      {
        model: User,
        as: 'user'
      }
    ]
  });

  if (!registration) {
    return next(new ErrorResponse(`Registration not found with id of ${req.params.id}`, 404));
  }

  // Update status
  await registration.update({
    status
  });

  // Notify user of status change
  await Notification.create({
    userId: registration.userId,
    eventId: registration.eventId,
    type: 'registration_status_change',
    message: `Your registration status for "${registration.event.title}" has been updated to ${status}.`,
    read: false
  });

  res.status(200).json({
    success: true,
    data: registration
  });
});

/**
 * @desc    Get all event categories
 * @route   GET /api/events/categories
 * @access  Public
 */
exports.getEventCategories = asyncHandler(async (req, res, next) => {
  const categories = await EventCategory.findAll();

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories
  });
});

/**
 * @desc    Create event category
 * @route   POST /api/events/categories
 * @access  Private (Admin)
 */
exports.createEventCategory = asyncHandler(async (req, res, next) => {
  const category = await EventCategory.create(req.body);

  res.status(201).json({
    success: true,
    data: category
  });
});

/**
 * @desc    Update event category
 * @route   PUT /api/events/categories/:id
 * @access  Private (Admin)
 */
exports.updateEventCategory = asyncHandler(async (req, res, next) => {
  let category = await EventCategory.findByPk(req.params.id);

  if (!category) {
    return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
  }

  category = await category.update(req.body);

  res.status(200).json({
    success: true,
    data: category
  });
});

/**
 * @desc    Delete event category
 * @route   DELETE /api/events/categories/:id
 * @access  Private (Admin)
 */
exports.deleteEventCategory = asyncHandler(async (req, res, next) => {
  const category = await EventCategory.findByPk(req.params.id);

  if (!category) {
    return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
  }

  await category.destroy();

  res.status(200).json({
    success: true,
    data: {}
  });
});

/**
 * @desc    Get all registrations for an event
 * @route   GET /api/events/:id/registrations
 * @access  Private (Admin, Moderator, Event Creator)
 */
exports.getEventRegistrations = asyncHandler(async (req, res, next) => {
  const event = await Event.findByPk(req.params.id);

  if (!event) {
    return next(new ErrorResponse(`Event not found with id of ${req.params.id}`, 404));
  }

  // Check if user has permission (admin, moderator, or event creator)
  if (req.user.role !== 'admin' && req.user.role !== 'moderator' && event.createdBy !== req.user.id) {
    return next(new ErrorResponse('Not authorized to access this resource', 403));
  }

  const registrations = await EventRegistration.findAll({
    where: { eventId: event.id },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'role']
      }
    ],
    order: [['registrationDate', 'DESC']]
  });

  res.status(200).json({
    success: true,
    count: registrations.length,
    data: registrations
  });
});

/**
 * @desc    Get all events for current user
 * @route   GET /api/events/my-events
 * @access  Private
 */
exports.getMyEvents = asyncHandler(async (req, res, next) => {
  const registrations = await EventRegistration.findAll({
    where: { 
      userId: req.user.id,
      status: {
        [Op.ne]: 'cancelled'
      }
    },
    include: [
      {
        model: Event,
        as: 'event',
        include: [
          {
            model: EventCategory,
            as: 'categories',
            through: { attributes: [] }
          }
        ]
      }
    ],
    order: [[{ model: Event, as: 'event' }, 'startDate', 'ASC']]
  });

  // Format response to group by upcoming and past events
  const now = new Date();
  const upcomingEvents = [];
  const pastEvents = [];

  registrations.forEach(registration => {
    const eventWithStatus = {
      ...registration.event.toJSON(),
      registrationStatus: registration.status,
      registrationId: registration.id,
      registrationDate: registration.registrationDate
    };

    if (new Date(registration.event.endDate) >= now) {
      upcomingEvents.push(eventWithStatus);
    } else {
      pastEvents.push(eventWithStatus);
    }
  });

  res.status(200).json({
    success: true,
    data: {
      upcomingEvents,
      pastEvents
    }
  });
});

/**
 * @desc    Get events created by current user
 * @route   GET /api/events/my-created-events
 * @access  Private
 */
exports.getMyCreatedEvents = asyncHandler(async (req, res, next) => {
  const events = await Event.findAll({
    where: { createdBy: req.user.id },
    include: [
      {
        model: EventCategory,
        as: 'categories',
        through: { attributes: [] }
      }
    ],
    order: [['startDate', 'ASC']]
  });

  res.status(200).json({
    success: true,
    count: events.length,
    data: events
  });
});