// utils/sendEmail.js
const nodemailer = require('nodemailer');

/**
 * Nodemailer арқылы электрондық хат жіберу
 * 
 * @param {Object} options - Электрондық хат опциялары
 * @param {String} options.email - Алушының электрондық поштасы
 * @param {String} options.subject - Электрондық хат тақырыбы
 * @param {String} options.message - Электрондық хат хабарламасы (кәдімгі мәтін)
 * @param {String} options.html - Электрондық хат хабарламасы (HTML пішімі)
 * @returns {Promise} - Электрондық хат жіберу нәтижесі
 * 
 * @description Бұл функция SMTP арқылы электрондық хаттарды жіберуді жеңілдетеді.
 * Ол Nodemailer транспортын конфигурациялайды және электрондық хат жіберуді қамтамасыз етеді.
 */
const sendEmail = async (options) => {
  // Транспорт құру
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // 465 порты үшін true, басқалары үшін false
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Электрондық хат опцияларын анықтау
  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message || '',
    html: options.html || '',
  };

  // Электрондық хат жіберу
  const info = await transporter.sendMail(message);

  console.log(`Электрондық хат жіберілді: ${info.messageId}`);
  
  return info;
};

module.exports = sendEmail;