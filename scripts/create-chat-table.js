const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:0112@localhost:5432/TVShow',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function createChatTable() {
  const client = await pool.connect()
  try {
    console.log('Creating uuid-ossp extension and chat_messages table if they do not exist...')
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id TEXT NOT NULL,
        sender_id UUID,
        sender_name TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    console.log('✅ chat_messages table ensured')
  } catch (err) {
    console.error('Failed to create chat_messages table:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

createChatTable()
