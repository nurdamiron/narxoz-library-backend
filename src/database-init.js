/**
 * Деректер қорын инициализациялау
 * 
 * @description Бұл файл деректер қорының құрылымын синхрондайды және 
 * бастапқы деректерді енгізеді (мысалы, әдепкі әкімші пайдаланушысы мен кітапханашы).
 * Жүйе бірінші рет іске қосылған кезде, деректер қорында пайдаланушылар болмайды.
 * Осы скрипт автоматты түрде "admin" рөлі бар пайдаланушы және "librarian" рөлі
 * бар пайдаланушы жасайды, осылайша жүйеге кіру және онымен жұмыс істеу мүмкіндігі болады.
 */
const db = require('./models');

/**
 * Деректер қорын инициализациялау функциясы
 * 
 * @description Деректер қорымен синхрондау және бастапқы деректерді енгізу
 * @returns {Promise<void>} Инициализация процесі аяқталған кезде шешілетін Promise
 * @details Бұл функция келесі әрекеттерді орындайды:
 * 1. Жүйедегі барлық модельдерді дерекқор кестелерімен синхрондайды
 * 2. Жүйеде әкімші пайдаланушы бар-жоғын тексереді, жоқ болса жасайды
 * 3. Жүйеде кітапханашы пайдаланушы бар-жоғын тексереді, жоқ болса жасайды
 * 4. Жүйеде категориялар бар-жоғын тексереді, жоқ болса әдепкі категорияларды енгізеді
 * Бұл функция JWT орнына қарапайым логин/құпия сөз арқылы авторизацияны қолдайды.
 */
async function initDatabase() {
  try {
    console.log('Деректер қорын синхрондау...');
    
    // Барлық модельдерді деректер қорымен синхрондау
    // force: true - бар кестелерді жояды (абайлап қолданыңыз!)
    // force: false - кестелер жоқ болса ғана жасайды
    await db.sequelize.sync({ force: false });
    
    console.log('Деректер қоры синхрондау сәтті аяқталды.');
    
    // Жүйеде әкімші бар-жоғын тексеру
    const adminCount = await db.User.count({ where: { role: 'admin' } });
    
    // Егер әкімші жоқ болса, әдепкі әкімшіні жасау
    if (adminCount === 0) {
      console.log('Әдепкі әкімші жасалуда...');
      
      await db.User.create({
        name: 'Әкімші',
        email: 'admin@narxoz.kz',
        password: 'Admin123!', // модельде автоматты түрде шифрланады
        phone: '+77001234567',
        faculty: 'Әкімшілік',
        specialization: 'Кітапхана',
        studentId: 'ADMIN-001',
        year: 'N/A',
        role: 'admin'
      });
      
      console.log('Әдепкі әкімші сәтті жасалды.');
    }

    // Әдепкі кітапханашы бар-жоғын тексеру, жоқ болса жасау
    const librarianCount = await db.User.count({ where: { role: 'librarian' } });
    
    if (librarianCount === 0) {
      console.log('Әдепкі кітапханашы жасалуда...');
      
      await db.User.create({
        name: 'Кітапханашы',
        email: 'librarian@narxoz.kz',
        password: 'Librarian123!', // модельде автоматты түрде шифрланады
        phone: '+77007654321',
        faculty: 'Кітапхана',
        specialization: 'Оқырмандарға қызмет көрсету',
        studentId: 'LIB-001',
        year: 'N/A',
        role: 'librarian'
      });
      
      console.log('Әдепкі кітапханашы сәтті жасалды.');
    }

    // Категориялар бар-жоғын тексеру
    const categoryCount = await db.Category.count();
    
    // Егер категориялар жоқ болса, әдепкі категорияларды жасау
    if (categoryCount === 0) {
      console.log('Әдепкі категориялар жасалуда...');
      
      const defaultCategories = [
        { 
          name: 'Ғылыми әдебиет', 
          description: 'Ғылыми зерттеулер, академиялық жұмыстар және ғылыми мақалалар'
        },
        { 
          name: 'Көркем әдебиет', 
          description: 'Романдар, әңгімелер, поэзия және көркем әдебиеттің басқа түрлері'
        },
        { 
          name: 'Оқулықтар', 
          description: 'Оқу процесіне арналған оқулықтар мен оқу құралдары'
        },
        { 
          name: 'Анықтамалықтар', 
          description: 'Сөздіктер, энциклопедиялар және басқа анықтамалық материалдар'
        },
        { 
          name: 'Бизнес және экономика', 
          description: 'Бизнес, экономика, қаржы және менеджмент бойынша кітаптар'
        }
      ];
      
      await db.Category.bulkCreate(defaultCategories);
      
      console.log('Әдепкі категориялар сәтті жасалды.');
    }
    
    console.log('Деректер қорын инициализациялау сәтті аяқталды.');
  } catch (error) {
    console.error('Деректер қорын инициализациялау кезінде қате орын алды:', error);
  }
}

// Модульді импортаған кезде инициализацияны іске қосу
initDatabase();

module.exports = { initDatabase };