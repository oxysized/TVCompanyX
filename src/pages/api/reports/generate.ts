import { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../lib/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { clientEmail, periodType, startDate, endDate, format, includeCharts } = req.body

    if (!clientEmail || !startDate || !endDate || !format) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Get user from session (assuming you have auth middleware)
    // For now, we'll skip auth check and just generate the report

    console.log('Generate report request:', { clientEmail, startDate, endDate, format })

    // Fetch ALL applications (no filters)
    const applications = await db.getApplications()
    
    console.log(`Total applications: ${applications.length}`)
    
    // Filter by client email and date range
    const filteredApplications = applications.filter(app => {
      const appDate = new Date(app.created_at)
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      // Correct field is customer_email, not email
      const emailMatch = app.customer_email?.toLowerCase() === clientEmail.toLowerCase()
      const dateMatch = appDate >= start && appDate <= end
      
      return emailMatch && dateMatch
    })

    console.log(`Filtered applications for ${clientEmail}: ${filteredApplications.length}`)

    // Calculate statistics
    const approvedApps = filteredApplications.filter(app => app.status === 'approved')
    
    // Convert cost from string to number before summing
    const totalRevenue = approvedApps.reduce((sum, app) => {
      const cost = parseFloat(app.cost) || 0
      return sum + cost
    }, 0)
    
    console.log(`Approved apps: ${approvedApps.length}, Total revenue: ${totalRevenue}`)
    
    const stats = {
      totalApplications: filteredApplications.length,
      approvedApplications: approvedApps.length,
      rejectedApplications: filteredApplications.filter(app => app.status === 'rejected').length,
      pendingApplications: filteredApplications.filter(app => app.status === 'pending' || app.status === 'in_progress').length,
      totalRevenue: totalRevenue,
      applications: filteredApplications.map(app => ({
        id: app.id,
        email: app.customer_email,
        show_name: app.show_name,
        cost: parseFloat(app.cost) || 0,
        status: app.status,
        created_at: app.created_at,
        scheduled_at: app.scheduled_at,
        time_slot: app.time_slot,
      }))
    }

    // Generate report ID
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Store report data in memory or database
    // For now, we'll return the data immediately
    // In production, you might want to queue this for background processing

    return res.status(200).json({
      id: reportId,
      status: 'ready',
      data: stats,
      format,
      includeCharts,
      periodType,
      startDate,
      endDate,
      clientEmail,
    })

  } catch (error) {
    console.error('Error generating report:', error)
    return res.status(500).json({ error: 'Failed to generate report' })
  }
}
