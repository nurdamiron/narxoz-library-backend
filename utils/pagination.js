/**
 * Функция для вычисления параметров пагинации
 * 
 * @param {number} page - Номер страницы (начинается с 1)
 * @param {number} limit - Количество элементов на странице
 * @param {number} [maxLimit=100] - Максимальное количество элементов на странице
 * @returns {Object} Объект с параметрами пагинации: offset, limit
 */
const paginate = (page = 1, limit = 10, maxLimit = 100) => {
    // Преобразование параметров в числа и проверка
    const currentPage = parseInt(page, 10) || 1;
    const pageSize = Math.min(parseInt(limit, 10) || 10, maxLimit);
  
    // Расчет смещения
    const offset = (currentPage - 1) * pageSize;
  
    return {
      offset,
      limit: pageSize
    };
  };
  
  /**
   * Функция для форматирования результатов с пагинацией
   * 
   * @param {Array} data - Массив с данными
   * @param {number} count - Общее количество элементов
   * @param {number} page - Текущая страница
   * @param {number} limit - Количество элементов на странице
   * @returns {Object} Объект с форматированными результатами
   */
  const paginateResults = (data, count, page = 1, limit = 10) => {
    const currentPage = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;
    const totalPages = Math.ceil(count / pageSize);
  
    return {
      count,
      totalPages,
      currentPage,
      pageSize,
      data
    };
  };
  
  module.exports = {
    paginate,
    paginateResults
  };