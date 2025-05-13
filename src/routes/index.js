/**
 * Main Router File
 * 
 * Imports and configures all API routes
 */
const express = require('express');
const router = express.Router();

// Import route files
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const bookRoutes = require('./bookRoutes');
const categoryRoutes = require('./categoryRoutes');
const borrowRoutes = require('./borrowRoutes');
const bookmarkRoutes = require('./bookmarkRoutes');
const reviewRoutes = require('./reviewRoutes');
const notificationRoutes = require('./notificationRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const eventRoutes = require('./eventRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/books', bookRoutes);
router.use('/categories', categoryRoutes);
router.use('/borrows', borrowRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/events', eventRoutes);

module.exports = router;