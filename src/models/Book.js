module.exports = (sequelize, DataTypes) => {
    const Book = sequelize.define('Book', {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Please add a title'
          },
          len: {
            args: [2, 100],
            msg: 'Title must be between 2 and 100 characters'
          }
        }
      },
      author: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Please add an author'
          },
          len: {
            args: [2, 100],
            msg: 'Author name must be between 2 and 100 characters'
          }
        }
      },
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Categories',
          key: 'id'
        },
        validate: {
          notNull: {
            msg: 'Please add a category'
          }
        }
      },
      cover: {
        type: DataTypes.STRING,
        defaultValue: 'default-book-cover.jpg'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Please add a description'
          }
        }
      },
      publicationYear: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'Please add a publication year'
          },
          isInt: {
            msg: 'Publication year must be a number'
          }
        }
      },
      language: {
        type: DataTypes.ENUM('Русский', 'Английский', 'Казахский'),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Please add a language'
          }
        }
      },
      totalCopies: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: {
            args: [0],
            msg: 'Total copies cannot be negative'
          }
        }
      },
      availableCopies: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: {
            args: [0],
            msg: 'Available copies cannot be negative'
          }
        }
      },
      isbn: {
        type: DataTypes.STRING,
        validate: {
          is: {
            args: /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/,
            msg: 'Please provide a valid ISBN'
          }
        }
      },
      rating: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: 'Rating cannot be lower than 0'
          },
          max: {
            args: [5],
            msg: 'Rating cannot be higher than 5'
          }
        }
      },
      reviewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      borrowDuration: {
        type: DataTypes.INTEGER,
        defaultValue: 14, // Default borrow duration in days
        allowNull: false,
        validate: {
          min: {
            args: [1],
            msg: 'Borrow duration must be at least 1 day'
          }
        }
      }
    }, {
      indexes: [
        // Full-text search index
        {
          type: 'FULLTEXT',
          name: 'book_search_idx',
          fields: ['title', 'author', 'description']
        }
      ]
    });
  
    // Associate with other models
    Book.associate = (models) => {
      Book.belongsTo(models.Category, {
        foreignKey: 'categoryId',
        as: 'category'
      });
      Book.hasMany(models.Bookmark, {
        foreignKey: 'bookId',
        as: 'bookmarks',
        onDelete: 'CASCADE'
      });
      Book.hasMany(models.Borrow, {
        foreignKey: 'bookId',
        as: 'borrows',
        onDelete: 'CASCADE'
      });
    };
  
    // Virtual method to check if book is available
    Book.prototype.isAvailable = function() {
      return this.availableCopies > 0;
    };
  
    return Book;
  };