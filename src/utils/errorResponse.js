/**
 * Арнайы қате жауабы классы
 * 
 * @description Стандартты Error классын кеңейтіп, HTTP статус кодын қосады.
 * Бұл класс API қателерін стандарттау үшін қолданылады.
 */
class ErrorResponse extends Error {
  /**
   * ErrorResponse конструкторы
   * 
   * @param {string|string[]} message - Қате хабарламасы (жеке немесе массив)
   * @param {number} statusCode - HTTP статус коды
   */
  constructor(message, statusCode) {
    // Егер message массив болса, оны жолға түрлендіру
    const formattedMessage = Array.isArray(message) ? message.join(', ') : message;
    
    // Негізгі Error классын шақыру
    super(formattedMessage);
    
    // Статус кодын орнату
    this.statusCode = statusCode;
    
    // Трассировканы дұрыс шығару үшін
    Error.captureStackTrace(this, this.constructor);
    
    // Қате түрін орнату
    this.name = 'ApiError';
    
    // Қате уақытын орнату
    this.timestamp = new Date();
  }
}

module.exports = ErrorResponse;