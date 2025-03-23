/**
 * Хабарландыру моделі
 * 
 * @description Бұл модель пайдаланушыларға жіберілетін хабарландыруларды сақтайды.
 * Ол әртүрлі оқиғалар туралы пайдаланушыларды хабардар ету үшін қолданылады,
 * мысалы, кітапты қайтару мерзімі, жүйелік хабарландырулар және т.б.
 */
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    /**
     * Пайдаланушы идентификаторы
     * 
     * @description Хабарландыру жіберілетін пайдаланушыға сілтеме
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
     * Хабарландыру тақырыбы
     * 
     * @description Хабарландырудың қысқаша тақырыбы
     */
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Хабарландыру тақырыбын енгізіңіз'
        },
        len: {
          args: [2, 100],
          msg: 'Тақырып 2-100 таңба аралығында болуы керек'
        }
      }
    },
    
    /**
     * Хабарландыру мәтіні
     * 
     * @description Хабарландырудың толық мәтіні
     */
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Хабарландыру мәтінін енгізіңіз'
        }
      }
    },
    
    /**
     * Хабарландыру түрі
     * 
     * @description Хабарландырудың түрі, түрлі стильдерді және әрекеттерді анықтау үшін
     */
    type: {
      type: DataTypes.ENUM('info', 'warning', 'return', 'overdue', 'system'),
      defaultValue: 'info'
    },
    
    /**
     * Байланысты модель
     * 
     * @description Хабарландыру байланысты модельдің атауы (полиморфтық байланыс үшін)
     */
    relatedModel: {
      type: DataTypes.STRING,
      validate: {
        isIn: {
          args: [['Book', 'Borrow', '']],
          msg: 'Байланысты модель Book, Borrow немесе бос болуы керек'
        }
      },
      defaultValue: ''
    },
    
    /**
     * Байланысты идентификатор
     * 
     * @description Байланысты объектінің идентификаторы (полиморфтық байланыс үшін)
     */
    relatedId: {
      type: DataTypes.INTEGER,
      defaultValue: null
    },
    
    /**
     * Оқылды ма
     * 
     * @description Хабарландыру пайдаланушымен оқылды ма
     */
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    indexes: [
      // Пайдаланушы және оқылу күйі бойынша жылдам сұраулар үшін индекс
      {
        fields: ['userId', 'read', 'createdAt']
      }
    ]
  });

  /**
   * Басқа модельдермен байланыстар
   * 
   * @description Хабарландыру моделінің басқа модельдермен байланыстарын орнатады
   */
  Notification.associate = (models) => {
    // Пайдаланушымен байланыс
    Notification.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    // Полиморфтық байланыстар
    
    // Кітаппен байланыс (relatedModel өрісіне негізделген)
    Notification.belongsTo(models.Book, {
      foreignKey: 'relatedId',
      constraints: false,
      as: 'book',
      scope: {
        relatedModel: 'Book'
      }
    });
    
    // Қарызға алумен байланыс (relatedModel өрісіне негізделген)
    Notification.belongsTo(models.Borrow, {
      foreignKey: 'relatedId',
      constraints: false,
      as: 'borrow',
      scope: {
        relatedModel: 'Borrow'
      }
    });
  };

  return Notification;
};