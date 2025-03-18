const bcrypt = require('bcryptjs');
const { sequelize, Sequelize } = require('../config/database');
const { DataTypes } = Sequelize;

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  faculty: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  specialization: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  student_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true
  },
  year: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('student', 'teacher', 'librarian', 'admin'),
    defaultValue: 'student'
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
  },
  tableName: 'users',
  timestamps: true,
  underscored: true
});

// Метод для сравнения паролей
User.prototype.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;