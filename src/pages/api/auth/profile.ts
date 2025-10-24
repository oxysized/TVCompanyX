import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { db } from '../../../lib/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
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
    if (!userId) return res.status(401).json({ error: 'Invalid token payload' })

    const { name, first_name, middle_name, last_name, email, phone, bank_details, oldPassword, newPassword } = req.body

    const updates: any = {}
    // Support both single name and split name fields
    if (first_name !== undefined) updates.first_name = first_name
    if (middle_name !== undefined) updates.middle_name = middle_name
    if (last_name !== undefined) updates.last_name = last_name
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    if (phone !== undefined) updates.phone = phone
    if (bank_details !== undefined) updates.bank_details = bank_details

    // If password change requested, require oldPassword and newPassword
    if (oldPassword || newPassword) {
      if (!oldPassword || !newPassword) return res.status(400).json({ error: 'To change password, provide oldPassword and newPassword' })
      const userRecord = await db.getUserById(userId)
      if (!userRecord) return res.status(404).json({ error: 'User not found' })
      const currentHash = (userRecord as any).password_hash || (userRecord as any).passwordHash || null
      if (!currentHash) return res.status(400).json({ error: 'No password set on account' })
      const match = await bcrypt.compare(oldPassword, currentHash)
      if (!match) return res.status(400).json({ error: 'Old password is incorrect' })
      if (newPassword.length < 6) return res.status(400).json({ error: 'Новый пароль должен содержать минимум 6 символов' })
      const hash = await bcrypt.hash(newPassword, 10)
      updates['password_hash'] = hash
    }

    const updated = await db.updateUser(userId, updates)
    if (!updated) return res.status(404).json({ error: 'User not found or no changes' })

    // Create a notification about profile update
    try {
      await db.createNotification({ user_id: userId, type: 'profile', title: 'Профиль обновлён', message: 'Ваши данные профиля были успешно обновлены' })
    } catch (e) {
      console.error('Failed to create profile notification', e)
    }

    return res.status(200).json({ message: 'Profile updated', user: updated })
  } catch (error) {
    console.error('Profile update error:', error)
    return res.status(500).json({ error: 'Failed to update profile' })
  }
}
