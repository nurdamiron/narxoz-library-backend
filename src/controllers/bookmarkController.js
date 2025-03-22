const { Op } = require('sequelize');
const ErrorResponse = require('../utils/errorResponse');
const db = require('../models');
const Bookmark = db.Bookmark;
const Book = db.Book;
const Category = db.Category;

/**
 * @desc    Get all bookmarks for current user
 * @route   GET /api/bookmarks
 * @access  Private
 */
exports.getBookmarks = async (req, res, next) => {
  try {
    const bookmarks = await Bookmark.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Book,
          as: 'book',
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
      order: [['addedAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      count: bookmarks.length,
      data: bookmarks,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add a bookmark
 * @route   POST /api/bookmarks
 * @access  Private
 */
exports.addBookmark = async (req, res, next) => {
  try {
    const { bookId } = req.body;

    // Check if book exists
    const book = await Book.findByPk(bookId);
    if (!book) {
      return next(new ErrorResponse(`Book not found with id of ${bookId}`, 404));
    }

    // Check if bookmark already exists
    const existingBookmark = await Bookmark.findOne({
      where: {
        userId: req.user.id,
        bookId,
      },
    });

    if (existingBookmark) {
      return next(new ErrorResponse('You have already bookmarked this book', 400));
    }

    // Create bookmark
    const bookmark = await Bookmark.create({
      userId: req.user.id,
      bookId,
    });

    // Return bookmark with book details
    const bookmarkWithBook = await Bookmark.findByPk(bookmark.id, {
      include: [
        {
          model: Book,
          as: 'book',
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    res.status(201).json({
      success: true,
      data: bookmarkWithBook,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete bookmark
 * @route   DELETE /api/bookmarks/:id
 * @access  Private
 */
exports.deleteBookmark = async (req, res, next) => {
  try {
    const bookmark = await Bookmark.findByPk(req.params.id);

    if (!bookmark) {
      return next(
        new ErrorResponse(`Bookmark not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user owns the bookmark
    if (bookmark.userId !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this bookmark', 401));
    }

    await bookmark.destroy();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle bookmark (add if not exists, remove if exists)
 * @route   POST /api/bookmarks/toggle/:bookId
 * @access  Private
 */
exports.toggleBookmark = async (req, res, next) => {
  try {
    const bookId = req.params.bookId;

    // Check if book exists
    const book = await Book.findByPk(bookId);
    if (!book) {
      return next(new ErrorResponse(`Book not found with id of ${bookId}`, 404));
    }

    // Check if bookmark already exists
    const existingBookmark = await Bookmark.findOne({
      where: {
        userId: req.user.id,
        bookId,
      },
    });

    let result;
    let status;

    if (existingBookmark) {
      // Remove bookmark if it exists
      await existingBookmark.destroy();
      result = { bookmarked: false };
      status = 200;
    } else {
      // Add bookmark if it doesn't exist
      const bookmark = await Bookmark.create({
        userId: req.user.id,
        bookId,
      });

      // Get bookmark with book details
      const bookmarkWithBook = await Bookmark.findByPk(bookmark.id, {
        include: [
          {
            model: Book,
            as: 'book',
            include: [
              {
                model: Category,
                as: 'category',
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
      });

      result = { bookmarked: true, bookmark: bookmarkWithBook };
      status = 201;
    }

    res.status(status).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Check if a book is bookmarked by the current user
 * @route   GET /api/bookmarks/check/:bookId
 * @access  Private
 */
exports.checkBookmark = async (req, res, next) => {
  try {
    const bookmark = await Bookmark.findOne({
      where: {
        userId: req.user.id,
        bookId: req.params.bookId,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        isBookmarked: !!bookmark,
        bookmark: bookmark || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all bookmarks (admin only)
 * @route   GET /api/bookmarks/all
 * @access  Private/Admin
 */
exports.getAllBookmarks = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const offset = (page - 1) * limit;

    // Query options
    const queryOptions = {
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author'],
        },
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'studentId'],
        },
      ],
      order: [['addedAt', 'DESC']],
      limit,
      offset,
    };

    // Add filters if provided
    if (req.query.userId) {
      queryOptions.where = {
        ...queryOptions.where,
        userId: req.query.userId,
      };
    }

    if (req.query.bookId) {
      queryOptions.where = {
        ...queryOptions.where,
        bookId: req.query.bookId,
      };
    }

    // Fetch bookmarks with pagination
    const { count, rows: bookmarks } = await Bookmark.findAndCountAll(queryOptions);

    // Pagination result
    const pagination = {};

    if (offset + bookmarks.length < count) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (offset > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: bookmarks.length,
      pagination,
      totalPages: Math.ceil(count / limit),
      total: count,
      data: bookmarks,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete bookmark by book ID (for current user)
 * @route   DELETE /api/bookmarks/book/:bookId
 * @access  Private
 */
exports.deleteBookmarkByBookId = async (req, res, next) => {
  try {
    const bookmark = await Bookmark.findOne({
      where: {
        userId: req.user.id,
        bookId: req.params.bookId,
      },
    });

    if (!bookmark) {
      return next(
        new ErrorResponse(`Bookmark not found for book ID ${req.params.bookId}`, 404)
      );
    }

    await bookmark.destroy();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get most bookmarked books (admin only)
 * @route   GET /api/bookmarks/trending
 * @access  Private/Admin
 */
exports.getTrendingBooks = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;

    // Get books with most bookmarks
    const result = await Bookmark.findAll({
      attributes: [
        'bookId',
        [db.sequelize.fn('COUNT', db.sequelize.col('bookId')), 'bookmarkCount'],
      ],
      group: ['bookId'],
      order: [[db.sequelize.literal('bookmarkCount'), 'DESC']],
      limit,
      include: [
        {
          model: Book,
          as: 'book',
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};