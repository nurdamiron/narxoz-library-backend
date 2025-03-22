module.exports = (sequelize, DataTypes) => {
    const Borrow = sequelize.define('Borrow', {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      bookId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Books',
          key: 'id'
        }
      },
      borrowDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'Please add a due date'
          },
          isDate: {
            msg: 'Please provide a valid date'
          }
        }
      },
      returnDate: {
        type: DataTypes.DATE,
        defaultValue: null
      },
      status: {
        type: DataTypes.ENUM('active', 'returned', 'overdue'),
        defaultValue: 'active'
      },
      notes: {
        type: DataTypes.TEXT
      }
    }, {
      hooks: {
        beforeSave: async (borrow) => {
          // Update status to 'overdue' if it's past the due date
          if (!borrow.returnDate && new Date() > borrow.dueDate && borrow.status !== 'overdue') {
            borrow.status = 'overdue';
          }
        },
        afterCreate: async (borrow, options) => {
          try {
            // Decrease available copies when a book is borrowed
            const Book = sequelize.models.Book;
            const book = await Book.findByPk(borrow.bookId);
            
            if (book && book.availableCopies > 0) {
              book.availableCopies -= 1;
              await book.save({ transaction: options.transaction });
            }
          } catch (err) {
            console.error('Error updating book availability:', err);
          }
        },
        afterUpdate: async (borrow, options) => {
          try {
            // If book was returned, increment available copies
            if (borrow.changed('status') && borrow.status === 'returned') {
              const Book = sequelize.models.Book;
              const book = await Book.findByPk(borrow.bookId);
              
              if (book) {
                book.availableCopies += 1;
                await book.save({ transaction: options.transaction });
              }
            }
          } catch (err) {
            console.error('Error updating book availability:', err);
          }
        }
      }
    });
  
    // Associate with other models
    Borrow.associate = (models) => {
      Borrow.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      Borrow.belongsTo(models.Book, {
        foreignKey: 'bookId',
        as: 'book'
      });
      Borrow.hasMany(models.Notification, {
        foreignKey: 'relatedId',
        constraints: false,
        scope: {
          relatedModel: 'Borrow'
        },
        as: 'notifications'
      });
    };
  
    // Virtual method to check if borrow is overdue
    Borrow.prototype.isOverdue = function() {
      if (this.returnDate) {
        return false;
      }
      return new Date() > this.dueDate;
    };
  
    return Borrow;
  };