/**
 * Event model
 * 
 * Represents an event or workshop in the library system
 * Events can be workshops, lectures, exhibitions, or other gatherings
 * Users can register to attend events with limited capacity
 */

module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Title cannot be empty'
        },
        len: {
          args: [3, 200],
          msg: 'Title must be between 3 and 200 characters'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Description cannot be empty'
        }
      }
    },
    type: {
      type: DataTypes.ENUM('workshop', 'lecture', 'exhibition', 'meetup', 'other'),
      allowNull: false,
      defaultValue: 'workshop',
      validate: {
        isIn: {
          args: [['workshop', 'lecture', 'exhibition', 'meetup', 'other']],
          msg: 'Event type must be workshop, lecture, exhibition, meetup, or other'
        }
      }
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Location cannot be empty'
        }
      }
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: {
          msg: 'Start date must be a valid date'
        },
        isAfter: {
          args: new Date().toString(),
          msg: 'Start date must be in the future'
        }
      }
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: {
          msg: 'End date must be a valid date'
        },
        isLaterThanStartDate(value) {
          if (new Date(value) <= new Date(this.startDate)) {
            throw new Error('End date must be after start date');
          }
        }
      }
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: {
          msg: 'Capacity must be a number'
        },
        min: {
          args: [1],
          msg: 'Capacity must be at least 1'
        }
      }
    },
    registrationDeadline: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: {
          msg: 'Registration deadline must be a valid date'
        },
        isBeforeStartDate(value) {
          if (new Date(value) > new Date(this.startDate)) {
            throw new Error('Registration deadline must be before start date');
          }
        }
      }
    },
    image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    imageStoredLocally: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    }
  }, {
    tableName: 'events',
    timestamps: true,
    indexes: [
      {
        name: 'events_created_by_index',
        fields: ['createdBy']
      },
      {
        name: 'events_start_date_index',
        fields: ['startDate']
      }
    ]
  });

  Event.associate = (models) => {
    // Event belongs to a User (creator)
    Event.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    // Event can have many registrations
    Event.hasMany(models.EventRegistration, {
      foreignKey: 'eventId',
      as: 'registrations'
    });

    // Event can belong to many categories
    Event.belongsToMany(models.EventCategory, {
      through: 'EventCategoryRelation',
      foreignKey: 'eventId',
      otherKey: 'categoryId',
      as: 'categories'
    });

    // Event can have many notifications - using polymorphic relationship
    Event.hasMany(models.Notification, {
      foreignKey: 'relatedId',
      constraints: false,
      scope: {
        relatedModel: 'Event'
      },
      as: 'notifications'
    });
  };

  return Event;
};