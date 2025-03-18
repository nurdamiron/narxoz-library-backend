const User = require('./User');
const Book = require('./Book');
const Category = require('./Category');
const Language = require('./Language');
const Borrow = require('./Borrow');
const BookCopy = require('./BookCopy');
const Notification = require('./Notification');
const Review = require('./Review');
const Bookmark = require('./Bookmark');

// Определение связей между моделями
// Связи для User
User.hasMany(Borrow, { foreignKey: 'user_id' });
User.hasMany(Review, { foreignKey: 'user_id' });
User.hasMany(Bookmark, { foreignKey: 'user_id' });
User.hasMany(Notification, { foreignKey: 'user_id' });

// Связи для Book
Book.belongsTo(Category, { foreignKey: 'category_id' });
Book.belongsTo(Language, { foreignKey: 'language_id' });
Book.hasMany(BookCopy, { foreignKey: 'book_id' });
Book.hasMany(Borrow, { foreignKey: 'book_id' });
Book.hasMany(Review, { foreignKey: 'book_id' });
Book.hasMany(Bookmark, { foreignKey: 'book_id' });

// Связи для Borrow
Borrow.belongsTo(User, { foreignKey: 'user_id' });
Borrow.belongsTo(Book, { foreignKey: 'book_id' });

// Связи для BookCopy
BookCopy.belongsTo(Book, { foreignKey: 'book_id' });

// Связи для Category
Category.hasMany(Book, { foreignKey: 'category_id' });

// Связи для Language
Language.hasMany(Book, { foreignKey: 'language_id' });

// Связи для Review
Review.belongsTo(User, { foreignKey: 'user_id' });
Review.belongsTo(Book, { foreignKey: 'book_id' });

// Связи для Bookmark
Bookmark.belongsTo(User, { foreignKey: 'user_id' });
Bookmark.belongsTo(Book, { foreignKey: 'book_id' });

// Связи для Notification
Notification.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  User,
  Book,
  Category,
  Language,
  Borrow,
  BookCopy,
  Notification,
  Review,
  Bookmark
};