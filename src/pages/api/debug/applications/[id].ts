import { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../../lib/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query as { id?: string }
  if (!id) return res.status(400).json({ error: 'Missing id' })

  try {
    // Search across workflow and master tables for the application id
    const q = `
      SELECT 'applications' as src, a.* FROM applications a WHERE id = $1
      UNION ALL
      SELECT 'pending_applications' as src, pa.* FROM pending_applications pa WHERE id = $1
      UNION ALL
      SELECT 'approved_applications' as src, aa.* FROM approved_applications aa WHERE id = $1
      UNION ALL
      SELECT 'rejected_applications' as src, ra.* FROM rejected_applications ra WHERE id = $1
      LIMIT 1
    `

    const result = await (db as any).pool?.query ? (db as any).pool.query(q, [id]) : await (async () => {
      // fallback to using exported pool (if default export is pool)
      try {
        const pool = require('../../../../lib/database').default
        return await pool.query(q, [id])
      } catch (e) {
        throw e
      }
    })()

    if (!result || result.rowCount === 0) return res.status(404).json({ error: 'Application not found in any table' })

    return res.status(200).json({ source: result.rows[0].src, row: result.rows[0] })
  } catch (error) {
    console.error('Debug application lookup error:', error)
    return res.status(500).json({ error: 'Failed to lookup application' })
  }
}
