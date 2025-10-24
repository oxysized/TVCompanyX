import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { db } from '../../../lib/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
  
  // Only commercial/admin can view schedule
  if (!['commercial', 'admin', 'director'].includes(user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  try {
    const { date } = req.query

    // Get all shows
    const shows = await db.getShows()

    // Get all approved applications
    const applications = await db.getApplications({ status: 'approved' })

    // Filter applications by date if provided
    let filteredApplications = applications
    if (date) {
      const targetDate = new Date(date as string)
      filteredApplications = applications.filter(app => {
        if (!app.scheduled_at) return false
        const appDate = new Date(app.scheduled_at)
        return appDate.toDateString() === targetDate.toDateString()
      })
    }

    // Build schedule data
    const scheduleData = shows.map(show => {
      const showApplications = filteredApplications.filter(app => app.show_id === show.id)
      
      return {
        show_id: show.id,
        show_name: show.name,
        time_slot: show.time_slot,
        show_type: show.show_type,
        duration_minutes: show.duration_minutes,
        base_price_per_min: show.base_price_per_min,
        is_active: show.is_active,
        applications: showApplications.map(app => ({
          id: app.id,
          customer_name: app.customer_name || `${app.customer_first_name || ''} ${app.customer_last_name || ''}`.trim(),
          customer_email: app.customer_email,
          scheduled_at: app.scheduled_at,
          duration_seconds: app.duration_seconds,
          cost: parseFloat(app.cost) || 0,
          status: app.status,
        }))
      }
    })

    res.status(200).json(scheduleData)

  } catch (error) {
    console.error('Error fetching schedule:', error)
    return res.status(500).json({ error: 'Failed to fetch schedule' })
  }
}
