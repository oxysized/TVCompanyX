import { NextApiRequest, NextApiResponse } from 'next'
import { Pool } from 'pg'
import jsPDF from 'jspdf'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:0112@localhost:5432/TVShow',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

// Simple transliteration function for Cyrillic to Latin
const transliterate = (text: string): string => {
  const map: { [key: string]: string } = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh',
    'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
    'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
    'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  }
  
  return text.split('').map(char => map[char] || char).join('')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid contract ID' })
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  try {
    // Get contract data
    const result = await pool.query(
      `SELECT 
        c.*,
        app.status as application_status,
        s.name as app_show_name
      FROM contracts c
      LEFT JOIN (
        SELECT id, status, show_id FROM applications
        UNION ALL
        SELECT id, status, show_id FROM pending_applications
        UNION ALL
        SELECT id, status, show_id FROM approved_applications
        UNION ALL
        SELECT id, status, show_id FROM rejected_applications
      ) app ON c.application_id = app.id
      LEFT JOIN shows s ON app.show_id = s.id
      WHERE c.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    const contract = result.rows[0]

    // Update status to downloaded
    await pool.query(
      `UPDATE contracts 
       SET status = 'downloaded', downloaded_at = NOW()
       WHERE id = $1`,
      [id]
    )

    // Create PDF
    const doc = new jsPDF()
    
    // Set font
    doc.setFont('helvetica')
    
    let y = 20

    // Title
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('ADVERTISEMENT PLACEMENT AGREEMENT', 105, y, { align: 'center' })
    y += 10
    
    doc.setFontSize(14)
    doc.text(`No. ${contract.contract_number}`, 105, y, { align: 'center' })
    y += 15

    // Date
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const contractDate = new Date(contract.contract_date)
    doc.text(`Date: ${contractDate.toLocaleDateString('en-US')}`, 20, y)
    y += 15

    // Company info
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('COMPANY:', 20, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.text(transliterate(contract.company_name || 'TV Kompaniya X'), 20, y)
    y += 12

    // Customer info
    doc.setFont('helvetica', 'bold')
    doc.text('CLIENT:', 20, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.text(`Name: ${transliterate(contract.customer_name)}`, 20, y)
    y += 6
    doc.text(`Email: ${contract.customer_email}`, 20, y)
    y += 6
    doc.text(`Phone: ${contract.customer_phone}`, 20, y)
    y += 12

    // Line separator
    doc.setLineWidth(0.5)
    doc.line(20, y, 190, y)
    y += 10

    // Advertisement details
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('PLACEMENT DETAILS:', 20, y)
    y += 10

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    
    // Show name
    doc.text(`Program/Show: ${transliterate(contract.show_name)}`, 25, y)
    y += 7

    // Scheduled time
    const scheduledAt = new Date(contract.scheduled_at)
    doc.text(`Air Date & Time: ${scheduledAt.toLocaleString('en-US')}`, 25, y)
    y += 7

    // Duration
    const minutes = Math.floor(contract.duration_seconds / 60)
    const seconds = contract.duration_seconds % 60
    doc.text(`Duration: ${minutes}:${seconds.toString().padStart(2, '0')} min`, 25, y)
    y += 7

    // Description
    if (contract.description) {
      doc.text('Description:', 25, y)
      y += 7
      const translitDescription = transliterate(contract.description)
      const splitDescription = doc.splitTextToSize(translitDescription, 160)
      doc.text(splitDescription, 25, y)
      y += splitDescription.length * 6
    }

    y += 5

    // Line separator
    doc.setLineWidth(0.5)
    doc.line(20, y, 190, y)
    y += 10

    // Cost
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`TOTAL COST: ${contract.cost.toLocaleString('en-US')} RUB`, 20, y)
    y += 15

    // Line separator
    doc.setLineWidth(0.5)
    doc.line(20, y, 190, y)
    y += 10

    // Footer
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.text('This agreement is an official document', 105, y, { align: 'center' })
    y += 5
    const companyName = transliterate(contract.company_name || 'TV Kompaniya X')
    doc.text(`for advertising placement in ${companyName}`, 105, y, { align: 'center' })
    y += 10

    // Signatures section
    doc.setFont('helvetica', 'normal')
    doc.text('________________________', 20, y)
    doc.text('________________________', 120, y)
    y += 5
    doc.setFontSize(9)
    doc.text('Company Signature', 20, y)
    doc.text('Client Signature', 120, y)

    // Generate PDF as buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Contract_${contract.contract_number}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)

    // Send PDF
    res.send(pdfBuffer)

  } catch (error: any) {
    console.error('Contract download error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
