const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:0112@localhost:5432/TVShow',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function quickInit() {
  try {
    console.log('🔌 Подключение к БД TVShow...');
    const client = await pool.connect();
    console.log('✅ Подключение успешно!');

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

    // Получаем ID шоу
    const shows = await client.query('SELECT id FROM shows ORDER BY name');
    console.log(`✅ Создано ${shows.rows.length} шоу`);

    // Создаем расписание на ближайшие 7 дней
    console.log('📅 Создание расписания...');
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      for (const show of shows.rows) {
        await client.query(`
          INSERT INTO show_schedule (show_id, scheduled_date, duration_minutes, ad_minutes, available_slots) 
          VALUES ($1, $2, 60, 10, 8)
          ON CONFLICT (show_id, scheduled_date) DO NOTHING;
        `, [show.id, dateStr]);
      }
    }
    console.log('✅ Создано расписание на 7 дней');

    // Создаем тестового пользователя
    console.log('👤 Создание тестового пользователя...');
    await client.query(`
      INSERT INTO users (id, name, email, role, is_active) VALUES
      ('550e8400-e29b-41d4-a716-446655440000', 'Demo Customer', 'customer@demo.com', 'customer', true)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Создан тестовый пользователь');

    client.release();
    console.log('🎉 Инициализация завершена!');
    console.log('\n📋 Что создано:');
    console.log('- 4 тестовых шоу');
    console.log('- Расписание на 7 дней');
    console.log('- Тестовый пользователь (customer@demo.com)');
    console.log('\n🚀 Теперь можно тестировать подачу заявок!');

  } catch (error) {
    console.error('❌ Ошибка инициализации:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

quickInit();
