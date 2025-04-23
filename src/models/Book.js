/**
 * Кітап моделі
 * 
 * @description Бұл модель кітапхана жүйесіндегі кітаптар туралы ақпаратты сақтайды.
 * Ол кітаптың атауы, авторы, сипаттамасы және т.б. сияқты барлық қажетті ақпаратты қамтиды.
 */
module.exports = (sequelize, DataTypes) => {
  const Book = sequelize.define('Book', {
    /**
     * Кітап атауы
     * 
     * @description Кітаптың толық атауы
     */
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Кітап атауын енгізіңіз'
        },
        len: {
          args: [2, 100],
          msg: 'Атау 2-100 таңба аралығында болуы керек'
        }
      }
    },
    
    /**
     * Кітап авторы
     * 
     * @description Кітаптың авторының толық аты
     */
    author: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Автор атын енгізіңіз'
        },
        len: {
          args: [2, 100],
          msg: 'Автор аты 2-100 таңба аралығында болуы керек'
        }
      }
    },
    
    /**
     * Категория идентификаторы
     * 
     * @description Кітап тиесілі категорияға сілтеме
     */
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Categories',
        key: 'id'
      },
      validate: {
        notNull: {
          msg: 'Категорияны таңдаңыз'
        }
      }
    },
    
    /**
     * Кітап мұқабасы
     * 
     * @description Кітап мұқабасының сурет файлының жолы
     */
    coverUrl: {
      type: DataTypes.STRING,
      defaultValue: '/uploads/covers/default-book-cover.jpg'
    },
    
    /**
     * Кітап сипаттамасы
     * 
     * @description Кітаптың толық сипаттамасы
     */
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Сипаттама енгізіңіз'
        }
      }
    },
    
    /**
     * Жарияланған жылы
     * 
     * @description Кітаптың жарияланған жылы
     */
    publicationYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Жарияланған жылды енгізіңіз'
        },
        isInt: {
          msg: 'Жарияланған жыл сан болуы керек'
        }
      }
    },
    
    /**
     * Кітап тілі
     * 
     * @description Кітап жазылған тіл
     */
    language: {
      type: DataTypes.ENUM('Русский', 'Английский', 'Казахский'),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Тілді таңдаңыз'
        }
      }
    },
    
    /**
     * Жалпы даналар саны
     * 
     * @description Кітапхананың иелігіндегі осы кітаптың жалпы даналар саны
     */
    totalCopies: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: {
          args: [0],
          msg: 'Жалпы даналар саны теріс болмауы керек'
        }
      }
    },
    
    /**
     * Қолжетімді даналар саны
     * 
     * @description Қазіргі уақытта қарызға алуға қолжетімді кітап даналарының саны
     */
    availableCopies: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: {
          args: [0],
          msg: 'Қолжетімді даналар саны теріс болмауы керек'
        }
      }
    },
    
    /**
     * ISBN нөмірі
     * 
     * @description Кітаптың халықаралық стандартты кітап нөмірі
     */
    isbn: {
      type: DataTypes.STRING,
      validate: {
        isValidISBN(value) {
          if (!value || value.trim() === '') {
            return; // ISBN міндетті емес
          }
          
          // Барлық сызықшалар мен бос орындарды жою
          const cleanedISBN = value.replace(/[-\s]/g, '');
          
          // ISBN ұзындығын тексеру
          if (cleanedISBN.length !== 10 && cleanedISBN.length !== 13) {
            throw new Error('Жарамды ISBN нөмірін енгізіңіз');
          }
          
          // ISBN форматын тексеру
          if (cleanedISBN.length === 10) {
            if (!/^[0-9]{9}[0-9X]$/.test(cleanedISBN)) {
              throw new Error('Жарамды ISBN нөмірін енгізіңіз');
            }
          } else {
            if (!/^[0-9]{13}$/.test(cleanedISBN)) {
              throw new Error('Жарамды ISBN нөмірін енгізіңіз');
            }
          }
        }
      }
    },
    
    /**
     * Рейтинг
     * 
     * @description Кітаптың орташа пайдаланушы рейтингі
     */
    rating: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Рейтинг 0-ден төмен болмауы керек'
        },
        max: {
          args: [5],
          msg: 'Рейтинг 5-тен жоғары болмауы керек'
        }
      }
    },
    
    /**
     * Пікірлер саны
     * 
     * @description Кітап алған пікірлер саны
     */
    reviewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    /**
     * Қарызға алу ұзақтығы
     * 
     * @description Осы кітапты қарызға алу үшін әдепкі күндер саны
     */
    borrowDuration: {
      type: DataTypes.INTEGER,
      defaultValue: 14, // Әдепкі қарызға алу ұзақтығы - 14 күн
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'Қарызға алу ұзақтығы кем дегенде 1 күн болуы керек'
        }
      }
    }
  }, {
    indexes: [
      // Толық мәтінді іздеу индексі
      {
        type: 'FULLTEXT',
        name: 'book_search_idx',
        fields: ['title', 'author', 'description']
      }
    ]
  });

  /**
   * Басқа модельдермен байланыстар
   * 
   * @description Кітап моделінің басқа модельдермен байланыстарын орнатады
   */
  Book.associate = (models) => {
    // Категориямен байланыс
    Book.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category'
    });
    
    // Бетбелгілермен байланыс
    Book.hasMany(models.Bookmark, {
      foreignKey: 'bookId',
      as: 'bookmarks',
      onDelete: 'CASCADE'
    });
    
    // Қарызға алулармен байланыс
    Book.hasMany(models.Borrow, {
      foreignKey: 'bookId',
      as: 'borrows',
      onDelete: 'CASCADE'
    });
  };

  /**
   * Кітаптың қолжетімді екенін тексеру
   * 
   * @description Кітаптың қарызға алуға қолжетімді екенін тексеретін виртуалды әдіс
   * @returns {Boolean} - Кітаптың қолжетімді екендігін көрсететін булеан мәні
   */
  Book.prototype.isAvailable = function() {
    return this.availableCopies > 0;
  };

  return Book;
};