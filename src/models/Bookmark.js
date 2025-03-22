module.exports = (sequelize, DataTypes) => {
    const Bookmark = sequelize.define('Bookmark', {
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
      addedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      indexes: [
        // Ensure a user can only bookmark a book once
        {
          unique: true,
          fields: ['userId', 'bookId']
        }
      ]
    });
  
    // Associate with other models
    Bookmark.associate = (models) => {
      Bookmark.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      Bookmark.belongsTo(models.Book, {
        foreignKey: 'bookId',
        as: 'book'
      });
    };
  
    return Bookmark;
  };