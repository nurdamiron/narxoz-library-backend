const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
require('dotenv').config();

// Создание транспортера Nodemailer
const createTransporter = async () => {
  try {
    // Проверка наличия настроек почты в переменных окружения
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || 
        !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      logger.warn('Отсутствуют настройки почты в переменных окружения. Email-уведомления отключены.');
      return null;
    }
    
    // Создание транспортера
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    // Верификация транспортера
    await transporter.verify();
    logger.info('SMTP-соединение установлено успешно');
    
    return transporter;
  } catch (error) {
    logger.error('Ошибка при создании SMTP-транспортера:', error);
    return null;
  }
};

// Инициализация транспортера при запуске сервиса
let transporter;
createTransporter().then(t => {
  transporter = t;
});

/**
 * Отправка email-сообщения
 * 
 * @param {Object} options - Опции для отправки сообщения
 * @param {string} options.to - Адрес получателя
 * @param {string} options.subject - Тема сообщения
 * @param {string} options.text - Текстовое содержимое сообщения
 * @param {string} [options.html] - HTML-содержимое сообщения
 * @returns {Promise<boolean>} Результат отправки
 */
exports.sendEmail = async (options) => {
  try {
    // Проверка наличия транспортера
    if (!transporter) {
      logger.warn('Транспортер не инициализирован. Email не отправлен.');
      return false;
    }
    
    // Настройка сообщения
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Библиотека Нархоз'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text
    };
    
    // Добавление HTML-содержимого, если оно указано
    if (options.html) {
      mailOptions.html = options.html;
    }
    
    // Отправка сообщения
    await transporter.sendMail(mailOptions);
    logger.info(`Email успешно отправлен на адрес ${options.to}`);
    
    return true;
  } catch (error) {
    logger.error('Ошибка при отправке email:', error);
    return false;
  }
};

/**
 * Отправка уведомления по email
 * 
 * @param {string} to - Адрес получателя
 * @param {string} message - Текст уведомления
 * @param {string} type - Тип уведомления (borrow, return, overdue, reminder, ...)
 * @returns {Promise<boolean>} Результат отправки
 */
exports.sendNotificationEmail = async (to, message, type) => {
  try {
    // Определение темы в зависимости от типа уведомления
    let subject;
    switch (type) {
      case 'borrow':
        subject = 'Уведомление о выдаче книги';
        break;
      case 'return':
        subject = 'Уведомление о возврате книги';
        break;
      case 'overdue':
        subject = 'Уведомление о просроченной книге';
        break;
      case 'reminder':
        subject = 'Напоминание о возврате книги';
        break;
      default:
        subject = 'Уведомление из библиотеки';
    }
    
    // HTML-шаблон для уведомления
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .header {
            background-color: #0056A4;
            color: white;
            padding: 10px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            padding: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${subject}</h2>
          </div>
          <div class="content">
            <p>${message}</p>
          </div>
          <div class="footer">
            <p>Это автоматическое уведомление из электронной библиотеки Нархоз Университета.</p>
            <p>Пожалуйста, не отвечайте на это сообщение.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Отправка уведомления
    return await this.sendEmail({
      to,
      subject,
      text: message,
      html
    });
  } catch (error) {
    logger.error('Ошибка при отправке уведомления по email:', error);
    return false;
  }
};

/**
 * Отправка подтверждения регистрации
 * 
 * @param {string} to - Адрес получателя
 * @param {string} name - Имя пользователя
 * @returns {Promise<boolean>} Результат отправки
 */
exports.sendWelcomeEmail = async (to, name) => {
  try {
    const subject = 'Добро пожаловать в электронную библиотеку Нархоз Университета';
    const message = `Здравствуйте, ${name}!\n\nДобро пожаловать в электронную библиотеку Нархоз Университета. Ваша регистрация успешно завершена.\n\nТеперь вы можете пользоваться всеми возможностями нашей библиотеки: искать и бронировать книги, отслеживать сроки возврата и многое другое.`;
    
    // HTML-шаблон для приветственного письма
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .header {
            background-color: #0056A4;
            color: white;
            padding: 10px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            padding: 20px;
          }
          .button {
            display: inline-block;
            background-color: #0056A4;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Добро пожаловать в электронную библиотеку Нархоз Университета</h2>
          </div>
          <div class="content">
            <p>Здравствуйте, <strong>${name}</strong>!</p>
            <p>Добро пожаловать в электронную библиотеку Нархоз Университета. Ваша регистрация успешно завершена.</p>
            <p>Теперь вы можете пользоваться всеми возможностями нашей библиотеки:</p>
            <ul>
              <li>Искать книги в каталоге</li>
              <li>Бронировать книги</li>
              <li>Отслеживать сроки возврата</li>
              <li>Получать уведомления</li>
            </ul>
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="button">Перейти в библиотеку</a>
          </div>
          <div class="footer">
            <p>Это автоматическое сообщение из электронной библиотеки Нархоз Университета.</p>
            <p>Пожалуйста, не отвечайте на это сообщение.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Отправка приветственного письма
    return await this.sendEmail({
      to,
      subject,
      text: message,
      html
    });
  } catch (error) {
    logger.error('Ошибка при отправке приветственного email:', error);
    return false;
  }
};

module.exports = exports;