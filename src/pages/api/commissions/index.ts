import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { db } from '../../../lib/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    let { agentId } = req.query as any

    if (!agentId) {
      // try infer from token
      const authHeader = req.headers.authorization || ''
      let token = ''
      if (authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1]
      else if (req.cookies && req.cookies.token) token = req.cookies.token

      if (!token) return res.status(401).json({ error: 'Not authenticated' })
      const secret = process.env.JWT_SECRET || 'your-secret-key'
      let decoded: any
      try {
        decoded = jwt.verify(token, secret)
      } catch (e) {
        return res.status(401).json({ error: 'Invalid token' })
      }
      agentId = decoded?.userId
    }

    // Get raw commissions rows
    const commissions = await db.getCommissions(agentId)

    // Monthly aggregation (simple group by month from created_at)
    const monthlyMap: Record<string, { amount: number; applications: number }> = {}
    for (const row of commissions) {
      const m = new Date(row.created_at).toLocaleString('ru-RU', { month: 'long', year: 'numeric' })
      if (!monthlyMap[m]) monthlyMap[m] = { amount: 0, applications: 0 }
      monthlyMap[m].amount += Number(row.amount || 0)
      monthlyMap[m].applications += 1
    }

    const monthly = Object.keys(monthlyMap).map(month => ({ month, amount: monthlyMap[month].amount, applications: monthlyMap[month].applications }))

    // total
    const total = commissions.reduce((s: number, r: any) => s + Number(r.amount || 0), 0)

    return res.status(200).json({ commissions, monthly, total })
  } catch (error) {
    console.error('Commissions API error:', error)
    return res.status(500).json({ error: 'Failed to load commissions' })
  }
}
