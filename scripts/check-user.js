const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:0112@localhost:5432/TVShow',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkAndCreateUser() {
  try {
    console.log('🔍 Проверяем пользователя...');
    const client = await pool.connect();
    
    const result = await client.query('SELECT id, name, email, role FROM users WHERE id = $1', ['550e8400-e29b-41d4-a716-446655440000']);
    
    if (result.rows.length === 0) {
      console.log('❌ Пользователь не найден, создаем...');
      await client.query(`
        INSERT INTO users (id, name, email, role, is_active) VALUES
        ('550e8400-e29b-41d4-a716-446655440000', 'Demo Customer', 'customer@demo.com', 'customer', true)
      `);
      console.log('✅ Пользователь создан!');
    } else {
      console.log('✅ Пользователь найден:', result.rows[0]);
    }
    
    // Проверим все пользователей
    const allUsers = await client.query('SELECT id, name, email, role FROM users');
    console.log('\n📋 Все пользователи в БД:');
    allUsers.rows.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role} - ID: ${user.id}`);
    });
    
    client.release();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await pool.end();
  }
}

checkAndCreateUser();



