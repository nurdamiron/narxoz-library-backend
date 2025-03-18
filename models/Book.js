const { sequelize, Sequelize } = require('../config/database');
const { DataTypes } = Sequelize;

const Book = sequelize.define('Book', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  author: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cover: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  language_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'languages',
      key: 'id'
    }
  },
  publication_year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  total_copies: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  available_copies: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  isbn: {
    type: DataTypes.STRING(20),
    allowNull: true
  }
}, {
  tableName: 'books',
  timestamps: true,
  underscored: true
});

module.exports = Book;