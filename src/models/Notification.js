module.exports = (sequelize, DataTypes) => {
    const Notification = sequelize.define('Notification', {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Please add a notification title'
          },
          len: {
            args: [2, 100],
            msg: 'Title must be between 2 and 100 characters'
          }
        }
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Please add a notification message'
          }
        }
      },
      type: {
        type: DataTypes.ENUM('info', 'warning', 'return', 'overdue', 'system'),
        defaultValue: 'info'
      },
      relatedModel: {
        type: DataTypes.STRING,
        validate: {
          isIn: {
            args: [['Book', 'Borrow', '']],
            msg: 'Related model must be Book, Borrow, or empty'
          }
        },
        defaultValue: ''
      },
      relatedId: {
        type: DataTypes.INTEGER,
        defaultValue: null
      },
      read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    }, {
      indexes: [
        // Index for faster queries based on user and read status
        {
          fields: ['userId', 'read', 'createdAt']
        }
      ]
    });
  
    // Associate with other models
    Notification.associate = (models) => {
      Notification.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      
      // Polymorphic associations based on relatedModel field
      Notification.belongsTo(models.Book, {
        foreignKey: 'relatedId',
        constraints: false,
        as: 'book',
        scope: {
          relatedModel: 'Book'
        }
      });
      
      Notification.belongsTo(models.Borrow, {
        foreignKey: 'relatedId',
        constraints: false,
        as: 'borrow',
        scope: {
          relatedModel: 'Borrow'
        }
      });
    };
  
    return Notification;
  };