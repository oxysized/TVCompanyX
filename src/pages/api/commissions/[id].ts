import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import pool, { db } from '../../../lib/database'
import { sendNotificationToUser } from '../../../lib/socketServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string }
  
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Authenticate
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
    
    const userId = decoded?.userId
    const user = await db.getUserById(userId)
    if (!user) return res.status(401).json({ error: 'User not found' })
    
    // Only admin/director/accountant can update commission status
    if (!['admin', 'director', 'accountant'].includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const { status, payment_date } = req.body || {}
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' })
    }

    // Update commission
    const result = await pool.query(
      'UPDATE commissions SET status = $1, payment_date = $2, updated_at = now() WHERE id = $3 RETURNING *',
      [status, payment_date || null, id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Commission not found' })
    }

    const commission = result.rows[0]

    // Create notification for agent if commission is paid
    if (status === 'paid' && commission.agent_id) {
      try {
        const notification = await db.createNotification({
          user_id: commission.agent_id,
          type: 'commission_paid',
          title: 'Комиссия выплачена',
          message: `Вам выплачена комиссия в размере ${commission.amount} руб. за заявку`,
          data: {
            commissionId: commission.id,
            applicationId: commission.application_id,
            amount: commission.amount,
            paymentDate: commission.payment_date
          }
        })
        
        // Send realtime notification
        sendNotificationToUser(commission.agent_id, notification)
      } catch (notifErr) {
        console.error('Failed to create commission notification:', notifErr)
        // Don't fail the request
      }
    }

    return res.status(200).json(commission)
  } catch (error) {
    console.error('Commission update error:', error)
    return res.status(500).json({ error: 'Failed to update commission' })
  }
}
