import { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../../lib/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id, format, clientEmail, startDate, endDate } = req.query

    if (!clientEmail || !startDate || !endDate || !format) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    console.log('Report params:', { clientEmail, startDate, endDate, format })

    // Fetch ALL applications (no filters to get all data)
    const applications = await db.getApplications()
    
    console.log(`Total applications in DB: ${applications.length}`)
    console.log('Sample application:', applications[0])
    
    // Filter by client email and date range
    const filteredApplications = applications.filter(app => {
      const appDate = new Date(app.created_at)
      const start = new Date(startDate as string)
      const end = new Date(endDate as string)
      
      // Correct field is customer_email, not email
      const emailMatch = app.customer_email?.toLowerCase() === (clientEmail as string).toLowerCase()
      const dateMatch = appDate >= start && appDate <= end
      
      return emailMatch && dateMatch
    })

    console.log(`Filtered applications: ${filteredApplications.length}`)
    
    if (filteredApplications.length > 0) {
      console.log('First filtered app:', {
        email: filteredApplications[0].customer_email,
        status: filteredApplications[0].status,
        cost: filteredApplications[0].cost,
        created_at: filteredApplications[0].created_at
      })
    }

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
    }

    // Generate simple HTML that browser can print as PDF
    const htmlContent = generateHTMLReport(stats, filteredApplications, clientEmail as string, startDate as string, endDate as string)
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(200).send(htmlContent)

  } catch (error) {
    console.error('Error downloading report:', error)
    return res.status(500).json({ error: 'Failed to download report' })
  }
}

function generateHTMLReport(stats: any, applications: any[], clientEmail: string, startDate: string, endDate: string): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Отчет по заявкам</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 {
      color: #2563eb;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
    }
    .info {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 5px;
      padding: 15px;
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .stat-label {
      color: #6b7280;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background: #2563eb;
      color: white;
      padding: 12px;
      text-align: left;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background: #f9fafb;
    }
    .status {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    .status-approved { background: #d1fae5; color: #065f46; }
    .status-rejected { background: #fee2e2; color: #991b1b; }
    .status-pending { background: #fef3c7; color: #92400e; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>📊 Отчет по заявкам</h1>
  
  <div class="info">
    <p><strong>Клиент:</strong> ${clientEmail}</p>
    <p><strong>Период:</strong> ${new Date(startDate).toLocaleDateString('ru-RU')} - ${new Date(endDate).toLocaleDateString('ru-RU')}</p>
    <p><strong>Дата формирования:</strong> ${new Date().toLocaleString('ru-RU')}</p>
  </div>

  <h2>Статистика</h2>
  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${stats.totalApplications}</div>
      <div class="stat-label">Всего заявок</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.approvedApplications}</div>
      <div class="stat-label">Одобрено</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.rejectedApplications}</div>
      <div class="stat-label">Отклонено</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.pendingApplications}</div>
      <div class="stat-label">В обработке</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.totalRevenue.toLocaleString('ru-RU')} ₽</div>
      <div class="stat-label">Общая выручка</div>
    </div>
  </div>

  <h2>Список заявок</h2>
  <table>
    <thead>
      <tr>
        <th>№</th>
        <th>Передача</th>
        <th>Статус</th>
        <th>Стоимость</th>
        <th>Дата создания</th>
        <th>Дата размещения</th>
        <th>Время</th>
      </tr>
    </thead>
    <tbody>
      ${applications.map((app, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${app.show_name || 'Без названия'}</td>
          <td><span class="status status-${app.status === 'approved' ? 'approved' : app.status === 'rejected' ? 'rejected' : 'pending'}">${getStatusText(app.status)}</span></td>
          <td>${(parseFloat(app.cost) || 0).toLocaleString('ru-RU')} ₽</td>
          <td>${new Date(app.created_at).toLocaleDateString('ru-RU')}</td>
          <td>${app.scheduled_at ? new Date(app.scheduled_at).toLocaleDateString('ru-RU') : '—'}</td>
          <td>${app.time_slot || '—'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="no-print" style="margin-top: 20px;">
    <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer;">
      🖨️ Печать / Сохранить как PDF
    </button>
  </div>
</body>
</html>
  `
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Ожидает агента',
    'in_progress': 'В работе',
    'sent_to_commercial': 'В ком. отделе',
    'approved': 'Одобрена',
    'rejected': 'Отклонена'
  }
  return statusMap[status] || status
}
