const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Please add a name'
        },
        len: {
          args: [2, 50],
          msg: 'Name must be between 2 and 50 characters'
        }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        msg: 'Email address already in use'
      },
      validate: {
        notEmpty: {
          msg: 'Please add an email'
        },
        isEmail: {
          msg: 'Please provide a valid email'
        }
      }
    },
    phone: {
      type: DataTypes.STRING,
      validate: {
        len: {
          args: [0, 20],
          msg: 'Phone number cannot be longer than 20 characters'
        }
      }
    },
    faculty: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Please add a faculty'
        }
      }
    },
    specialization: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Please add a specialization'
        }
      }
    },
    studentId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        msg: 'Student ID already in use'
      },
      validate: {
        notEmpty: {
          msg: 'Please add a student ID'
        }
      }
    },
    year: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Please add a year'
        }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Please add a password'
        },
        len: {
          args: [6, 100],
          msg: 'Password must be at least 6 characters'
        }
      }
    },
    avatar: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    role: {
      type: DataTypes.ENUM('user', 'librarian', 'admin'),
      defaultValue: 'user'
    },
    resetPasswordToken: {
      type: DataTypes.STRING
    },
    resetPasswordExpire: {
      type: DataTypes.DATE
    }
  }, {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  // Associate with other models
  User.associate = (models) => {
    User.hasMany(models.Bookmark, {
      foreignKey: 'userId',
      as: 'bookmarks',
      onDelete: 'CASCADE'
    });
    User.hasMany(models.Borrow, {
      foreignKey: 'userId',
      as: 'borrows',
      onDelete: 'CASCADE'
    });
    User.hasMany(models.Notification, {
      foreignKey: 'userId',
      as: 'notifications',
      onDelete: 'CASCADE'
    });
  };

  // Sign JWT and return
  User.prototype.getSignedJwtToken = function() {
    return jwt.sign({ id: this.id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
  };

  // Match user entered password to hashed password in database
  User.prototype.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

  return User;
};