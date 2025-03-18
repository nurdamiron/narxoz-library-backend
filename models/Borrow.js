const { sequelize, Sequelize } = require('../config/database');
const { DataTypes } = Sequelize;

const Borrow = sequelize.define('Borrow', {
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
  book_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'books',
      key: 'id'
    }
  },
  borrow_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  return_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'returned', 'overdue'),
    defaultValue: 'active'
  }
}, {
  tableName: 'borrow_records',
  timestamps: true,
  underscored: true
});

module.exports = Borrow;