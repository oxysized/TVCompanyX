import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'
import Layout from '../../components/layout/Layout'
import Dashboard from '../../components/dashboard/Dashboard'
import { ChartBarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

interface CommissionData {
  month: string
  amount: number
  applications: number
  percentage: number
}

const CommissionsPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [commissionData, setCommissionData] = useState<CommissionData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month')
  const [totalCommission, setTotalCommission] = useState(0)
  const [totalApplications, setTotalApplications] = useState(0)
  const [approvedApplications, setApprovedApplications] = useState(0)

  useEffect(() => {
    loadCommissionData()
  }, [selectedPeriod])

  const loadCommissionData = async () => {
    setLoading(true)
    try {
      // Fetch dashboard data for agent - includes commission calculations
      const dashboardResp = await fetch('/api/dashboard/agent', { credentials: 'same-origin' })
      if (!dashboardResp.ok) throw new Error('Failed to load dashboard data')
      const dashboardData = await dashboardResp.json()
      
      // Set totals from dashboard
      setTotalCommission(dashboardData.totalCommission || 0)
      setTotalApplications(dashboardData.totalApplications || 0)
      setApprovedApplications(dashboardData.approvedApplications || 0)
      
      // Build commission data from monthly commissions
      const monthlyCommissions = dashboardData.monthlyCommissions || []
      
      // Generate actual month names (last 6 months)
      const months = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthName = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
        months.push(monthName)
      }
      
      const percentDefault = 10 // 10% commission rate
      
      const data: CommissionData[] = months.map((month, index) => ({
        month,
        amount: monthlyCommissions[index] || 0,
        applications: 0, // We'll calculate from approved applications
        percentage: percentDefault,
      }))
      
      setCommissionData(data)
    } catch (error) {
      console.error('Error loading commission data:', error)
    } finally {
      setLoading(false)
    }
  }

  const averageCommission = approvedApplications > 0 ? totalCommission / approvedApplications : 0

  const stats = [
    {
      label: 'Общая комиссия',
      value: `${totalCommission.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`,
      change: 12,
      changeType: 'increase' as const,
    },
    {
      label: 'Одобренных заявок',
      value: approvedApplications,
      change: 8,
      changeType: 'increase' as const,
    },
    {
      label: 'Средняя комиссия',
      value: `${averageCommission.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`,
      change: 5,
      changeType: 'increase' as const,
    },
    {
      label: 'Процент комиссии',
      value: '10%',
      change: 0,
      changeType: 'increase' as const,
    },
  ]

  const charts = [
    {
      type: 'line' as const,
      title: 'Комиссии по месяцам',
      data: {
        labels: commissionData.map(item => item.month),
        datasets: [
          {
            label: 'Комиссия (₽)',
            data: commissionData.map(item => item.amount),
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
          },
        ],
      },
    },
    {
      type: 'bar' as const,
      title: 'Количество заявок',
      data: {
        labels: commissionData.map(item => item.month),
        datasets: [
          {
            label: 'Заявки',
            data: commissionData.map(item => item.applications),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
          },
        ],
      },
    },
  ]

  if (loading) {
    return (
      <Layout role="agent">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout role="agent">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">
                Комиссии
              </h1>
              <p className="text-secondary-600">
                Статистика ваших комиссий и доходов
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            {[
              { key: 'month', label: 'Месяц' },
              { key: 'quarter', label: 'Квартал' },
              { key: 'year', label: 'Год' },
            ].map((period) => (
              <button
                key={period.key}
                onClick={() => setSelectedPeriod(period.key as any)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  selectedPeriod === period.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard */}
        <Dashboard title="Статистика комиссий" charts={charts} stats={stats} />

        {/* Commission Details Table */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="p-6 border-b border-secondary-200">
            <h3 className="text-lg font-semibold text-secondary-900">
              Детализация комиссий
            </h3>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Период
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Количество заявок
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Процент комиссии
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Сумма комиссии
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Средняя заявка
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {commissionData.map((item, index) => (
                    <tr key={index} className="hover:bg-secondary-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                        {item.month}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        {item.applications}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        {item.percentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {item.amount.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        {item.applications > 0 
                          ? (item.amount / item.applications).toLocaleString('ru-RU') + ' ₽'
                          : '0 ₽'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Commission Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Информация о комиссиях
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• Комиссия составляет 10% от стоимости одобренных заявок</p>
            <p>• Комиссия начисляется после одобрения заявки коммерческим отделом</p>
            <p>• Выплата комиссий производится ежемесячно</p>
            <p>• Подробную информацию о выплатах можно получить у бухгалтерии</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default CommissionsPage
