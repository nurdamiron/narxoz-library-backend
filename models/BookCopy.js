const { sequelize, Sequelize } = require('../config/database');
const { DataTypes } = Sequelize;

const BookCopy = sequelize.define('BookCopy', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  book_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'books',
      key: 'id'
    }
  },
  inventory_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Инвентарный номер экземпляра книги'
  },
  status: {
    type: DataTypes.ENUM('available', 'borrowed', 'reserved', 'lost', 'damaged', 'in_processing'),
    defaultValue: 'available',
    allowNull: false
  },
  condition: {
    type: DataTypes.ENUM('new', 'good', 'fair', 'poor'),
    defaultValue: 'good',
    allowNull: false
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Местоположение экземпляра (стеллаж, полка и т.д.)'
  },
  acquisition_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Дата приобретения экземпляра'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Дополнительные заметки о экземпляре'
  }
}, {
  tableName: 'book_copies',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['book_id'],
      name: 'book_copies_book_id_idx'
    },
    {
      fields: ['status'],
      name: 'book_copies_status_idx'
    }
  ]
});

module.exports = BookCopy;