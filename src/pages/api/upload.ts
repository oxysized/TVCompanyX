import { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 500 * 1024 * 1024, // 500MB - generous limit
  })

  try {
    const [fields, files] = await form.parse(req)
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const originalName = file.originalFilename || 'file'
    const ext = path.extname(originalName)
    const baseName = path.basename(originalName, ext)
    const newFileName = `${baseName}-${timestamp}${ext}`
    const newPath = path.join(uploadDir, newFileName)

    // Rename file
    fs.renameSync(file.filepath, newPath)

    // Return public URL
    const url = `/uploads/${newFileName}`
    
    return res.status(200).json({
      url,
      fileName: originalName,
      size: file.size
    })
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ error: 'File upload failed' })
  }
}
