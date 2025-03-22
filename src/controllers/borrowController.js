const { Op } = require('sequelize');
const ErrorResponse = require('../utils/errorResponse');
const db = require('../models');
const Borrow = db.Borrow;
const Book = db.Book;
const User = db.User;
const Category = db.Category;
const Notification = db.Notification;

/**
 * @desc    Borrow a book
 * @route   POST /api/borrows
 * @access  Private
 */
exports.borrowBook = async (req, res, next) => {
  try {
    const { bookId } = req.body;

    // Get the book
    const book = await Book.findByPk(bookId);

    if (!book) {
      return next(new ErrorResponse(`Book not found with id of ${bookId}`, 404));
    }

    // Check if the book is available
    if (book.availableCopies <= 0) {
      return next(
        new ErrorResponse('This book is currently not available for borrowing', 400)
      );
    }

    // Check if user already has an active borrow for this book
    const existingBorrow = await Borrow.findOne({
      where: {
        bookId,
        userId: req.user.id,
        status: 'active',
      },
    });

    if (existingBorrow) {
      return next(
        new ErrorResponse(
          'You have already borrowed this book and not returned it yet',
          400
        )
      );
    }

    // Calculate due date (default: 14 days or as specified in the book)
    const borrowDuration = book.borrowDuration || 14; // days
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + borrowDuration);

    // Start transaction
    const transaction = await db.sequelize.transaction();

    try {
      // Create borrow record
      const borrow = await Borrow.create(
        {
          bookId,
          userId: req.user.id,
          dueDate,
          status: 'active',
        },
        { transaction }
      );

      // Decrease available copies
      await book.update(
        {
          availableCopies: book.availableCopies - 1,
        },
        { transaction }
      );

      // Create a notification for the user
      await Notification.create(
        {
          userId: req.user.id,
          title: 'Книга успешно заказана',
          message: `Вы успешно заказали книгу "${book.title}". Срок возврата - ${dueDate.toLocaleDateString()}`,
          type: 'info',
          relatedModel: 'Borrow',
          relatedId: borrow.id,
        },
        { transaction }
      );

      // Commit transaction
      await transaction.commit();

      // Return borrow with book and user details
      const borrowWithDetails = await Borrow.findByPk(borrow.id, {
        include: [
          {
            model: Book,
            as: 'book',
            attributes: ['id', 'title', 'author', 'cover'],
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
        data: borrowWithDetails,
      });
    } catch (err) {
      // Rollback transaction on error
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Return a borrowed book
 * @route   PUT /api/borrows/:id/return
 * @access  Private
 */
exports.returnBook = async (req, res, next) => {
  try {
    let borrow = await Borrow.findByPk(req.params.id, {
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'availableCopies'],
        },
      ],
    });

    if (!borrow) {
      return next(
        new ErrorResponse(`Borrow record not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure the user owns this borrow record or is an admin/librarian
    if (borrow.userId !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'librarian') {
      return next(new ErrorResponse('Not authorized to return this book', 401));
    }

    // Check if book is already returned
    if (borrow.status === 'returned') {
      return next(new ErrorResponse('This book has already been returned', 400));
    }

    // Start transaction
    const transaction = await db.sequelize.transaction();

    try {
      // Update borrow record
      await borrow.update(
        {
          status: 'returned',
          returnDate: new Date(),
        },
        { transaction }
      );

      // Increase available copies of the book
      const book = await Book.findByPk(borrow.bookId, { transaction });
      await book.update(
        {
          availableCopies: book.availableCopies + 1,
        },
        { transaction }
      );

      // Create a notification for the user
      await Notification.create(
        {
          userId: borrow.userId,
          title: 'Книга успешно возвращена',
          message: `Вы успешно вернули книгу "${borrow.book.title}". Спасибо за своевременный возврат!`,
          type: 'info',
          relatedModel: 'Borrow',
          relatedId: borrow.id,
        },
        { transaction }
      );

      // Commit transaction
      await transaction.commit();

      // Get updated borrow record with details
      borrow = await Borrow.findByPk(req.params.id, {
        include: [
          {
            model: Book,
            as: 'book',
            attributes: ['id', 'title', 'author', 'cover'],
          },
        ],
      });

      res.status(200).json({
        success: true,
        data: borrow,
      });
    } catch (err) {
      // Rollback transaction on error
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get current user's borrow history
 * @route   GET /api/borrows
 * @access  Private
 */
exports.getUserBorrows = async (req, res, next) => {
  try {
    // Get status filter from query params
    const { status } = req.query;

    // Build query
    const where = { userId: req.user.id };

    // Filter by status if provided
    if (status && ['active', 'returned', 'overdue'].includes(status)) {
      where.status = status;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: borrows } = await Borrow.findAndCountAll({
      where,
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'cover'],
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
      order: [['borrowDate', 'DESC']],
      limit,
      offset,
    });

    // Pagination result
    const pagination = {};

    if (offset + borrows.length < count) {
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
      count: borrows.length,
      pagination,
      totalPages: Math.ceil(count / limit),
      total: count,
      data: borrows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all borrows (admin or librarian only)
 * @route   GET /api/borrows/all
 * @access  Private/Admin/Librarian
 */
exports.getAllBorrows = async (req, res, next) => {
  try {
    // Filter params
    const { status, userId, bookId, startDate, endDate, overdue } = req.query;

    // Build query
    const where = {};

    // Filter by status
    if (status && ['active', 'returned', 'overdue'].includes(status)) {
      where.status = status;
    }

    // Filter by user ID
    if (userId) {
      where.userId = userId;
    }

    // Filter by book ID
    if (bookId) {
      where.bookId = bookId;
    }

    // Filter by date range
    if (startDate || endDate) {
      where.borrowDate = {};

      if (startDate) {
        where.borrowDate[Op.gte] = new Date(startDate);
      }

      if (endDate) {
        where.borrowDate[Op.lte] = new Date(endDate);
      }
    }

    // Filter overdue borrows
    if (overdue === 'true') {
      where.status = 'active';
      where.dueDate = { [Op.lt]: new Date() };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: borrows } = await Borrow.findAndCountAll({
      where,
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'cover'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'studentId'],
        },
      ],
      order: [['borrowDate', 'DESC']],
      limit,
      offset,
    });

    // Pagination result
    const pagination = {};

    if (offset + borrows.length < count) {
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
      count: borrows.length,
      pagination,
      totalPages: Math.ceil(count / limit),
      total: count,
      data: borrows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get a single borrow record
 * @route   GET /api/borrows/:id
 * @access  Private
 */
exports.getBorrow = async (req, res, next) => {
  try {
    const borrow = await Borrow.findByPk(req.params.id, {
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'cover', 'description'],
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'studentId'],
        },
      ],
    });

    if (!borrow) {
      return next(
        new ErrorResponse(`Borrow record not found with id of ${req.params.id}`, 404)
      );
    }

    // Only allow the owner, admin, or librarian to view the record
    if (borrow.userId !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'librarian') {
      return next(new ErrorResponse('Not authorized to view this borrow record', 401));
    }

    res.status(200).json({
      success: true,
      data: borrow,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update borrow record (admin or librarian only)
 * @route   PUT /api/borrows/:id
 * @access  Private/Admin/Librarian
 */
exports.updateBorrow = async (req, res, next) => {
  try {
    // Only allow updating certain fields
    const { status, dueDate, notes } = req.body;

    const borrow = await Borrow.findByPk(req.params.id, {
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'availableCopies'],
        },
      ],
    });

    if (!borrow) {
      return next(
        new ErrorResponse(`Borrow record not found with id of ${req.params.id}`, 404)
      );
    }

    // Start transaction
    const transaction = await db.sequelize.transaction();

    try {
      const fieldsToUpdate = {};

      if (status && ['active', 'returned', 'overdue'].includes(status)) {
        fieldsToUpdate.status = status;
      }

      if (dueDate) {
        fieldsToUpdate.dueDate = dueDate;
      }

      if (notes !== undefined) {
        fieldsToUpdate.notes = notes;
      }

      // Set returnDate if status is changed to 'returned'
      if (status === 'returned' && borrow.status !== 'returned') {
        fieldsToUpdate.returnDate = new Date();

        // If book is being returned, increase available copies
        const book = await Book.findByPk(borrow.bookId, { transaction });
        await book.update(
          {
            availableCopies: book.availableCopies + 1,
          },
          { transaction }
        );

        // Create a notification for the user
        await Notification.create(
          {
            userId: borrow.userId,
            title: 'Книга отмечена как возвращенная',
            message: `Книга "${borrow.book.title}" была отмечена как возвращенная.`,
            type: 'info',
            relatedModel: 'Borrow',
            relatedId: borrow.id,
          },
          { transaction }
        );
      }

      // Update borrow record
      await borrow.update(fieldsToUpdate, { transaction });

      // Commit transaction
      await transaction.commit();

      // Get updated borrow with details
      const updatedBorrow = await Borrow.findByPk(req.params.id, {
        include: [
          {
            model: Book,
            as: 'book',
            attributes: ['id', 'title', 'author', 'cover'],
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'studentId'],
          },
        ],
      });

      res.status(200).json({
        success: true,
        data: updatedBorrow,
      });
    } catch (err) {
      // Rollback transaction on error
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get overdue borrows and send notifications
 * @route   GET /api/borrows/check-overdue
 * @access  Private/Admin/Librarian
 */
exports.checkOverdueBorrows = async (req, res, next) => {
  try {
    // Find active borrows with due dates in the past
    const overdueBorrows = await Borrow.findAll({
      where: {
        status: 'active',
        dueDate: { [Op.lt]: new Date() },
      },
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    // Update status to 'overdue' and create notifications
    let updatedCount = 0;

    for (const borrow of overdueBorrows) {
      // Start transaction for each borrow
      const transaction = await db.sequelize.transaction();

      try {
        // Only update if not already marked as overdue
        if (borrow.status !== 'overdue') {
          // Update status
          await borrow.update(
            {
              status: 'overdue',
            },
            { transaction }
          );

          // Create notification
          await Notification.create(
            {
              userId: borrow.userId,
              title: 'Просрочен срок возврата книги',
              message: `Срок возврата книги "${borrow.book.title}" истек. Пожалуйста, верните книгу в библиотеку как можно скорее.`,
              type: 'overdue',
              relatedModel: 'Borrow',
              relatedId: borrow.id,
            },
            { transaction }
          );

          // Commit transaction
          await transaction.commit();
          updatedCount++;
        } else {
          // No updates needed, just commit
          await transaction.commit();
        }
      } catch (err) {
        // Rollback transaction on error
        await transaction.rollback();
        throw err;
      }
    }

    res.status(200).json({
      success: true,
      count: overdueBorrows.length,
      updatedCount,
      data: overdueBorrows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get books that will be due soon and send reminders
 * @route   GET /api/borrows/send-reminders
 * @access  Private/Admin/Librarian
 */
exports.sendDueReminders = async (req, res, next) => {
  try {
    // Calculate date for 3 days from now
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const today = new Date();

    // Find active borrows with due dates coming up in the next 3 days
    const upcomingDueBorrows = await Borrow.findAll({
      where: {
        status: 'active',
        dueDate: {
          [Op.gte]: today,
          [Op.lte]: threeDaysFromNow,
        },
      },
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    // Create reminder notifications
    let notificationsCreated = 0;

    for (const borrow of upcomingDueBorrows) {
      // Check if a reminder notification already exists for this borrow
      const existingNotification = await Notification.findOne({
        where: {
          userId: borrow.userId,
          relatedModel: 'Borrow',
          relatedId: borrow.id,
          type: 'return',
          // Only look for recent notifications (last 24 hours)
          createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      // Only create a notification if one doesn't already exist
      if (!existingNotification) {
        // Create new notification
        await Notification.create({
          userId: borrow.userId,
          title: 'Напоминание о сроке возврата книги',
          message: `Срок возврата книги "${borrow.book.title}" наступает ${borrow.dueDate.toLocaleDateString()}. Пожалуйста, верните книгу вовремя.`,
          type: 'return',
          relatedModel: 'Borrow',
          relatedId: borrow.id,
        });

        notificationsCreated++;
      }
    }

    res.status(200).json({
      success: true,
      count: upcomingDueBorrows.length,
      notificationsCreated,
      data: upcomingDueBorrows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get borrow statistics
 * @route   GET /api/borrows/stats
 * @access  Private/Admin
 */
exports.getBorrowStats = async (req, res, next) => {
  try {
    // Get counts for different borrow statuses
    const [activeBorrows, returnedBorrows, overdueBorrows, totalBorrows] = await Promise.all([
      Borrow.count({ where: { status: 'active' } }),
      Borrow.count({ where: { status: 'returned' } }),
      Borrow.count({ where: { status: 'overdue' } }),
      Borrow.count(),
    ]);

    // Get most borrowed books
    const mostBorrowedBooks = await Borrow.findAll({
      attributes: [
        'bookId',
        [db.sequelize.fn('COUNT', db.sequelize.col('bookId')), 'borrowCount'],
      ],
      group: ['bookId'],
      order: [[db.sequelize.literal('borrowCount'), 'DESC']],
      limit: 5,
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'cover'],
        },
      ],
    });

    // Get most active borrowers
    const mostActiveBorrowers = await Borrow.findAll({
      attributes: [
        'userId',
        [db.sequelize.fn('COUNT', db.sequelize.col('userId')), 'borrowCount'],
      ],
      group: ['userId'],
      order: [[db.sequelize.literal('borrowCount'), 'DESC']],
      limit: 5,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'studentId'],
        },
      ],
    });

    res.status(200).json({
      success: true,
      data: {
        counts: {
          active: activeBorrows,
          returned: returnedBorrows,
          overdue: overdueBorrows,
          total: totalBorrows,
        },
        mostBorrowedBooks,
        mostActiveBorrowers,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Extend borrow period
 * @route   PUT /api/borrows/:id/extend
 * @access  Private
 */
exports.extendBorrow = async (req, res, next) => {
  try {
    const borrow = await Borrow.findByPk(req.params.id, {
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'borrowDuration'],
        },
      ],
    });

    if (!borrow) {
      return next(
        new ErrorResponse(`Borrow record not found with id of ${req.params.id}`, 404)
      );
    }

    // Only the borrower or admin/librarian can extend
    if (borrow.userId !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'librarian') {
      return next(new ErrorResponse('Not authorized to extend this borrow', 401));
    }

    // Check if borrow is active
    if (borrow.status !== 'active') {
      return next(
        new ErrorResponse('Only active borrows can be extended', 400)
      );
    }

    // Check if borrow is already overdue
    if (new Date() > borrow.dueDate) {
      return next(
        new ErrorResponse('Overdue borrows cannot be extended', 400)
      );
    }

    // Calculate new due date (add 7 days or book's borrowDuration/2)
    const extensionDays = borrow.book.borrowDuration 
      ? Math.ceil(borrow.book.borrowDuration / 2) 
      : 7;
    
    const newDueDate = new Date(borrow.dueDate);
    newDueDate.setDate(newDueDate.getDate() + extensionDays);

    // Start transaction
    const transaction = await db.sequelize.transaction();

    try {
      // Update due date
      await borrow.update(
        {
          dueDate: newDueDate,
        },
        { transaction }
      );

      // Create notification
      await Notification.create(
        {
          userId: borrow.userId,
          title: 'Срок возврата книги продлен',
          message: `Срок возврата книги "${borrow.book.title}" был продлен до ${newDueDate.toLocaleDateString()}.`,
          type: 'info',
          relatedModel: 'Borrow',
          relatedId: borrow.id,
        },
        { transaction }
      );

      // Commit transaction
      await transaction.commit();

      // Get updated borrow
      const updatedBorrow = await Borrow.findByPk(req.params.id, {
        include: [
          {
            model: Book,
            as: 'book',
            attributes: ['id', 'title', 'author', 'cover'],
          },
        ],
      });

      res.status(200).json({
        success: true,
        data: updatedBorrow,
      });
    } catch (err) {
      // Rollback transaction on error
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};