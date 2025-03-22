// routes/userRoutes.js
const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
  uploadAvatar,
  getMyStats,
  changePassword,
} = require('../controllers/userController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Apply protect middleware to all routes
router.use(protect);

// User profile routes
router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/avatar', uploadAvatar);
router.get('/me/stats', getMyStats);
router.put('/me/password', changePassword);

// Admin only routes
router.use(authorize('admin'));

router.route('/').get(getUsers).post(createUser);

router.route('/:id').get(getUser).put(updateUser).delete(deleteUser);

module.exports = router;