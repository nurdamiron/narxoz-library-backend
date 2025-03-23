const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Пайдаланушы моделі
 * 
 * @description Бұл модель жүйедегі пайдаланушылар туралы ақпаратты сақтайды.
 * Ол кітапхана қызметтерін пайдалану үшін қажетті барлық пайдаланушы деректерін қамтиды.
 */
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    /**
     * Пайдаланушы аты
     * 
     * @description Пайдаланушының толық аты
     */
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Атыңызды енгізіңіз'
        },
        len: {
          args: [2, 50],
          msg: 'Аты 2-50 таңба аралығында болуы керек'
        }
      }
    },
    
    /**
     * Электрондық пошта
     * 
     * @description Пайдаланушының бірегей электрондық пошта мекенжайы
     */
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        msg: 'Бұл электрондық пошта мекенжайы қолданыста'
      },
      validate: {
        notEmpty: {
          msg: 'Электрондық поштаңызды енгізіңіз'
        },
        isEmail: {
          msg: 'Жарамды электрондық пошта мекенжайын енгізіңіз'
        }
      }
    },
    
    /**
     * Телефон нөмірі
     * 
     * @description Пайдаланушының байланыс телефоны
     */
    phone: {
      type: DataTypes.STRING,
      validate: {
        len: {
          args: [0, 20],
          msg: 'Телефон нөмірі 20 таңбадан аспауы керек'
        }
      }
    },
    
    /**
     * Факультет
     * 
     * @description Пайдаланушы оқитын немесе жұмыс істейтін факультет
     */
    faculty: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Факультетті енгізіңіз'
        }
      }
    },
    
    /**
     * Мамандық
     * 
     * @description Пайдаланушы оқитын немесе жұмыс істейтін мамандық
     */
    specialization: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Мамандықты енгізіңіз'
        }
      }
    },
    
    /**
     * Студент ID
     * 
     * @description Пайдаланушының бірегей студент идентификаторы
     */
    studentId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        msg: 'Бұл студент ID қолданыста'
      },
      validate: {
        notEmpty: {
          msg: 'Студент ID-ін енгізіңіз'
        }
      }
    },
    
    /**
     * Курс/Жыл
     * 
     * @description Студенттің оқу жылы немесе курсы
     */
    year: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Курс/жылды енгізіңіз'
        }
      }
    },
    
    /**
     * Құпия сөз
     * 
     * @description Пайдаланушының шифрланған құпия сөзі
     */
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Құпия сөзді енгізіңіз'
        },
        len: {
          args: [6, 100],
          msg: 'Құпия сөз кем дегенде 6 таңбадан тұруы керек'
        }
      }
    },
    
    /**
     * Аватар
     * 
     * @description Пайдаланушы аватарының сурет файлының жолы
     */
    avatar: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    
    /**
     * Рөл
     * 
     * @description Пайдаланушының жүйедегі рөлі
     */
    role: {
      type: DataTypes.ENUM('user', 'librarian', 'admin'),
      defaultValue: 'user'
    },
    
    /**
     * Құпия сөзді қалпына келтіру токені
     * 
     * @description Құпия сөзді қалпына келтіру сұранысы үшін уақытша токен
     */
    resetPasswordToken: {
      type: DataTypes.STRING
    },
    
    /**
     * Құпия сөзді қалпына келтіру мерзімі
     * 
     * @description Құпия сөзді қалпына келтіру токенінің аяқталу мерзімі
     */
    resetPasswordExpire: {
      type: DataTypes.DATE
    }
  }, {
    hooks: {
      /**
       * Жасау алдындағы әрекет
       * 
       * @description Пайдаланушы объектісі жасалмас бұрын құпия сөзді шифрлайды
       */
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      
      /**
       * Жаңарту алдындағы әрекет
       * 
       * @description Құпия сөз өзгертілген кезде жаңа құпия сөзді шифрлайды
       */
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  /**
   * Басқа модельдермен байланыстар
   * 
   * @description Пайдаланушы моделінің басқа модельдермен байланыстарын орнатады
   */
  User.associate = (models) => {
    // Бетбелгілермен байланыс
    User.hasMany(models.Bookmark, {
      foreignKey: 'userId',
      as: 'bookmarks',
      onDelete: 'CASCADE'
    });
    
    // Қарызға алулармен байланыс
    User.hasMany(models.Borrow, {
      foreignKey: 'userId',
      as: 'borrows',
      onDelete: 'CASCADE'
    });
    
    // Хабарландырулармен байланыс
    User.hasMany(models.Notification, {
      foreignKey: 'userId',
      as: 'notifications',
      onDelete: 'CASCADE'
    });
  };

  /**
   * JWT токенін жасау және қайтару
   * 
   * @description Пайдаланушы үшін JWT токенін жасайды
   * @returns {String} Қол қойылған JWT токені
   */
  User.prototype.getSignedJwtToken = function() {
    return jwt.sign({ id: this.id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
  };

  /**
   * Пайдаланушы енгізген құпия сөздің дерекқордағы хэшпен сәйкестігін тексеру
   * 
   * @description Енгізілген құпия сөздің дерекқордағы сақталған хэшпен сәйкестігін тексереді
   * @param {String} enteredPassword - Пайдаланушы енгізген құпия сөз
   * @returns {Boolean} Құпия сөздің сәйкестігін көрсететін булеан мәні
   */
  User.prototype.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

  return User;
};