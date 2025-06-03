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
  console.log(`[EMAIL] Попытка отправки email на: ${options.email}`);
  console.log(`[EMAIL] Тема: ${options.subject}`);
  console.log(`[EMAIL] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[EMAIL] DISABLE_EMAIL: ${process.env.DISABLE_EMAIL}`);
  
  // Режим разработки - только логируем, не отправляем реально
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_EMAIL === 'true') {
    console.log('=== EMAIL SIMULATION (Development Mode) ===');
    console.log('To:', options.email);
    console.log('Subject:', options.subject);
    console.log('Message:', options.message);
    console.log('HTML:', options.html ? 'Есть HTML содержимое' : 'Нет HTML');
    console.log('=== END EMAIL SIMULATION ===');
    console.log('[EMAIL] Симуляция: email успешно "отправлен"');
    
    return {
      messageId: 'simulated-' + Date.now(),
      accepted: [options.email],
      rejected: [],
      envelope: {
        from: process.env.FROM_EMAIL || 'test@test.com',
        to: [options.email]
      }
    };
  }

  // Реальная отправка email
  try {
    console.log(`[EMAIL] Начинаем реальную отправку email...`);
    console.log(`[EMAIL] SMTP настройки: Host=${process.env.SMTP_HOST}, Port=${process.env.SMTP_PORT}`);
    console.log(`[EMAIL] SMTP User: ${process.env.SMTP_EMAIL ? 'Установлен' : 'НЕ УСТАНОВЛЕН'}`);
    console.log(`[EMAIL] SMTP Password: ${process.env.SMTP_PASSWORD ? 'Установлен' : 'НЕ УСТАНОВЛЕН'}`);
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

    // Электрондық хат жіберу
    const info = await transporter.sendMail(message);
    console.log(`[EMAIL] УСПЕХ! Электрондық хат жіберілді: ${info.messageId}`);
    console.log(`[EMAIL] Принято: ${info.accepted.join(', ')}`);
    console.log(`[EMAIL] Отклонено: ${info.rejected.length > 0 ? info.rejected.join(', ') : 'нет'}`);
    return info;
  } catch (error) {
    console.error('[EMAIL] ОШИБКА! Электрондық хат жіберу кезінде қате орын алды:', error);
    console.error('[EMAIL] Детали ошибки:', error.message);
    if (error.code) {
      console.error('[EMAIL] Код ошибки:', error.code);
    }
    
    // В режиме разработки возвращаем успешный результат даже при ошибке
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Симулируем успешную отправку email');
      return {
        messageId: 'dev-fallback-' + Date.now(),
        accepted: [options.email],
        rejected: [],
        envelope: {
          from: process.env.FROM_EMAIL || 'dev@test.com',
          to: [options.email]
        }
      };
    }
    
    throw new Error('Электрондық хат жіберу мүмкін болмады');
  }
};

module.exports = sendEmail;