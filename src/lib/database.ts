import { Pool } from 'pg'

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:0112@localhost:5432/TVShow',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    return { connected: true, error: null }
  } catch (error) {
    console.error('Database connection failed:', error)
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown database error' 
    }
  }
}

// Database queries
export const db = {
  // Users
  async getUsers() {
    const result = await pool.query('SELECT id, name, first_name, middle_name, last_name, email, role, is_active, bank_details, phone, created_at FROM users ORDER BY created_at DESC')
    return result.rows
  },

  async getUserById(id: string) {
    const result = await pool.query('SELECT id, name, first_name, middle_name, last_name, email, role, is_active, bank_details, phone, created_at FROM users WHERE id = $1', [id])
    return result.rows[0]
  },

  async getUserByEmail(email: string) {
    const result = await pool.query('SELECT id, name, first_name, middle_name, last_name, email, role, is_active, bank_details, phone, password_hash, created_at FROM users WHERE email = $1 LIMIT 1', [email])
    return result.rows[0]
  },

  async createUser(userData: { name?: string; first_name?: string; middle_name?: string; last_name?: string; email: string; password_hash: string; role: string; bank_details?: any; phone?: string }) {
    const result = await pool.query(
      'INSERT INTO users (name, first_name, middle_name, last_name, email, password_hash, role, bank_details, phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name, first_name, middle_name, last_name, email, role, is_active, bank_details, phone, created_at',
      [
        userData.name || null,
        userData.first_name || null,
        userData.middle_name || null,
        userData.last_name || null,
        userData.email,
        userData.password_hash,
        userData.role,
        userData.bank_details ? JSON.stringify(userData.bank_details) : null,
        userData.phone || null,
      ]
    )
    return result.rows[0]
  },

  async updateUser(id: string, userData: Partial<{ name?: string; first_name?: string; middle_name?: string; last_name?: string; email?: string; bank_details?: any; phone?: string }>) {
    const fields = []
    const values = []
    let paramCount = 1

    if (userData.name) {
      fields.push(`name = $${paramCount++}`)
      values.push(userData.name)
    }
    if (userData.first_name !== undefined) {
      fields.push(`first_name = $${paramCount++}`)
      values.push(userData.first_name)
    }
    if (userData.middle_name !== undefined) {
      fields.push(`middle_name = $${paramCount++}`)
      values.push(userData.middle_name)
    }
    if (userData.last_name !== undefined) {
      fields.push(`last_name = $${paramCount++}`)
      values.push(userData.last_name)
    }
    if (userData.email) {
      fields.push(`email = $${paramCount++}`)
      values.push(userData.email)
    }
    if (userData.bank_details !== undefined) {
      fields.push(`bank_details = $${paramCount++}`)
      values.push(userData.bank_details ? JSON.stringify(userData.bank_details) : null)
    }
    if (userData.phone !== undefined) {
      fields.push(`phone = $${paramCount++}`)
      values.push(userData.phone)
    }

    if (fields.length === 0) return null

    fields.push(`updated_at = now()`)
    values.push(id)

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, name, first_name, middle_name, last_name, email, role, is_active, bank_details, phone, updated_at`,
      values
    )
    return result.rows[0]
  },

  async hasBankDetails(userId: string) {
    const result = await pool.query('SELECT bank_details FROM users WHERE id = $1', [userId])
    const row = result.rows[0]
    if (!row) return false
    try {
      // bank_details stored as JSONB; consider object truthiness
      if (row.bank_details === null) return false
      if (typeof row.bank_details === 'object') {
        // consider empty object as no bank details
        return Object.keys(row.bank_details).length > 0
      }
      return !!row.bank_details
    } catch (e) {
      return false
    }
  },

  // Shows
  async getShows() {
    const result = await pool.query('SELECT * FROM shows ORDER BY name')
    return result.rows
  },

  async getShowById(id: string) {
    const result = await pool.query('SELECT * FROM shows WHERE id = $1', [id])
    return result.rows[0]
  },

  async createShow(showData: { 
    name: string; 
    time_slot: string; 
    base_price_per_min: number;
    show_type?: string;
    duration_minutes?: number;
    description?: string | null;
    is_active?: boolean;
    is_recurring?: boolean;
    recurring_days?: string;
  }) {
    const result = await pool.query(
      'INSERT INTO shows (name, time_slot, base_price_per_min, show_type, duration_minutes, description, is_active, is_recurring, recurring_days) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        showData.name, 
        showData.time_slot, 
        showData.base_price_per_min,
        showData.show_type || 'program',
        showData.duration_minutes || 60,
        showData.description || null,
        showData.is_active !== undefined ? showData.is_active : true,
        showData.is_recurring || false,
        showData.recurring_days || 'daily'
      ]
    )
    return result.rows[0]
  },

  async updateShow(id: string, showData: { 
    name?: string; 
    time_slot?: string; 
    base_price_per_min?: number;
    show_type?: string;
    duration_minutes?: number;
    description?: string | null;
    is_active?: boolean;
    is_recurring?: boolean;
    recurring_days?: string;
  }) {
    const fields = []
    const values = []
    let paramCount = 1

    if (showData.name !== undefined) {
      fields.push(`name = $${paramCount++}`)
      values.push(showData.name)
    }
    if (showData.time_slot !== undefined) {
      fields.push(`time_slot = $${paramCount++}`)
      values.push(showData.time_slot)
    }
    if (showData.base_price_per_min !== undefined) {
      fields.push(`base_price_per_min = $${paramCount++}`)
      values.push(showData.base_price_per_min)
    }
    if (showData.show_type !== undefined) {
      fields.push(`show_type = $${paramCount++}`)
      values.push(showData.show_type)
    }
    if (showData.duration_minutes !== undefined) {
      fields.push(`duration_minutes = $${paramCount++}`)
      values.push(showData.duration_minutes)
    }
    if (showData.description !== undefined) {
      fields.push(`description = $${paramCount++}`)
      values.push(showData.description)
    }
    if (showData.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`)
      values.push(showData.is_active)
    }
    if (showData.is_recurring !== undefined) {
      fields.push(`is_recurring = $${paramCount++}`)
      values.push(showData.is_recurring)
    }
    if (showData.recurring_days !== undefined) {
      fields.push(`recurring_days = $${paramCount++}`)
      values.push(showData.recurring_days)
    }

    if (fields.length === 0) return null

    fields.push(`updated_at = now()`)
    values.push(id)

    const result = await pool.query(
      `UPDATE shows SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    )
    return result.rows[0]
  },

  async deleteShow(id: string) {
    await pool.query('DELETE FROM shows WHERE id = $1', [id])
    return { success: true }
  },

  // Show Schedule
  async getSchedule(filters?: { dateFrom?: string; dateTo?: string; showId?: string }) {
    let query = `
      SELECT ss.*, s.name as show_name, s.time_slot, s.base_price_per_min
      FROM show_schedule ss
      JOIN shows s ON ss.show_id = s.id
      WHERE 1=1
    `
    const values = []
    let paramCount = 1

    if (filters?.dateFrom) {
      query += ` AND ss.scheduled_date >= $${paramCount++}`
      values.push(filters.dateFrom)
    }
    if (filters?.dateTo) {
      query += ` AND ss.scheduled_date <= $${paramCount++}`
      values.push(filters.dateTo)
    }
    if (filters?.showId) {
      query += ` AND ss.show_id = $${paramCount++}`
      values.push(filters.showId)
    }

    query += ' ORDER BY ss.scheduled_date DESC, s.name'

    const result = await pool.query(query, values)
    return result.rows
  },

  async createScheduleItem(scheduleData: {
    show_id: string;
    scheduled_date: string;
    duration_minutes: number;
    ad_minutes: number;
    available_slots: number;
  }) {
    const result = await pool.query(
      'INSERT INTO show_schedule (show_id, scheduled_date, duration_minutes, ad_minutes, available_slots) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [scheduleData.show_id, scheduleData.scheduled_date, scheduleData.duration_minutes, scheduleData.ad_minutes, scheduleData.available_slots]
    )
    return result.rows[0]
  },

  async updateScheduleItem(id: string, scheduleData: Partial<{
    scheduled_date: string;
    duration_minutes: number;
    ad_minutes: number;
    available_slots: number;
  }>) {
    const fields = []
    const values = []
    let paramCount = 1

    if (scheduleData.scheduled_date) {
      fields.push(`scheduled_date = $${paramCount++}`)
      values.push(scheduleData.scheduled_date)
    }
    if (scheduleData.duration_minutes) {
      fields.push(`duration_minutes = $${paramCount++}`)
      values.push(scheduleData.duration_minutes)
    }
    if (scheduleData.ad_minutes !== undefined) {
      fields.push(`ad_minutes = $${paramCount++}`)
      values.push(scheduleData.ad_minutes)
    }
    if (scheduleData.available_slots !== undefined) {
      fields.push(`available_slots = $${paramCount++}`)
      values.push(scheduleData.available_slots)
    }

    if (fields.length === 0) return null

    fields.push(`updated_at = now()`)
    values.push(id)

    const result = await pool.query(
      `UPDATE show_schedule SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    )
    return result.rows[0]
  },

  async deleteScheduleItem(id: string) {
    await pool.query('DELETE FROM show_schedule WHERE id = $1', [id])
    return { success: true }
  },

  // Applications
  async getApplications(filters?: { customerId?: string; agentId?: string; status?: string }) {
    // Read from all application tables (pending, approved, rejected)
    const values = []
    let paramCount = 1
    let whereConditions = []

    if (filters?.customerId) {
      whereConditions.push(`customer_id = $${paramCount}`)
      values.push(filters.customerId)
      paramCount++
    }
    if (filters?.agentId) {
      whereConditions.push(`(agent_id = $${paramCount} OR agent_id IS NULL)`)
      values.push(filters.agentId)
      paramCount++
    }
    if (filters?.status) {
      whereConditions.push(`status = $${paramCount}`)
      values.push(filters.status)
      paramCount++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    const query = `
      SELECT a.id, a.customer_id, a.agent_id, a.commercial_id, a.show_id, a.scheduled_at, 
             a.duration_seconds, a.status, a.cost, a.description, a.contact_phone,
             a.payment_method, a.payment_date, a.due_date, a.created_at, a.updated_at, a.source_table,
             c.name as customer_name, 
             c.first_name as customer_first_name, 
             c.last_name as customer_last_name, 
             c.email as customer_email, 
             c.phone as customer_phone,
             ag.name as agent_name,
             ag.first_name as agent_first_name,
             ag.last_name as agent_last_name,
             s.name as show_name, s.time_slot, s.base_price_per_min, s.show_type
      FROM (
        SELECT id, customer_id, agent_id, commercial_id, show_id, scheduled_at, duration_seconds, status, cost, 
               description, contact_phone, payment_method, payment_date, due_date, created_at, updated_at,
               'applications' as source_table FROM applications
        UNION ALL
        SELECT id, customer_id, agent_id, commercial_id, show_id, scheduled_at, duration_seconds, status, cost, 
               description, contact_phone, payment_method, payment_date, due_date, created_at, updated_at,
               'pending_applications' as source_table FROM pending_applications
        UNION ALL
        SELECT id, customer_id, agent_id, commercial_id, show_id, scheduled_at, duration_seconds, status, cost, 
               description, contact_phone, payment_method, payment_date, due_date, created_at, updated_at,
               'approved_applications' as source_table FROM approved_applications
        UNION ALL
        SELECT id, customer_id, agent_id, commercial_id, show_id, scheduled_at, duration_seconds, status, cost, 
               description, contact_phone, payment_method, payment_date, due_date, created_at, updated_at,
               'rejected_applications' as source_table FROM rejected_applications
      ) a
      JOIN users c ON a.customer_id = c.id
      LEFT JOIN users ag ON a.agent_id = ag.id
      JOIN shows s ON a.show_id = s.id
      ${whereClause}
      ORDER BY a.created_at DESC
    `

    const result = await pool.query(query, values)
    return result.rows
  },

  async createApplication(applicationData: {
    customer_id: string;
    agent_id?: string;
    show_id: string;
    scheduled_at: string;
    duration_seconds: number;
    description?: string;
    contact_phone?: string;
  }) {
    // Calculate cost using DB function if exists, else fallback to base price
    let cost: number
    try {
      const costResult = await pool.query(
        'SELECT calculate_ad_cost($1::int, $2::uuid) as cost',
        [applicationData.duration_seconds, applicationData.show_id]
      )
      cost = Number(costResult.rows[0]?.cost)
      if (!Number.isFinite(cost)) throw new Error('Invalid cost from function')
    } catch (e) {
      const fallback = await pool.query(
        'SELECT base_price_per_min * CEIL($1::int / 60.0) AS cost FROM shows WHERE id = $2::uuid',
        [applicationData.duration_seconds, applicationData.show_id]
      )
      cost = Number(fallback.rows[0]?.cost) || 0
    }

    // Insert into pending_applications (new workflow)
    const result = await pool.query(
      `INSERT INTO pending_applications (customer_id, agent_id, show_id, scheduled_at, duration_seconds, cost, description, contact_phone, due_date)
       VALUES ($1, $2, $3, $4::timestamp, $5, $6, $7, $8, $4::timestamp + interval '30 days')
       RETURNING *`,
      [
        applicationData.customer_id,
        applicationData.agent_id,
        applicationData.show_id,
        applicationData.scheduled_at,
        applicationData.duration_seconds,
        cost,
        applicationData.description,
        applicationData.contact_phone
      ]
    )
    return result.rows[0]
  },

  // New helpers for workflow tables
  async getPendingApplications(filters?: { customerId?: string; agentId?: string; status?: string }) {
    let query = `SELECT pa.*, u.name as customer_name, u.email as customer_email, ag.name as agent_name, s.name as show_name FROM pending_applications pa JOIN users u ON pa.customer_id = u.id LEFT JOIN users ag ON pa.agent_id = ag.id JOIN shows s ON pa.show_id = s.id WHERE 1=1 `
    const values: any[] = []
    let paramCount = 1
    if (filters?.customerId) {
      query += ` AND pa.customer_id = $${paramCount++}`
      values.push(filters.customerId)
    }
    if (filters?.agentId) {
      // Return applications assigned to this agent OR unassigned (agent_id IS NULL)
      query += ` AND (pa.agent_id = $${paramCount} OR pa.agent_id IS NULL)`
      values.push(filters.agentId)
      paramCount++
    }
    if (filters?.status) {
      query += ` AND pa.status = $${paramCount++}`
      values.push(filters.status)
    }
    query += ' ORDER BY pa.created_at DESC'
    const result = await pool.query(query, values)
    return result.rows
  },

  async getApprovedApplications(filters?: { customerId?: string; agentId?: string }) {
    let query = `SELECT aa.*, u.name as customer_name, u.email as customer_email, ag.name as agent_name, s.name as show_name FROM approved_applications aa JOIN users u ON aa.customer_id = u.id LEFT JOIN users ag ON aa.agent_id = ag.id JOIN shows s ON aa.show_id = s.id WHERE 1=1 `
    const values: any[] = []
    let paramCount = 1
    if (filters?.customerId) {
      query += ` AND aa.customer_id = $${paramCount++}`
      values.push(filters.customerId)
    }
    if (filters?.agentId) {
      query += ` AND aa.agent_id = $${paramCount++}`
      values.push(filters.agentId)
    }
    query += ' ORDER BY aa.created_at DESC'
    const result = await pool.query(query, values)
    return result.rows
  },

  async getRejectedApplications(filters?: { customerId?: string; agentId?: string }) {
    let query = `SELECT ra.*, u.name as customer_name, u.email as customer_email, ag.name as agent_name, s.name as show_name FROM rejected_applications ra JOIN users u ON ra.customer_id = u.id LEFT JOIN users ag ON ra.agent_id = ag.id JOIN shows s ON ra.show_id = s.id WHERE 1=1 `
    const values: any[] = []
    let paramCount = 1
    if (filters?.customerId) {
      query += ` AND ra.customer_id = $${paramCount++}`
      values.push(filters.customerId)
    }
    if (filters?.agentId) {
      query += ` AND ra.agent_id = $${paramCount++}`
      values.push(filters.agentId)
    }
    query += ' ORDER BY ra.created_at DESC'
    const result = await pool.query(query, values)
    return result.rows
  },

  async updateApplicationStatus(id: string, status: string, updatedBy?: string) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Find the application in any of the workflow tables
      const findRes = await client.query(
        `SELECT 'applications' as src, a.* FROM applications a WHERE id = $1
         UNION ALL
         SELECT 'pending_applications' as src, pa.* FROM pending_applications pa WHERE id = $1
         UNION ALL
         SELECT 'approved_applications' as src, aa.* FROM approved_applications aa WHERE id = $1
         UNION ALL
         SELECT 'rejected_applications' as src, ra.* FROM rejected_applications ra WHERE id = $1`,
        [id]
      )

      if (findRes.rowCount === 0) {
        await client.query('ROLLBACK')
        return null
      }

      const row = findRes.rows[0]
      const srcTable = row.src

      // Determine target table based on status
      // in_progress and sent_to_commercial stay in pending_applications (workflow continues there)
      let targetTable: string
      if (status === 'pending' || status === 'in_progress' || status === 'sent_to_commercial') {
        targetTable = 'pending_applications'
      } else if (status === 'approved' || status === 'paid') {
        targetTable = 'approved_applications'
      } else if (status === 'rejected' || status === 'overdue') {
        targetTable = 'rejected_applications'
      } else {
        targetTable = 'applications'
      }

      // Insert into target table (if different)
      if (srcTable !== targetTable) {
        const insertQuery = `INSERT INTO ${targetTable} (id, customer_id, agent_id, show_id, scheduled_at, duration_seconds, status, cost, description, contact_phone, payment_method, payment_date, due_date, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()`

        await client.query(insertQuery, [
          row.id,
          row.customer_id,
          row.agent_id,
          row.show_id,
          row.scheduled_at,
          row.duration_seconds,
          status,
          row.cost,
          row.description,
          row.contact_phone,
          row.payment_method,
          row.payment_date,
          row.due_date,
          row.created_at,
          new Date()
        ])

        // Delete from source table if it is one of the workflow tables
        if (['pending_applications','approved_applications','rejected_applications','applications'].includes(srcTable)) {
          await client.query(`DELETE FROM ${srcTable} WHERE id = $1`, [id])
        }
      } else {
        // same table — just update status
        await client.query(`UPDATE ${srcTable} SET status = $1, updated_at = now() WHERE id = $2`, [status, id])
      }

      // If approved, verify slots and create commissions/services feed using existing DB functions
      if (status === 'approved') {
        // lock schedule row and ensure slots
        const minutesNeededRes = await client.query('SELECT CEIL($1::int / 60.0) as minutes_needed', [row.duration_seconds])
        const minutesNeeded = Number(minutesNeededRes.rows[0].minutes_needed || 0)

        const schedRes = await client.query(`SELECT * FROM show_schedule WHERE show_id = $1 AND scheduled_date = ($2 AT TIME ZONE 'utc')::date FOR UPDATE`, [row.show_id, row.scheduled_at])
        if (schedRes.rowCount === 0) {
          await client.query('ROLLBACK')
          throw new Error('No schedule for selected date')
        }
        const sched = schedRes.rows[0]
        if (sched.available_slots < minutesNeeded) {
          await client.query('ROLLBACK')
          throw new Error('Not enough ad slots')
        }

        await client.query('UPDATE show_schedule SET available_slots = available_slots - $1, updated_at = now() WHERE id = $2', [minutesNeeded, sched.id])

        // Call stored functions
        await client.query('SELECT upsert_services_feed($1::uuid)', [id])
        await client.query('SELECT upsert_commission($1::uuid, $2::uuid, $3::numeric)', [id, row.agent_id, row.cost])
        // Notify customer about approval
        await client.query("SELECT notify_user($1::uuid, 'application', 'Ваша заявка одобрена', 'Ваша заявка была одобрена и запланирована')", [row.customer_id])
      }
      if (status === 'rejected') {
        // Notify customer about rejection
        await client.query("SELECT notify_user($1::uuid, 'application', 'Ваша заявка отклонена', 'Ваша заявка была отклонена')", [row.customer_id])
      }

      await client.query('COMMIT')

      // Return the newly inserted/updated row from target table
      const out = await pool.query(`SELECT * FROM ${targetTable} WHERE id = $1`, [id])
      return out.rows[0]
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async updateApplicationDetails(id: string, updateData: { description?: string; contact_phone?: string; duration_seconds?: number; show_id?: string; scheduled_at?: string; cost?: number }) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Find the application in workflow tables
      const findRes = await client.query(
        `SELECT 'pending_applications' as src FROM pending_applications WHERE id = $1
         UNION ALL
         SELECT 'approved_applications' as src FROM approved_applications WHERE id = $1
         UNION ALL
         SELECT 'rejected_applications' as src FROM rejected_applications WHERE id = $1
         UNION ALL
         SELECT 'applications' as src FROM applications WHERE id = $1`,
        [id]
      )

      if (findRes.rowCount === 0) {
        await client.query('ROLLBACK')
        return null
      }

      const srcTable = findRes.rows[0].src
      
      // Build update query dynamically
      const updates: string[] = []
      const values: any[] = []
      let paramCount = 1

      if (updateData.description !== undefined) {
        updates.push(`description = $${paramCount++}`)
        values.push(updateData.description)
      }
      if (updateData.contact_phone !== undefined) {
        updates.push(`contact_phone = $${paramCount++}`)
        values.push(updateData.contact_phone)
      }
      if (updateData.duration_seconds !== undefined) {
        updates.push(`duration_seconds = $${paramCount++}`)
        values.push(updateData.duration_seconds)
      }
      if (updateData.show_id !== undefined) {
        updates.push(`show_id = $${paramCount++}`)
        values.push(updateData.show_id)
      }
      if (updateData.scheduled_at !== undefined) {
        updates.push(`scheduled_at = $${paramCount++}`)
        values.push(updateData.scheduled_at)
      }
      if (updateData.cost !== undefined) {
        updates.push(`cost = $${paramCount++}`)
        values.push(updateData.cost)
      }

      if (updates.length === 0) {
        await client.query('ROLLBACK')
        return null
      }

      updates.push(`updated_at = now()`)
      values.push(id)

      const updateQuery = `UPDATE ${srcTable} SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`
      const result = await client.query(updateQuery, values)

      await client.query('COMMIT')
      return result.rows[0]
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async deleteApplication(id: string) {
    // Remove from any workflow table where it exists
    await pool.query('DELETE FROM pending_applications WHERE id = $1', [id])
    await pool.query('DELETE FROM approved_applications WHERE id = $1', [id])
    await pool.query('DELETE FROM rejected_applications WHERE id = $1', [id])
    await pool.query('DELETE FROM applications WHERE id = $1', [id])
    return { success: true }
  },

  // Commissions
  async getCommissions(agentId?: string) {
    let query = `
      SELECT c.*, a.cost, a.duration_seconds, a.scheduled_at,
             s.name as show_name, cu.name as customer_name
      FROM commissions c
      JOIN applications a ON c.application_id = a.id
      JOIN shows s ON a.show_id = s.id
      JOIN users cu ON a.customer_id = cu.id
      WHERE 1=1
    `
    const values = []
    let paramCount = 1

    if (agentId) {
      query += ` AND c.agent_id = $${paramCount++}`
      values.push(agentId)
    }

    query += ' ORDER BY c.created_at DESC'

    const result = await pool.query(query, values)
    return result.rows
  },

  // Notifications
  async getNotifications(userId: string, limit = 50) {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    )
    return result.rows
  },

  async createNotification(notificationData: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    const result = await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [notificationData.user_id, notificationData.type, notificationData.title, notificationData.message, notificationData.data ? JSON.stringify(notificationData.data) : null]
    )
    return result.rows[0]
  },

  async getUnreadNotifications(userId: string) {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 AND read = FALSE ORDER BY created_at DESC',
      [userId]
    )
    return result.rows
  },

  async getUnreadCount(userId: string) {
    const result = await pool.query(
      'SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND read = FALSE',
      [userId]
    )
    return result.rows[0]?.count || 0
  },

  async markNotificationAsRead(id: string) {
    const result = await pool.query(
      'UPDATE notifications SET read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    )
    return result.rows[0]
  },

  async markAllNotificationsAsRead(userId: string) {
    const result = await pool.query(
      'UPDATE notifications SET read = TRUE, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND read = FALSE',
      [userId]
    )
    return { count: result.rowCount || 0 }
  },

  async deleteNotification(id: string) {
    await pool.query('DELETE FROM notifications WHERE id = $1', [id])
    return { success: true }
  },

  // Chat messages
  async getChatMessages(roomId: string, limit = 100) {
    const result = await pool.query(
      `SELECT id, room_id, sender_id, sender_name, content, chat_type, application_id,
              file_url, file_name, file_size,
              EXTRACT(EPOCH FROM created_at)::bigint * 1000 as timestamp 
       FROM chat_messages 
       WHERE room_id = $1 
       ORDER BY created_at ASC 
       LIMIT $2`,
      [roomId, limit]
    )
    return result.rows
  },

  async createChatMessage(
    roomId: string, 
    senderId: string | null, 
    senderName: string | null, 
    content: string,
    chatType?: string,
    applicationId?: string,
    fileUrl?: string,
    fileName?: string,
    fileSize?: number
  ) {
    const result = await pool.query(
      `INSERT INTO chat_messages (
        room_id, sender_id, sender_name, content, chat_type, application_id, 
        file_url, file_name, file_size
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING id, room_id, sender_id, sender_name, content, chat_type, application_id, 
                file_url, file_name, file_size,
                EXTRACT(EPOCH FROM created_at)::bigint * 1000 as timestamp`,
      [
        roomId, 
        senderId, 
        senderName, 
        content, 
        chatType || 'customer-agent',
        applicationId || null,
        fileUrl || null,
        fileName || null,
        fileSize || null
      ]
    )
    return result.rows[0]
  },

  // Assign application to an agent (set agent_id) across workflow tables
  async assignApplicationToAgent(id: string, agentId: string) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const findRes = await client.query(
        `SELECT 'applications' as src, a.* FROM applications a WHERE id = $1
         UNION ALL
         SELECT 'pending_applications' as src, pa.* FROM pending_applications pa WHERE id = $1
         UNION ALL
         SELECT 'approved_applications' as src, aa.* FROM approved_applications aa WHERE id = $1
         UNION ALL
         SELECT 'rejected_applications' as src, ra.* FROM rejected_applications ra WHERE id = $1`,
        [id]
      )
      if (findRes.rowCount === 0) {
        await client.query('ROLLBACK')
        return null
      }
      const row = findRes.rows[0]
      const src = row.src
      // Update agent_id and change status to 'in_progress' (agent is working with customer)
      await client.query(
        `UPDATE ${src} SET agent_id = $1, status = 'in_progress', updated_at = now() WHERE id = $2`, 
        [agentId, id]
      )
      await client.query('COMMIT')
      const out = await pool.query(`SELECT * FROM ${src} WHERE id = $1`, [id])
      return out.rows[0]
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  // Services Feed (public)
  async getServicesFeed() {
    const result = await pool.query(`
      SELECT sf.*, s.name as show_name, c.name as client_name
      FROM services_feed sf
      JOIN applications a ON sf.application_id = a.id
      JOIN shows s ON a.show_id = s.id
      JOIN users c ON a.customer_id = c.id
      WHERE sf.status = 'completed'
      ORDER BY sf.created_at DESC
      LIMIT 50
    `)
    return result.rows
  },

  // Statistics
  async getDashboardStats(role: string, userId?: string) {
    const stats: any = {}

    switch (role) {
      case 'customer':
        const customerApps = await pool.query(
          'SELECT COUNT(*) as total, SUM(cost) as total_cost FROM applications WHERE customer_id = $1',
          [userId]
        )
        stats.applications = customerApps.rows[0]
        break

      case 'agent':
        const agentApps = await pool.query(
          'SELECT COUNT(*) as total FROM applications WHERE agent_id = $1',
          [userId]
        )
        const agentCommissions = await pool.query(
          'SELECT COUNT(*) as total, SUM(amount) as total_amount FROM commissions WHERE agent_id = $1',
          [userId]
        )
        stats.applications = agentApps.rows[0]
        stats.commissions = agentCommissions.rows[0]
        break

      case 'commercial':
        const commercialStats = await pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM show_schedule) as total_shows,
            (SELECT COUNT(*) FROM applications WHERE status = 'sent_to_commercial') as pending_applications,
            (SELECT COUNT(*) FROM applications WHERE status = 'approved') as approved_applications
        `)
        stats.commercial = commercialStats.rows[0]
        break

      case 'accountant':
        const accountantStats = await pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM applications WHERE status = 'approved') as approved_applications,
            (SELECT COUNT(*) FROM applications WHERE status = 'paid') as paid_applications,
            (SELECT SUM(cost) FROM applications WHERE status = 'paid') as total_revenue
        `)
        stats.accountant = accountantStats.rows[0]
        break
    }

    return stats
  }
}

export default pool
