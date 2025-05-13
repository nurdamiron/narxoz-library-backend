/**
 * EventCategory model
 * 
 * Represents categories for events (Academic, Social, Career, etc.)
 * Can be used to filter and group events
 */

module.exports = (sequelize, DataTypes) => {
  const EventCategory = sequelize.define('EventCategory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Category name cannot be empty'
        },
        len: {
          args: [2, 100],
          msg: 'Category name must be between 2 and 100 characters'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    tableName: 'event_categories',
    timestamps: true,
  });

  EventCategory.associate = (models) => {
    // Category can belong to many events
    EventCategory.belongsToMany(models.Event, {
      through: 'EventCategoryRelation',
      foreignKey: 'categoryId',
      otherKey: 'eventId',
      as: 'events'
    });
  };

  return EventCategory;
};