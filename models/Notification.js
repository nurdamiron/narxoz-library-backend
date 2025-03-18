const { sequelize, Sequelize } = require('../config/database');
const { DataTypes } = Sequelize;

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Тип уведомления: borrow, return, overdue, reminder, etc.'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  related_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID связанного объекта (например, ID выдачи книги)'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Дополнительные данные уведомления в формате JSON'
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id', 'created_at'],
      name: 'notifications_user_date_idx'
    },
    {
      fields: ['is_read'],
      name: 'notifications_is_read_idx'
    }
  ]
});

module.exports = Notification;