import { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../lib/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const rows = await db.getPendingApplications()
    return res.status(200).json(rows)
  } catch (err) {
    console.error('Debug pending error', err)
    return res.status(500).json({ error: 'Failed to load pending applications' })
  }
}
