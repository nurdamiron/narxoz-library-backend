/**
 * Пікір моделі
 * 
 * @description Бұл модель кітаптар туралы пайдаланушы пікірлерін сақтайды.
 * Ол пікірлерді модерациялауға, рейтингтер мен мәтіндік шолуларды басқаруға мүмкіндік береді.
 */
module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define('Review', {
    /**
     * Кітап идентификаторы
     * 
     * @description Пікір берілген кітапқа сілтеме
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
     * Пайдаланушы идентификаторы
     * 
     * @description Пікір қалдырған пайдаланушыға сілтеме
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
     * Рейтинг
     * 
     * @description Пайдаланушының берген рейтингі (1-5)
     */
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'Рейтинг кем дегенде 1 болуы керек'
        },
        max: {
          args: [5],
          msg: 'Рейтинг 5-тен аспауы керек'
        }
      }
    },
    
    /**
     * Пікір мәтіні
     * 
     * @description Пайдаланушының кітап туралы пікірі
     */
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Пікір мәтінін енгізіңіз'
        },
        len: {
          args: [10, 500],
          msg: 'Пікір мәтіні 10-500 таңба аралығында болуы керек'
        }
      }
    },
    
    /**
     * Бекітілген бе
     * 
     * @description Әкімші тарапынан пікір бекітілген бе
     */
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    
    /**
     * Шағымданылған ба
     * 
     * @description Пікірге шағым түскен бе
     */
    isReported: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    
    /**
     * Шағым себебі
     * 
     * @description Пікірге шағым түскен жағдайда оның себебі
     */
    reportReason: {
      type: DataTypes.STRING
    }
  }, {
    hooks: {
      /**
       * Жасалғаннан кейінгі әрекет
       * 
       * @description Жаңа пікір жасалған кезде кітаптың орташа рейтингін және пікірлер санын жаңартады
       */
      afterCreate: async (review, options) => {
        try {
          // Кітаптың орташа рейтингі мен пікірлер санын жаңарту
          const Book = sequelize.models.Book;
          const book = await Book.findByPk(review.bookId);
          
          if (book) {
            // Кітап үшін барлық пікірлерді есептеу
            const reviews = await Review.findAll({
              where: { bookId: review.bookId, isApproved: true }
            });
            
            // Жаңа орташа рейтингті есептеу
            const newRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
            
            // Кітап рейтингін және пікірлер санын жаңарту
            book.rating = newRating;
            book.reviewCount = reviews.length;
            await book.save({ transaction: options.transaction });
          }
        } catch (err) {
          console.error('Кітап рейтингін жаңарту кезінде қате орын алды:', err);
        }
      },
      
      /**
       * Өзгертілгеннен кейінгі әрекет
       * 
       * @description Пікір өзгертілген кезде кітаптың орташа рейтингін жаңартады
       */
      afterUpdate: async (review, options) => {
        try {
          // Егер рейтинг немесе бекіту мәртебесі өзгертілген болса, кітаптың рейтингін жаңарту
          if (review.changed('rating') || review.changed('isApproved')) {
            const Book = sequelize.models.Book;
            const book = await Book.findByPk(review.bookId);
            
            if (book) {
              // Кітап үшін барлық бекітілген пікірлерді есептеу
              const reviews = await Review.findAll({
                where: { bookId: review.bookId, isApproved: true }
              });
              
              // Орташа рейтингті есептеу
              const newRating = reviews.length > 0 
                ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length 
                : 0;
              
              // Кітап рейтингін және пікірлер санын жаңарту
              book.rating = newRating;
              book.reviewCount = reviews.length;
              await book.save({ transaction: options.transaction });
            }
          }
        } catch (err) {
          console.error('Кітап рейтингін жаңарту кезінде қате орын алды:', err);
        }
      },
      
      /**
       * Жойылғаннан кейінгі әрекет
       * 
       * @description Пікір жойылған кезде кітаптың орташа рейтингін және пікірлер санын жаңартады
       */
      afterDestroy: async (review, options) => {
        try {
          const Book = sequelize.models.Book;
          const book = await Book.findByPk(review.bookId);
          
          if (book) {
            // Қалған бекітілген пікірлерді есептеу
            const reviews = await Review.findAll({
              where: { bookId: review.bookId, isApproved: true }
            });
            
            // Жаңа орташа рейтингті есептеу
            const newRating = reviews.length > 0 
              ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length 
              : 0;
            
            // Кітап рейтингін және пікірлер санын жаңарту
            book.rating = newRating;
            book.reviewCount = reviews.length;
            await book.save({ transaction: options.transaction });
          }
        } catch (err) {
          console.error('Кітап рейтингін жаңарту кезінде қате орын алды:', err);
        }
      }
    }
  });

  /**
   * Басқа модельдермен байланыстар
   * 
   * @description Пікір моделінің басқа модельдермен байланыстарын орнатады
   */
  Review.associate = (models) => {
    // Кітаппен байланыс
    Review.belongsTo(models.Book, {
      foreignKey: 'bookId',
      as: 'book'
    });
    
    // Пайдаланушымен байланыс
    Review.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Review;
};