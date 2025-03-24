/**
 * Бетбелгі моделі
 * 
 * @description Бұл модель пайдаланушылардың кітаптарға жасаған бетбелгілерін сақтайды.
 * Ол пайдаланушы мен кітап арасындағы көп-көпке байланысты қамтамасыз етеді,
 * пайдаланушыларға өздерінің сүйікті кітаптарын белгілеуге және оларға жылдам қол 
 * жеткізуге мүмкіндік береді.
 */
module.exports = (sequelize, DataTypes) => {
  const Bookmark = sequelize.define('Bookmark', {
    /**
     * Пайдаланушы идентификаторы
     * 
     * @description Бетбелгіні жасаған пайдаланушыға сілтеме
     */
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    
    /**
     * Кітап идентификаторы
     * 
     * @description Бетбелгі жасалған кітапқа сілтеме
     */
    bookId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Books',
        key: 'id'
      }
    },
    
    /**
     * Қосылған уақыты
     * 
     * @description Бетбелгі жасалған уақыт
     */
    addedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    indexes: [
      // Пайдаланушы бір кітапты тек бір рет бетбелгіге қоса алатынын қамтамасыз ету
      {
        unique: true,
        fields: ['userId', 'bookId']
      }
    ]
  });

  /**
   * Басқа модельдермен байланыстар
   * 
   * @description Бетбелгі моделінің басқа модельдермен байланыстарын орнатады
   */
  Bookmark.associate = (models) => {
    // Пайдаланушымен байланыс
    Bookmark.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    // Кітаппен байланыс
    Bookmark.belongsTo(models.Book, {
      foreignKey: 'bookId',
      as: 'book'
    });
  };

  return Bookmark;
};