import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { db } from '../../../lib/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { role } = req.query as { role?: string }

  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // For customer dashboard, infer user id from token
    if (role === 'customer') {
      // try token from header or cookie
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

  // recent 10 applications for this customer (search all workflow tables)
  const pending = await db.getPendingApplications({ customerId: userId })
  const approved = await db.getApprovedApplications({ customerId: userId })
  const rejected = await db.getRejectedApplications({ customerId: userId })
  
  // Combine all applications and remove duplicates by id
  const allApps = [...pending, ...approved, ...rejected]
  const uniqueApps = Array.from(
    new Map(allApps.map(app => [app.id, app])).values()
  )
  
  const recentRes = uniqueApps.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const recentApplications = (recentRes || []).slice(0, 10).map((a: any) => ({
        id: a.id,
        show: a.show_name || null,
        date: a.scheduled_at || a.created_at,
        duration: a.duration_seconds,
        status: a.status,
        cost: a.cost,
        created_at: a.created_at,
      }))

      // basic stats aggregated from workflow tables (use unique applications)
      const totalApplications = uniqueApps.length
      const approvedApplications = uniqueApps.filter((a: any) => a.status === 'approved' || a.status === 'paid').length
      const totalCost = uniqueApps
        .filter((a: any) => a.status === 'approved' || a.status === 'paid')
        .reduce((s: number, r: any) => s + Number(r.cost || 0), 0)
      const activeApplications = uniqueApps.filter((a: any) => 
        a.status === 'pending' || a.status === 'in_progress' || a.status === 'sent_to_commercial'
      ).length

      // monthlyApplications: group by month for the last 6 months from unique records
      const monthlyMap: Record<string, number> = {}
      const now = new Date()
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toLocaleString('ru-RU', { month: 'short', year: 'numeric' })
        monthlyMap[key] = 0
      }
      for (const a of uniqueApps) {
        const m = new Date(a.created_at || a.scheduled_at).toLocaleString('ru-RU', { month: 'short', year: 'numeric' })
        if (monthlyMap[m] !== undefined) monthlyMap[m]++
      }
      const monthlyApplications = Object.keys(monthlyMap).reverse().map(k => monthlyMap[k])

      // costByShow: aggregate cost per show name (only approved applications from unique set)
      const costMap: Record<string, number> = {}
      for (const a of uniqueApps.filter((app: any) => app.status === 'approved' || app.status === 'paid')) {
        const name = a.show_name || 'Unknown'
        costMap[name] = (costMap[name] || 0) + Number(a.cost || 0)
      }
      const costByShow = Object.keys(costMap).map(name => ({ show: name, cost: costMap[name] }))

      return res.status(200).json({
        recentApplications,
        totalApplications,
        approvedApplications,
        totalCost,
        activeApplications,
        monthlyApplications,
        costByShow,
      })
    }

    // For other roles return generic data (could be expanded per role)
    // If role is agent, build agent-focused stats (applications across workflow tables + commissions)
    if (role === 'agent') {
      const authHeader = req.headers.authorization || ''
      let token = ''
      if (authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1]
      else if (req.cookies && req.cookies.token) token = req.cookies.token

      // If token present, try to infer agent id; otherwise allow optional ?userId query param
      let agentId: string | undefined = (req.query as any).userId
      if (!agentId && token) {
        try {
          const secret = process.env.JWT_SECRET || 'your-secret-key'
          const decoded: any = jwt.verify(token, secret)
          agentId = decoded?.userId
        } catch (e) {
          // ignore token errors
        }
      }

      // Fetch workflow rows for this agent
      const pending = await db.getPendingApplications({ agentId })
      const approved = await db.getApprovedApplications({ agentId })
      const rejected = await db.getRejectedApplications({ agentId })

      // Also fetch other applications that might have 'in_progress' or 'sent_to_commercial' statuses
      const inProgress = await db.getApplications({ agentId, status: 'in_progress' })
      const sentToCommercial = await db.getApplications({ agentId, status: 'sent_to_commercial' })

      const allApps = [...pending, ...inProgress, ...sentToCommercial, ...approved, ...rejected]
      const recentRes = (allApps || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const recentApplications = (recentRes || []).slice(0, 10).map((a: any) => ({
        id: a.id,
        show: a.show_name || null,
        date: a.scheduled_at || a.created_at,
        duration: a.duration_seconds,
        status: a.status,
        cost: a.cost,
        created_at: a.created_at,
      }))

      const totalApplications = pending.length + approved.length + rejected.length + sentToCommercial.length
      const approvedApplications = approved.length
      const sentCount = sentToCommercial.length

      // Calculate total commission from approved applications
      // Assuming 10% commission rate - adjust as needed based on your business logic
      const commissionRate = 0.10
      const totalCommission = approved.reduce((sum: number, app: any) => {
        return sum + (Number(app.cost || 0) * commissionRate)
      }, 0)

      // Calculate monthly commissions from approved applications (last 6 months)
      const monthlyMap: Record<string, number> = {}
      const now = new Date()
      const months: string[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toLocaleString('ru-RU', { month: 'short', year: 'numeric' })
        monthlyMap[key] = 0
        months.push(key)
      }
      
      // Group approved applications by month and calculate commission
      for (const app of approved) {
        const appDate = new Date(app.created_at || app.scheduled_at)
        const monthKey = appDate.toLocaleString('ru-RU', { month: 'short', year: 'numeric' })
        if (monthlyMap[monthKey] !== undefined) {
          monthlyMap[monthKey] += Number(app.cost || 0) * commissionRate
        }
      }
      
      const monthlyCommissions = months.map(k => monthlyMap[k])

      return res.status(200).json({
        recentApplications,
        totalApplications,
        sentToCommercial: sentCount,
        approvedApplications,
        totalCommission,
        monthlyCommissions,
      })
    }

    // Example: return top 10 recent applications overall
    const apps = await db.getApplications()
    const recentApplications = (apps || []).slice(0, 10).map((a: any) => ({
      id: a.id,
      show: a.show_name || null,
      date: a.scheduled_at || a.created_at,
      duration: a.duration_seconds,
      status: a.status,
      cost: a.cost,
      created_at: a.created_at,
    }))

    return res.status(200).json({
      recentApplications,
      totalApplications: apps.length,
      approvedApplications: apps.filter((x: any) => x.status === 'approved').length,
      totalCost: apps.reduce((s: number, x: any) => s + Number(x.cost || 0), 0),
      activeApplications: apps.filter((x: any) => x.status === 'pending' || x.status === 'in_progress' || x.status === 'sent_to_commercial').length,
      monthlyApplications: [],
      costByShow: [],
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return res.status(500).json({ error: 'Failed to build dashboard data' })
  }
}
