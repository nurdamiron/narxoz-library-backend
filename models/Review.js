const { sequelize, Sequelize } = require('../config/database');
const { DataTypes } = Sequelize;

const Review = sequelize.define('Review', {
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
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Модерация рецензий перед публикацией'
  },
  is_moderated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Отметка о проверке модератором'
  },
  moderation_comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Комментарий модератора в случае отклонения рецензии'
  }
}, {
  tableName: 'reviews',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'book_id'],
      name: 'reviews_user_book_unique'
    }
  ]
});

module.exports = Review;