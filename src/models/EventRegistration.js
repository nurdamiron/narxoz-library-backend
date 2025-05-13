/**
 * EventRegistration model
 * 
 * Represents a user's registration for an event
 * Tracks registration status (registered, attended, cancelled)
 */

module.exports = (sequelize, DataTypes) => {
  const EventRegistration = sequelize.define('EventRegistration', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('registered', 'attended', 'cancelled'),
      allowNull: false,
      defaultValue: 'registered',
      validate: {
        isIn: {
          args: [['registered', 'attended', 'cancelled']],
          msg: 'Status must be registered, attended, or cancelled'
        }
      }
    },
    registrationDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'event_registrations',
    timestamps: true,
    indexes: [
      {
        name: 'event_registrations_event_id_user_id_index',
        unique: true,
        fields: ['eventId', 'userId']
      },
      {
        name: 'event_registrations_event_id_index',
        fields: ['eventId']
      },
      {
        name: 'event_registrations_user_id_index',
        fields: ['userId']
      }
    ]
  });

  EventRegistration.associate = (models) => {
    // Registration belongs to an Event
    EventRegistration.belongsTo(models.Event, {
      foreignKey: 'eventId',
      as: 'event'
    });

    // Registration belongs to a User
    EventRegistration.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return EventRegistration;
};