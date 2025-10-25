import { NextApiRequest, NextApiResponse } from 'next'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:0112@localhost:5432/TVShow',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET': {
        // Get contracts list
        const { customerId, agentId } = req.query
        
        let query = `
          SELECT 
            c.*,
            app.status as application_status,
            s.name as app_show_name
          FROM contracts c
          LEFT JOIN (
            SELECT id, status, show_id FROM applications
            UNION ALL
            SELECT id, status, show_id FROM pending_applications
            UNION ALL
            SELECT id, status, show_id FROM approved_applications
            UNION ALL
            SELECT id, status, show_id FROM rejected_applications
          ) app ON c.application_id = app.id
          LEFT JOIN shows s ON app.show_id = s.id
          WHERE 1=1
        `
        
        const params: any[] = []
        let paramIndex = 1
        
        if (customerId) {
          query += ` AND c.customer_id = $${paramIndex++}`
          params.push(customerId)
        }
        
        if (agentId) {
          query += ` AND c.agent_id = $${paramIndex++}`
          params.push(agentId)
        }
        
        query += ` ORDER BY c.created_at DESC`
        
        const result = await pool.query(query, params)
        return res.status(200).json(result.rows)
      }

      case 'POST': {
        // Create new contract
        const {
          application_id,
          customer_id,
          agent_id,
          show_name,
          scheduled_at,
          duration_seconds,
          cost,
          customer_name,
          customer_email,
          customer_phone,
          description,
          company_name
        } = req.body

        if (!application_id || !customer_id || !agent_id) {
          return res.status(400).json({ error: 'Missing required fields' })
        }

        // Verify application exists in any of the application tables
        const applicationCheck = await pool.query(
          `SELECT id FROM applications WHERE id = $1
           UNION ALL
           SELECT id FROM pending_applications WHERE id = $1
           UNION ALL
           SELECT id FROM approved_applications WHERE id = $1
           UNION ALL
           SELECT id FROM rejected_applications WHERE id = $1
           LIMIT 1`,
          [application_id]
        )

        if (applicationCheck.rows.length === 0) {
          return res.status(404).json({ error: 'Application not found' })
        }

        // Check if contract already exists for this application
        const existingContract = await pool.query(
          'SELECT id FROM contracts WHERE application_id = $1',
          [application_id]
        )

        if (existingContract.rows.length > 0) {
          return res.status(400).json({ error: 'Contract already exists for this application' })
        }

        const query = `
          INSERT INTO contracts (
            application_id,
            customer_id,
            agent_id,
            show_name,
            scheduled_at,
            duration_seconds,
            cost,
            customer_name,
            customer_email,
            customer_phone,
            description,
            company_name
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `

        const values = [
          application_id,
          customer_id,
          agent_id,
          show_name,
          scheduled_at,
          duration_seconds,
          cost,
          customer_name,
          customer_email,
          customer_phone,
          description,
          company_name || 'ТВ Компания X'
        ]

        const result = await pool.query(query, values)
        return res.status(201).json(result.rows[0])
      }

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${req.method} not allowed` })
    }
  } catch (error: any) {
    console.error('Contracts API error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
