import { NextApiRequest, NextApiResponse } from 'next'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:0112@localhost:5432/TVShow',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid contract ID' })
  }

  try {
    switch (req.method) {
      case 'GET': {
        // Get single contract
        const result = await pool.query(
          `SELECT 
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
          WHERE c.id = $1`,
          [id]
        )

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Contract not found' })
        }

        return res.status(200).json(result.rows[0])
      }

      case 'PATCH': {
        // Update contract status
        const { status, viewed_at, downloaded_at } = req.body

        const updates: string[] = []
        const values: any[] = []
        let paramIndex = 1

        if (status) {
          updates.push(`status = $${paramIndex++}`)
          values.push(status)
        }

        if (viewed_at !== undefined) {
          updates.push(`viewed_at = $${paramIndex++}`)
          values.push(viewed_at)
        }

        if (downloaded_at !== undefined) {
          updates.push(`downloaded_at = $${paramIndex++}`)
          values.push(downloaded_at)
        }

        if (updates.length === 0) {
          return res.status(400).json({ error: 'No fields to update' })
        }

        values.push(id)
        const query = `
          UPDATE contracts 
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `

        const result = await pool.query(query, values)

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Contract not found' })
        }

        return res.status(200).json(result.rows[0])
      }

      default:
        res.setHeader('Allow', ['GET', 'PATCH'])
        return res.status(405).json({ error: `Method ${req.method} not allowed` })
    }
  } catch (error: any) {
    console.error('Contract API error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
