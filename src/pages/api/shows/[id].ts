import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { db } from '../../../lib/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string }

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
  
  // Only commercial/admin can manage shows
  if (!['commercial', 'admin', 'director'].includes(user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  try {
    switch (req.method) {
      case 'GET':
        const show = await db.getShowById(id)
        if (!show) {
          return res.status(404).json({ error: 'Show not found' })
        }
        res.status(200).json(show)
        break

      case 'PUT':
        const { 
          name, 
          time_slot, 
          base_price_per_min, 
          show_type, 
          duration_minutes, 
          description, 
          is_active 
        } = req.body

        const updatedShow = await db.updateShow(id, {
          name,
          time_slot,
          base_price_per_min: base_price_per_min !== undefined ? parseFloat(base_price_per_min) : undefined,
          show_type,
          duration_minutes: duration_minutes !== undefined ? parseInt(duration_minutes) : undefined,
          description,
          is_active
        })

        if (!updatedShow) {
          return res.status(404).json({ error: 'Show not found' })
        }

        res.status(200).json(updatedShow)
        break

      case 'DELETE':
        await db.deleteShow(id)
        res.status(200).json({ success: true })
        break

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Show API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
