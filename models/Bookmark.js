const { sequelize, Sequelize } = require('../config/database');
const { DataTypes } = Sequelize;

const Bookmark = sequelize.define('Bookmark', {
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
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Заметка пользователя о книге'
  }
}, {
  tableName: 'bookmarks',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'book_id'],
      name: 'bookmarks_user_book_unique'
    }
  ]
});

module.exports = Bookmark;