/**
 * Электрондық хат жіберу утилитасы
 * 
 * @description Бұл файл Nodemailer арқылы электрондық хаттарды жіберуді қамтамасыз етеді
 */
const nodemailer = require('nodemailer');

/**
 * Nodemailer арқылы электрондық хат жіберу
 * 
 * @description SMTP арқылы электрондық хаттарды жіберу функциясы
 * 
 * @param {Object} options - Электрондық хат опциялары
 * @param {String} options.email - Алушының электрондық поштасы
 * @param {String} options.subject - Электрондық хат тақырыбы
 * @param {String} options.message - Электрондық хат хабарламасы (кәдімгі мәтін)
 * @param {String} options.html - Электрондық хат хабарламасы (HTML пішімі)
 * @returns {Promise<Object>} - Электрондық хат жіберу нәтижесі
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

  // Жіберуші аты мен поштасын тексеру
  const fromName = process.env.FROM_NAME || 'Нархоз Кітапханасы';
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_EMAIL;

  // Электрондық хат опцияларын анықтау
  const message = {
    from: `${fromName} <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message || '',
    html: options.html || '',
  };

  try {
    // Электрондық хат жіберу
    const info = await transporter.sendMail(message);
    console.log(`Электрондық хат жіберілді: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Электрондық хат жіберу кезінде қате орын алды:', error);
    throw new Error('Электрондық хат жіберу мүмкін болмады');
  }
};

module.exports = sendEmail;