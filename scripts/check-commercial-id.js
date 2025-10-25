const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:0112@localhost:5432/TVShow'
});

async function checkField() {
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name IN ('applications', 'pending_applications', 'approved_applications', 'rejected_applications')
        AND column_name = 'commercial_id'
      ORDER BY table_name
    `);
    
    console.log('commercial_id field status:');
    console.table(result.rows);
    
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
  }
}

checkField();
