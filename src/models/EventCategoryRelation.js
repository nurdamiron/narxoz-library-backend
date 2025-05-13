/**
 * EventCategoryRelation model
 * 
 * Junction table for many-to-many relationship between Events and EventCategories
 */

module.exports = (sequelize, DataTypes) => {
  const EventCategoryRelation = sequelize.define('EventCategoryRelation', {
    eventId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    }
  }, {
    tableName: 'event_category_relations',
    timestamps: true,
    indexes: [
      {
        name: 'event_category_relations_event_id_index',
        fields: ['eventId']
      },
      {
        name: 'event_category_relations_category_id_index',
        fields: ['categoryId']
      }
    ]
  });

  return EventCategoryRelation;
};