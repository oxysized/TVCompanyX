const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/tvcompany_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDatabase() {
  try {
    console.log('🔌 Подключение к базе данных...');
    
    // Проверяем подключение
    const client = await pool.connect();
    console.log('✅ Подключение к БД успешно!');
    
    // Создаем тестовые шоу
    console.log('📺 Создание тестовых шоу...');
    await client.query(`
      INSERT INTO shows (name, time_slot, base_price_per_min) VALUES
      ('Утренние новости', '08:00-09:00', 5000),
      ('Дневной эфир', '12:00-13:00', 8000),
      ('Вечерние новости', '19:00-20:00', 12000),
      ('Ночной эфир', '23:00-00:00', 3000)
      ON CONFLICT DO NOTHING;
    `);
    
    // Создаем тестовое расписание
    console.log('📅 Создание тестового расписания...');
    const shows = await client.query('SELECT id FROM shows LIMIT 4');
    
    for (let i = 0; i < shows.rows.length; i++) {
      const showId = shows.rows[i].id;
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      await client.query(`
        INSERT INTO show_schedule (show_id, scheduled_date, duration_minutes, ad_minutes, available_slots) VALUES
        ($1, $2, 60, 10, 8)
        ON CONFLICT (show_id, scheduled_date) DO NOTHING;
      `, [showId, date.toISOString().split('T')[0]]);
    }
    
    // Создаем тестового пользователя
    console.log('👤 Создание тестового пользователя...');
    await client.query(`
      INSERT INTO users (name, email, role, is_active) VALUES
      ('Demo Customer', 'customer@demo.com', 'customer', true),
      ('Demo Agent', 'agent@demo.com', 'agent', true),
      ('Demo Commercial', 'commercial@demo.com', 'commercial', true)
      ON CONFLICT (email) DO NOTHING;
    `);
    
    client.release();
    console.log('🎉 База данных успешно инициализирована!');
    console.log('\n📋 Создано:');
    console.log('- 4 тестовых шоу');
    console.log('- 4 элемента расписания');
    console.log('- 3 тестовых пользователя');
    
  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
