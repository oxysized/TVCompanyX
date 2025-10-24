import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { db } from '../../../lib/database';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    // Get user by email
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Аккаунт деактивирован' });
    }

    // Verify password (defensive: ensure password_hash exists)
    const storedHash = (user as any).password_hash || (user as any).passwordHash || null
    if (!storedHash) {
      console.error('Login attempted but user has no password_hash set for id', user.id)
      return res.status(401).json({ error: 'Неверный email или пароль' })
    }

    const isPasswordValid = await bcrypt.compare(password, storedHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Return user data and token (without password hash)
    const { password_hash, ...userWithoutPassword } = user;

    // Set HttpOnly cookie for the token (server-side managed session)
    const maxAge = 7 * 24 * 60 * 60 // 7 days
    const isProd = process.env.NODE_ENV === 'production'
    const cookieOptions = `HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${isProd ? '; Secure' : ''}`
    res.setHeader('Set-Cookie', `token=${token}; ${cookieOptions}`)

    res.status(200).json({
      message: 'Успешный вход',
      token, // still returning token in body for client use if needed
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login API error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}



