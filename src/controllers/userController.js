// controllers/userController.js
const { User, Bookmark, Borrow } = require('../models');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/avatars/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create unique file name with timestamp and original extension
    cb(
      null,
      `user-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

// File filter to only accept images
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

// Initialize upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB max file size
  },
  fileFilter: fileFilter,
}).single('avatar');

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private/Admin
 */
exports.getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.findAll({
    attributes: { exclude: ['password'] },
  });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

/**
 * @desc    Get single user
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ['password'] },
  });

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Create user
 * @route   POST /api/users
 * @access  Private/Admin
 */
exports.createUser = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body);

  res.status(201).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Prevent password update through this endpoint
  if (req.body.password) {
    delete req.body.password;
  }

  const updatedUser = await user.update(req.body);

  res.status(200).json({
    success: true,
    data: updatedUser,
  });
});

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  await user.destroy();

  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/users/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password'] },
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update user details
 * @route   PUT /api/users/me
 * @access  Private
 */
exports.updateMe = asyncHandler(async (req, res, next) => {
  // Remove fields that shouldn't be updated by regular users
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    faculty: req.body.faculty,
    specialization: req.body.specialization,
    year: req.body.year,
  };

  // Remove any undefined or null values
  Object.keys(fieldsToUpdate).forEach(
    (key) =>
      (fieldsToUpdate[key] === undefined || fieldsToUpdate[key] === null) &&
      delete fieldsToUpdate[key]
  );

  const user = await User.findByPk(req.user.id);
  
  if (!user) {
    return next(new ErrorResponse(`User not found`, 404));
  }

  const updatedUser = await user.update(fieldsToUpdate);

  res.status(200).json({
    success: true,
    data: updatedUser,
  });
});

/**
 * @desc    Upload avatar
 * @route   PUT /api/users/me/avatar
 * @access  Private
 */
exports.uploadAvatar = asyncHandler(async (req, res, next) => {
  upload(req, res, async function (err) {
    if (err) {
      return next(new ErrorResponse(`Avatar upload error: ${err.message}`, 400));
    }

    if (!req.file) {
      return next(new ErrorResponse('Please upload a file', 400));
    }

    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return next(new ErrorResponse(`User not found`, 404));
    }

    // If user already has an avatar, delete the old one
    if (user.avatar) {
      const oldAvatarPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Update user with new avatar path
    const avatarPath = req.file.path;
    const updatedUser = await user.update({ avatar: avatarPath });

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  });
});

/**
 * @desc    Get user statistics (bookmarks, borrow history, etc.)
 * @route   GET /api/users/me/stats
 * @access  Private
 */
exports.getMyStats = asyncHandler(async (req, res, next) => {
  // Count user's bookmarks
  const bookmarksCount = await Bookmark.count({
    where: { userId: req.user.id },
  });

  // Count active borrows (not returned)
  const activeBorrowsCount = await Borrow.count({
    where: { userId: req.user.id, returnDate: null },
  });

  // Count total borrows
  const totalBorrowsCount = await Borrow.count({
    where: { userId: req.user.id },
  });

  // Count overdue borrows
  const now = new Date();
  const overdueBorrowsCount = await Borrow.count({
    where: {
      userId: req.user.id,
      returnDate: null,
      dueDate: { [Op.lt]: now },
    },
  });

  res.status(200).json({
    success: true,
    data: {
      bookmarks: bookmarksCount,
      activeborrows: activeBorrowsCount,
      totalBorrows: totalBorrowsCount,
      overdueborrows: overdueBorrowsCount,
    },
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/users/me/password
 * @access  Private
 */
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(
      new ErrorResponse('Please provide current and new password', 400)
    );
  }

  const user = await User.findByPk(req.user.id);

  // Check current password
  const isMatch = await user.matchPassword(currentPassword);

  if (!isMatch) {
    return next(new ErrorResponse('Current password is incorrect', 401));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
  });
});