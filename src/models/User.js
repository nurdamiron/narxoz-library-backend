const jwt = require('jsonwebtoken');

/**
 * Пайдаланушы моделі
 * 
 * @description Бұл модель жүйедегі барлық пайдаланушылар туралы ақпаратты сақтайды.
 * Әкімшілер мен студенттер туралы мәліметтерді қамтиды.
 */
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    /**
     * Пайдаланушы аты
     */
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Пайдаланушы атын енгізіңіз'
        },
        len: {
          args: [3, 50],
          msg: 'Пайдаланушы аты 3-50 таңба аралығында болуы керек'
        }
      }
    },
    
    /**
     * Құпия сөз (хэширлеусіз сақталады)
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
     * Аты
     */
    firstName: {
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
     * Тегі
     */
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Тегіңізді енгізіңіз'
        },
        len: {
          args: [2, 50],
          msg: 'Тегі 2-50 таңба аралығында болуы керек'
        }
      }
    },
    
    /**
     * Электрондық пошта
     */
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Email мекенжайын енгізіңіз'
        },
        isEmail: {
          msg: 'Жарамды email мекенжайын енгізіңіз'
        }
      }
    },
    
    /**
     * Телефон нөмірі
     */
    phoneNumber: {
      type: DataTypes.STRING,
      validate: {
        is: {
          args: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im,
          msg: 'Жарамды телефон нөмірін енгізіңіз'
        }
      }
    },
    
    /**
     * Пайдаланушы рөлі
     */
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'student',
      validate: {
        isIn: {
          args: [['admin', 'student', 'moderator', 'librarian']],
          msg: 'Рөл admin, moderator, librarian немесе student болуы керек'
        }
      }
    },
    
    /**
     * Факультет
     */
    faculty: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    /**
     * Мамандық
     */
    specialization: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    /**
     * Студенттік билет нөмірі
     */
    studentId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    
    /**
     * Бұғатталған ба
     */
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    
    /**
     * Соңғы кіру уақыты
     */
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    hooks: {
      // Хэширлеу қажет емес, құпия сөздер тікелей сақталады
    }
  });

  /**
   * Басқа модельдермен байланыстар
   */
  User.associate = (models) => {
    // Қарызға алулармен байланыс
    User.hasMany(models.Borrow, {
      foreignKey: 'userId',
      as: 'borrows',
      onDelete: 'CASCADE'
    });
    
    // Бетбелгілермен байланыс
    User.hasMany(models.Bookmark, {
      foreignKey: 'userId',
      as: 'bookmarks',
      onDelete: 'CASCADE'
    });
    
    // Хабарландырулармен байланыс
    User.hasMany(models.Notification, {
      foreignKey: 'userId',
      as: 'notifications',
      onDelete: 'CASCADE'
    });
    
    // Event байланысы - пайдаланушы жасаған оқиғалар
    User.hasMany(models.Event, {
      foreignKey: 'createdBy',
      as: 'createdEvents',
      onDelete: 'CASCADE'
    });
    
    // Event тіркелулермен байланыс
    User.hasMany(models.EventRegistration, {
      foreignKey: 'userId',
      as: 'eventRegistrations',
      onDelete: 'CASCADE'
    });
  };

  /**
   * JWT токенін жасау
   * 
   * @returns {String} - JWT токені
   */
  User.prototype.getSignedJwtToken = function() {
    return jwt.sign({ id: this.id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
  };

  /**
   * Құпия сөзді тікелей салыстыру
   * 
   * @param {String} enteredPassword - Пайдаланушы енгізген құпия сөз
   * @returns {Boolean} - Құпия сөз сәйкес келетінін көрсетеді
   */
  User.prototype.matchPassword = async function(enteredPassword) {
    return enteredPassword === this.password;
  };

  return User;
};