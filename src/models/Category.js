module.exports = (sequelize, DataTypes) => {
    const Category = sequelize.define('Category', {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          args: true,
          msg: 'Category name already exists'
        },
        validate: {
          notEmpty: {
            msg: 'Please add a category name'
          },
          len: {
            args: [2, 50],
            msg: 'Category name must be between 2 and 50 characters'
          }
        }
      },
      description: {
        type: DataTypes.STRING(500),
        validate: {
          len: {
            args: [0, 500],
            msg: 'Description cannot be longer than 500 characters'
          }
        }
      }
    });
  
    // Associate with other models
    Category.associate = (models) => {
      Category.hasMany(models.Book, {
        foreignKey: 'categoryId',
        as: 'books'
      });
    };
  
    return Category;
  };