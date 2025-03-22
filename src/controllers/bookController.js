const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const ErrorResponse = require('../utils/errorResponse');
const db = require('../models');
const Book = db.Book;
const Category = db.Category;
const Bookmark = db.Bookmark;
const User = db.User;

/**
 * @desc    Get all books
 * @route   GET /api/books
 * @access  Public
 */
exports.getBooks = async (req, res, next) => {
  try {
    // Initialize query options
    const queryOptions = {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
      ],
      where: {},
      order: [['publicationYear', 'DESC']],
    };

    // Search functionality
    if (req.query.search) {
      // Use LIKE for basic search or MATCH AGAINST for full-text search if supported
      queryOptions.where = {
        [Op.or]: [
          { title: { [Op.like]: `%${req.query.search}%` } },
          { author: { [Op.like]: `%${req.query.search}%` } },
          { description: { [Op.like]: `%${req.query.search}%` } },
        ],
      };
    }

    // Filter by category ID
    if (req.query.categoryId) {
      queryOptions.where.categoryId = req.query.categoryId;
    }

    // Filter by category name
    if (req.query.categoryName) {
      const category = await Category.findOne({
        where: { name: req.query.categoryName },
      });
      if (category) {
        queryOptions.where.categoryId = category.id;
      } else {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }
    }

    // Filter by publication year range
    if (req.query.yearRange) {
      const [startYear, endYear] = req.query.yearRange.split('-').map(Number);

      if (startYear && endYear) {
        // Range query
        queryOptions.where.publicationYear = {
          [Op.between]: [startYear, endYear],
        };
      } else if (startYear) {
        // Only startYear is defined, assume all books after startYear
        queryOptions.where.publicationYear = {
          [Op.gte]: startYear,
        };
      }
    } else if (req.query.year) {
      // Specific year query
      queryOptions.where.publicationYear = parseInt(req.query.year, 10);
    }

    // Filter by language
    if (req.query.language) {
      const languages = req.query.language.split(',');
      queryOptions.where.language = {
        [Op.in]: languages,
      };
    }

    // Filter by availability
    if (req.query.available === 'true') {
      queryOptions.where.availableCopies = {
        [Op.gt]: 0,
      };
    }

    // Sort
    if (req.query.sort) {
      const sortField = req.query.sort.startsWith('-')
        ? req.query.sort.substring(1)
        : req.query.sort;
      const sortDirection = req.query.sort.startsWith('-') ? 'DESC' : 'ASC';
      
      queryOptions.order = [[sortField, sortDirection]];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    queryOptions.limit = limit;
    queryOptions.offset = offset;

    // Get books with pagination
    const { count, rows: books } = await Book.findAndCountAll(queryOptions);

    // Add isBookmarked field for authenticated users
    let booksWithBookmarkStatus = books;
    
    if (req.user) {
      const bookIds = books.map(book => book.id);
      const bookmarks = await Bookmark.findAll({
        where: {
          userId: req.user.id,
          bookId: {
            [Op.in]: bookIds,
          },
        },
      });

      const bookmarkedIds = bookmarks.map(bookmark => bookmark.bookId);
      
      booksWithBookmarkStatus = books.map(book => {
        const bookObj = book.toJSON();
        bookObj.isBookmarked = bookmarkedIds.includes(book.id);
        return bookObj;
      });
    }

    // Pagination result
    const pagination = {};

    if (offset + books.length < count) {
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
      count: booksWithBookmarkStatus.length,
      pagination,
      totalPages: Math.ceil(count / limit),
      total: count,
      data: booksWithBookmarkStatus,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single book
 * @route   GET /api/books/:id
 * @access  Public
 */
exports.getBook = async (req, res, next) => {
  try {
    const book = await Book.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!book) {
      return next(
        new ErrorResponse(`Book not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if the book is bookmarked by the user
    let isBookmarked = false;
    if (req.user) {
      const bookmark = await Bookmark.findOne({
        where: {
          bookId: req.params.id,
          userId: req.user.id,
        },
      });
      isBookmarked = !!bookmark;
    }

    // Convert to plain object to add isBookmarked
    const bookData = book.toJSON();
    bookData.isBookmarked = isBookmarked;

    res.status(200).json({
      success: true,
      data: bookData,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new book (Admin only)
 * @route   POST /api/books
 * @access  Private/Admin
 */
exports.createBook = async (req, res, next) => {
  try {
    // Check if category exists
    const category = await Category.findByPk(req.body.categoryId);
    if (!category) {
      return next(
        new ErrorResponse(`Category not found with id of ${req.body.categoryId}`, 404)
      );
    }

    // Create book
    const book = await Book.create(req.body);

    res.status(201).json({
      success: true,
      data: book,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update book (Admin only)
 * @route   PUT /api/books/:id
 * @access  Private/Admin
 */
exports.updateBook = async (req, res, next) => {
  try {
    let book = await Book.findByPk(req.params.id);

    if (!book) {
      return next(
        new ErrorResponse(`Book not found with id of ${req.params.id}`, 404)
      );
    }

    // If category is being updated, check if it exists
    if (req.body.categoryId) {
      const category = await Category.findByPk(req.body.categoryId);
      if (!category) {
        return next(
          new ErrorResponse(`Category not found with id of ${req.body.categoryId}`, 404)
        );
      }
    }

    // Update book
    await book.update(req.body);

    // Refresh book data with associations
    book = await Book.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
      ],
    });

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete book (Admin only)
 * @route   DELETE /api/books/:id
 * @access  Private/Admin
 */
exports.deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findByPk(req.params.id);

    if (!book) {
      return next(
        new ErrorResponse(`Book not found with id of ${req.params.id}`, 404)
      );
    }

    // Delete associated bookmarks
    await Bookmark.destroy({
      where: { bookId: req.params.id },
    });

    // Delete book cover if it exists and it's not the default
    if (book.cover && book.cover !== 'default-book-cover.jpg') {
      const coverPath = path.join(__dirname, '../../src/uploads/books', book.cover);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }

    // Delete book
    await book.destroy();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Upload book cover
 * @route   PUT /api/books/:id/cover
 * @access  Private/Admin
 */
exports.bookCoverUpload = async (req, res, next) => {
  try {
    const book = await Book.findByPk(req.params.id);

    if (!book) {
      return next(
        new ErrorResponse(`Book not found with id of ${req.params.id}`, 404)
      );
    }

    if (!req.files || !req.files.file) {
      return next(new ErrorResponse('Please upload a file', 400));
    }

    const file = req.files.file;

    // Make sure the image is a photo
    if (!file.mimetype.startsWith('image')) {
      return next(new ErrorResponse('Please upload an image file', 400));
    }

    // Check filesize
    const maxSize = process.env.MAX_FILE_UPLOAD || 1024 * 1024; // Default to 1MB
    if (file.size > maxSize) {
      return next(
        new ErrorResponse(
          `Please upload an image less than ${maxSize / (1024 * 1024)}MB`,
          400
        )
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../src/uploads/books');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create custom filename
    const fileExt = path.extname(file.name);
    file.name = `book_cover_${book.id}${fileExt}`;
    const filePath = path.join(uploadsDir, file.name);

    // Delete old cover if it exists and it's not the default
    if (book.cover && book.cover !== 'default-book-cover.jpg') {
      const oldCoverPath = path.join(uploadsDir, book.cover);
      if (fs.existsSync(oldCoverPath)) {
        fs.unlinkSync(oldCoverPath);
      }
    }

    // Upload file
    file.mv(filePath, async (err) => {
      if (err) {
        console.error(err);
        return next(new ErrorResponse('Problem with file upload', 500));
      }

      // Update book cover field
      await book.update({ cover: file.name });

      res.status(200).json({
        success: true,
        data: file.name,
      });
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get popular books
 * @route   GET /api/books/popular
 * @access  Public
 */
exports.getPopularBooks = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 4;

    // Get books with highest rating
    const books = await Book.findAll({
      where: {
        rating: { [Op.gt]: 0 },
      },
      order: [
        ['rating', 'DESC'],
        ['reviewCount', 'DESC'],
      ],
      limit,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
      ],
    });

    // Add isBookmarked field for authenticated users
    let booksWithBookmarkStatus = books;
    
    if (req.user) {
      const bookIds = books.map(book => book.id);
      const bookmarks = await Bookmark.findAll({
        where: {
          userId: req.user.id,
          bookId: {
            [Op.in]: bookIds,
          },
        },
      });

      const bookmarkedIds = bookmarks.map(bookmark => bookmark.bookId);
      
      booksWithBookmarkStatus = books.map(book => {
        const bookObj = book.toJSON();
        bookObj.isBookmarked = bookmarkedIds.includes(book.id);
        return bookObj;
      });
    }

    res.status(200).json({
      success: true,
      count: booksWithBookmarkStatus.length,
      data: booksWithBookmarkStatus,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get new books
 * @route   GET /api/books/new
 * @access  Public
 */
exports.getNewBooks = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 4;

    // Get most recently added books
    const books = await Book.findAll({
      order: [['createdAt', 'DESC']],
      limit,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
      ],
    });

    // Add isBookmarked field for authenticated users
    let booksWithBookmarkStatus = books;
    
    if (req.user) {
      const bookIds = books.map(book => book.id);
      const bookmarks = await Bookmark.findAll({
        where: {
          userId: req.user.id,
          bookId: {
            [Op.in]: bookIds,
          },
        },
      });

      const bookmarkedIds = bookmarks.map(bookmark => bookmark.bookId);
      
      booksWithBookmarkStatus = books.map(book => {
        const bookObj = book.toJSON();
        bookObj.isBookmarked = bookmarkedIds.includes(book.id);
        return bookObj;
      });
    }

    res.status(200).json({
      success: true,
      count: booksWithBookmarkStatus.length,
      data: booksWithBookmarkStatus,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update book inventory (admin only)
 * @route   PUT /api/books/:id/inventory
 * @access  Private/Admin
 */
exports.updateInventory = async (req, res, next) => {
  try {
    const { totalCopies, availableCopies } = req.body;

    if (totalCopies === undefined && availableCopies === undefined) {
      return next(
        new ErrorResponse('Please provide totalCopies or availableCopies', 400)
      );
    }

    const book = await Book.findByPk(req.params.id);

    if (!book) {
      return next(
        new ErrorResponse(`Book not found with id of ${req.params.id}`, 404)
      );
    }

    // Update inventory fields
    if (totalCopies !== undefined) {
      book.totalCopies = totalCopies;
    }

    if (availableCopies !== undefined) {
      book.availableCopies = availableCopies;
    }

    // Make sure availableCopies doesn't exceed totalCopies
    if (book.availableCopies > book.totalCopies) {
      book.availableCopies = book.totalCopies;
    }

    await book.save();

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all categories
 * @route   GET /api/books/categories
 * @access  Public
 */
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      attributes: ['id', 'name', 'description'],
      order: [['name', 'ASC']],
    });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create category
 * @route   POST /api/books/categories
 * @access  Private/Admin
 */
exports.createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/books/categories/:id
 * @access  Private/Admin
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return next(
        new ErrorResponse(`Category not found with id of ${req.params.id}`, 404)
      );
    }

    await category.update(req.body);

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/books/categories/:id
 * @access  Private/Admin
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return next(
        new ErrorResponse(`Category not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if category has books
    const bookCount = await Book.count({
      where: { categoryId: req.params.id },
    });

    if (bookCount > 0) {
      return next(
        new ErrorResponse(
          `Cannot delete category with ${bookCount} associated books`,
          400
        )
      );
    }

    await category.destroy();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};