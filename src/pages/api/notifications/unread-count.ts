import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { db } from '../../../lib/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
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
    if (!userId) return res.status(401).json({ error: 'Invalid user ID' })

    const count = await db.getUnreadCount(userId)
    return res.status(200).json({ count })
  } catch (error) {
    console.error('Unread count API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
