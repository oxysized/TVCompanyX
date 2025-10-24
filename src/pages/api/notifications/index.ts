import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { db } from '../../../lib/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization || ''
    let token = ''
    if (authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1]
    else if (req.cookies && req.cookies.token) token = req.cookies.token

    if (!token) return res.status(401).json({ error: 'Not authenticated' })
    const secret = process.env.JWT_SECRET || 'your-secret-key'
    let decoded: any
    try { decoded = jwt.verify(token, secret) } catch (e) { return res.status(401).json({ error: 'Invalid token' }) }
    const userId = decoded?.userId
    if (!userId) return res.status(401).json({ error: 'Invalid token payload' })

    if (req.method === 'GET') {
      const { unread } = req.query
      
      let rows
      if (unread === 'true') {
        rows = await db.getUnreadNotifications(userId)
      } else {
        rows = await db.getNotifications(userId, 50)
      }
      
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const { type, title, message, data } = req.body
      
      if (!type || !title || !message) {
        return res.status(400).json({ error: 'Missing required fields' })
      }
      
      const notification = await db.createNotification({
        user_id: userId,
        type,
        title,
        message,
        data
      })
      
      return res.status(201).json(notification)
    }

    if (req.method === 'PUT') {
      const { id } = req.body
      if (!id) return res.status(400).json({ error: 'Notification id required' })
      const updated = await db.markNotificationAsRead(id)
      return res.status(200).json(updated)
    }

    if (req.method === 'DELETE') {
      const result = await db.markAllNotificationsAsRead(userId)
      return res.status(200).json(result)
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Notifications API error', error)
    return res.status(500).json({ error: 'Notifications error' })
  }
}
