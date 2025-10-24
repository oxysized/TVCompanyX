const { Pool } = require('pg')

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Copy all applications to pending_applications
    const copyRes = await client.query(`
      INSERT INTO pending_applications (id, customer_id, agent_id, show_id, scheduled_at, duration_seconds, status, cost, description, contact_phone, payment_method, payment_date, due_date, created_at, updated_at)
      SELECT id, customer_id, agent_id, show_id, scheduled_at, duration_seconds, status, cost, description, contact_phone, payment_method, payment_date, due_date, created_at, updated_at
      FROM applications
      ON CONFLICT (id) DO NOTHING
    `)

    // Move approved
    const moveApproved = await client.query(`
      INSERT INTO approved_applications (id, customer_id, agent_id, show_id, scheduled_at, duration_seconds, status, cost, description, contact_phone, payment_method, payment_date, due_date, created_at, updated_at)
      SELECT id, customer_id, agent_id, show_id, scheduled_at, duration_seconds, status, cost, description, contact_phone, payment_method, payment_date, due_date, created_at, updated_at
      FROM applications WHERE status = 'approved'
      ON CONFLICT (id) DO NOTHING
    `)

    // Move rejected
    const moveRejected = await client.query(`
      INSERT INTO rejected_applications (id, customer_id, agent_id, show_id, scheduled_at, duration_seconds, status, cost, description, contact_phone, payment_method, payment_date, due_date, created_at, updated_at)
      SELECT id, customer_id, agent_id, show_id, scheduled_at, duration_seconds, status, cost, description, contact_phone, payment_method, payment_date, due_date, created_at, updated_at
      FROM applications WHERE status = 'rejected'
      ON CONFLICT (id) DO NOTHING
    `)

    // Optionally: delete migrated rows from original table or keep as archive
    // Here we keep original table as an archive but mark moved records
    await client.query(`UPDATE applications SET status = 'pending' WHERE status NOT IN ('approved','rejected')`)

    await client.query('COMMIT')
    console.log('Migration complete:', { copied: copyRes.rowCount, movedApproved: moveApproved.rowCount, movedRejected: moveRejected.rowCount })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Migration failed', err)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
