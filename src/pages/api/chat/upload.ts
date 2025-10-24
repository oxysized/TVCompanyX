import { NextApiRequest, NextApiResponse } from 'next'
import formidable, { File } from 'formidable'
import fs from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'
import { db } from '../../../lib/database'

// Disable body parser for formidable
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Parse form data
    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 500 * 1024 * 1024, // 500 MB max
      filename: (_name: string, _ext: string, _part: any) => {
        // Generate unique filename
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        return `${timestamp}-${randomStr}${_ext}`
      }
    })

    const [fields, files] = await form.parse(req)
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Get file info
    const fileName = file.originalFilename || 'file'
    const fileSize = file.size
    const filePath = file.filepath
    const newPath = file.newFilename || path.basename(filePath)
    
    // Return file URL relative to public folder
    const fileUrl = `/uploads/${newPath}`

    console.log('[Upload] File uploaded:', {
      originalName: fileName,
      size: fileSize,
      url: fileUrl
    })

    return res.status(200).json({
      success: true,
      file: {
        url: fileUrl,
        name: fileName,
        size: fileSize
      }
    })
  } catch (error) {
    console.error('[Upload] Error:', error)
    return res.status(500).json({ error: 'Failed to upload file' })
  }
}
