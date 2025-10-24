import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { db } from '../../../lib/database';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { first_name, middle_name, last_name, email, password, phone, bank_details } = req.body;

    // Validate input
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'Имя (имя и фамилия), email и пароль обязательны' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user with separate name fields
    const user = await db.createUser({
      name: `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`,
      first_name,
      middle_name: middle_name || null,
      last_name,
      email,
      password_hash: passwordHash,
      role: 'customer',
      phone: phone || null,
      bank_details: bank_details || null,
    });

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

    // Set HttpOnly cookie for the token
    const maxAge = 7 * 24 * 60 * 60 // 7 days
    const isProd = process.env.NODE_ENV === 'production'
    const cookieOptions = `HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${isProd ? '; Secure' : ''}`
    res.setHeader('Set-Cookie', `token=${token}; ${cookieOptions}`)

    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        middle_name: user.middle_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration API error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}



