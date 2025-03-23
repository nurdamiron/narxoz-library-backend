/**
 * Қарызға алу моделі
 * 
 * @description Бұл модель пайдаланушылардың кітаптарды қарызға алу оқиғаларын сақтайды.
 * Ол кітаптың қарызға алынған күнін, қайтарылуы тиіс күнін және кітаптың нақты қайтарылған 
 * күнін қадағалайды, сондай-ақ қарызға алу мәртебесін басқарады.
 */
module.exports = (sequelize, DataTypes) => {
  const Borrow = sequelize.define('Borrow', {
    /**
     * Пайдаланушы идентификаторы
     * 
     * @description Кітапты қарызға алған пайдаланушыға сілтеме
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
     * @description Қарызға алынған кітапқа сілтеме
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
     * Қарызға алу күні
     * 
     * @description Кітап қарызға алынған күн
     */
    borrowDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    
    /**
     * Қайтару мерзімі
     * 
     * @description Кітапты қайтару қажет күн
     */
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Қайтару мерзімін енгізіңіз'
        },
        isDate: {
          msg: 'Жарамды күнді енгізіңіз'
        }
      }
    },
    
    /**
     * Қайтарылған күн
     * 
     * @description Кітаптың нақты қайтарылған күні
     */
    returnDate: {
      type: DataTypes.DATE,
      defaultValue: null
    },
    
    /**
     * Мәртебесі
     * 
     * @description Қарызға алудың ағымдағы мәртебесі
     */
    status: {
      type: DataTypes.ENUM('active', 'returned', 'overdue'),
      defaultValue: 'active'
    },
    
    /**
     * Ескертпелер
     * 
     * @description Қарызға алу туралы қосымша ескертпелер
     */
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    hooks: {
      /**
       * Сақтау алдындағы әрекет
       * 
       * @description Сақтау алдында қарызға алу мәртебесін жаңартады
       */
      beforeSave: async (borrow) => {
        // Егер қайтару мерзімі өтіп кетсе және әлі қайтарылмаса, мәртебені 'overdue' етіп өзгерту
        if (!borrow.returnDate && new Date() > borrow.dueDate && borrow.status !== 'overdue') {
          borrow.status = 'overdue';
        }
      },
      
      /**
       * Жасалғаннан кейінгі әрекет
       * 
       * @description Жаңа қарызға алу жасалған кезде кітаптың қолжетімді данасын азайтады
       */
      afterCreate: async (borrow, options) => {
        try {
          // Кітап қарызға алынған кезде қолжетімді даналар санын азайту
          const Book = sequelize.models.Book;
          const book = await Book.findByPk(borrow.bookId);
          
          if (book && book.availableCopies > 0) {
            book.availableCopies -= 1;
            await book.save({ transaction: options.transaction });
          }
        } catch (err) {
          console.error('Кітап қолжетімділігін жаңарту кезінде қате орын алды:', err);
        }
      },
      
      /**
       * Жаңартылғаннан кейінгі әрекет
       * 
       * @description Қарызға алу мәртебесі өзгерген кезде кітаптың қолжетімді даналар санын жаңартады
       */
      afterUpdate: async (borrow, options) => {
        try {
          // Егер кітап қайтарылған болса, қолжетімді даналар санын көбейту
          if (borrow.changed('status') && borrow.status === 'returned') {
            const Book = sequelize.models.Book;
            const book = await Book.findByPk(borrow.bookId);
            
            if (book) {
              book.availableCopies += 1;
              await book.save({ transaction: options.transaction });
            }
          }
        } catch (err) {
          console.error('Кітап қолжетімділігін жаңарту кезінде қате орын алды:', err);
        }
      }
    }
  });

  /**
   * Басқа модельдермен байланыстар
   * 
   * @description Қарызға алу моделінің басқа модельдермен байланыстарын орнатады
   */
  Borrow.associate = (models) => {
    // Пайдаланушымен байланыс
    Borrow.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    // Кітаппен байланыс
    Borrow.belongsTo(models.Book, {
      foreignKey: 'bookId',
      as: 'book'
    });
    
    // Хабарландырулармен байланыс
    Borrow.hasMany(models.Notification, {
      foreignKey: 'relatedId',
      constraints: false,
      scope: {
        relatedModel: 'Borrow'
      },
      as: 'notifications'
    });
  };

  /**
   * Қарызға алу мерзімінің өткенін тексеру
   * 
   * @description Қарызға алу мерзімінің өтіп кеткенін тексеретін виртуалды әдіс
   * @returns {Boolean} - Қарызға алу мерзімі өткен-өтпегенін көрсетеді
   */
  Borrow.prototype.isOverdue = function() {
    if (this.returnDate) {
      return false;
    }
    return new Date() > this.dueDate;
  };

  return Borrow;
};