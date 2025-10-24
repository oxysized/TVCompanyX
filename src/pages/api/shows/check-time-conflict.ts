import type { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { db } from '../../../lib/database'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface Show {
  id: string
  name: string
  time_slot: string
  show_type?: string
  is_recurring?: boolean
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Auth check
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const user = await db.getUserById(decoded.userId)
    
    if (!user || !['commercial', 'admin', 'director'].includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { time_slot, show_id, is_recurring, recurring_days } = req.body

    if (!time_slot) {
      return res.status(400).json({ error: 'time_slot is required' })
    }

    // Parse time slot (format: "HH:MM-HH:MM")
    const [startTime, endTime] = time_slot.split('-')
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'Invalid time_slot format. Use HH:MM-HH:MM' })
    }

    // Find conflicting shows
    const allShows = await db.getShows()
    
    const conflicts = allShows.filter((show: Show) => {
      // Skip the show being edited
      if (show_id && show.id === show_id) {
        return false
      }

      // Parse existing show time
      const [existingStart, existingEnd] = show.time_slot.split('-')
      if (!existingStart || !existingEnd) return false

      // Check if times overlap
      const newStart = startTime.trim()
      const newEnd = endTime.trim()
      const exStart = existingStart.trim()
      const exEnd = existingEnd.trim()

      // Convert to minutes for easier comparison
      const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number)
        return h * 60 + m
      }

      const newStartMin = toMinutes(newStart)
      const newEndMin = toMinutes(newEnd)
      const exStartMin = toMinutes(exStart)
      const exEndMin = toMinutes(exEnd)

      // Check overlap
      const hasOverlap = (newStartMin < exEndMin && newEndMin > exStartMin)

      return hasOverlap
    })

    if (conflicts.length > 0) {
      const conflictInfo = conflicts.map((show: Show) => ({
        name: show.name,
        time_slot: show.time_slot,
        type: show.show_type || 'program',
        is_recurring: show.is_recurring || false
      }))

      return res.status(200).json({
        conflict: true,
        message: 'В это время уже идёт другое шоу',
        conflicts: conflictInfo
      })
    }

    return res.status(200).json({
      conflict: false,
      message: 'Время свободно'
    })

  } catch (error) {
    console.error('Check time conflict error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
