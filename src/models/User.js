module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    // All your existing fields here...
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
    // ... other fields ...
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
  }, {
    hooks: {
    }
  });

  User.associate = (models) => {
    // Your existing associations...
  };

  // Update the matchPassword method to do direct comparison
  User.prototype.getSignedJwtToken = function() {
    return jwt.sign({ id: this.id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
  };

  // Change this method to directly compare passwords
  User.prototype.matchPassword = async function(enteredPassword) {
    return enteredPassword === this.password;
  };

  return User;
};