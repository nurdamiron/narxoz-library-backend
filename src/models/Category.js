/**
 * Категория моделі
 * 
 * @description Бұл модель кітаптар категорияларын сақтауға және ұйымдастыруға арналған.
 * Ол кітаптарды тақырып бойынша топтастыру үшін қолданылады.
 */
module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    /**
     * Категория атауы
     * 
     * @description Категорияның бірегей атауы
     */
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        msg: 'Бұл категория атауы әлдеқашан енгізілген'
      },
      validate: {
        notEmpty: {
          msg: 'Категория атауын енгізіңіз'
        },
        len: {
          args: [2, 50],
          msg: 'Категория атауы 2-50 таңба аралығында болуы керек'
        }
      }
    },
    
    /**
     * Категория сипаттамасы
     * 
     * @description Категория туралы қосымша ақпарат
     */
    description: {
      type: DataTypes.STRING(500),
      validate: {
        len: {
          args: [0, 500],
          msg: 'Сипаттама 500 таңбадан аспауы керек'
        }
      }
    }
  });

  /**
   * Басқа модельдермен байланыстар
   * 
   * @description Категория моделінің басқа модельдермен байланыстарын орнатады
   */
  Category.associate = (models) => {
    // Кітаптармен байланыс
    Category.hasMany(models.Book, {
      foreignKey: 'categoryId',
      as: 'books'
    });
  };

  return Category;
};