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

  useEffect(() => {
    loadCommissionData()
  }, [selectedPeriod])

  const loadCommissionData = async () => {
    setLoading(true)
    try {
      // Mock data - replace with actual API call
      const mockData: CommissionData[] = [
        { month: 'Январь', amount: 15000, applications: 5, percentage: 5 },
        { month: 'Февраль', amount: 22000, applications: 8, percentage: 5 },
        { month: 'Март', amount: 18000, applications: 6, percentage: 5 },
        { month: 'Апрель', amount: 25000, applications: 10, percentage: 5 },
        { month: 'Май', amount: 30000, applications: 12, percentage: 5 },
        { month: 'Июнь', amount: 28000, applications: 11, percentage: 5 },
      ]
      setCommissionData(mockData)
    } catch (error) {
      console.error('Error loading commission data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalCommission = commissionData.reduce((sum, item) => sum + item.amount, 0)
  const totalApplications = commissionData.reduce((sum, item) => sum + item.applications, 0)
  const averageCommission = totalApplications > 0 ? totalCommission / totalApplications : 0

  const stats = [
    {
      label: 'Общая комиссия',
      value: `${totalCommission.toLocaleString('ru-RU')} ₽`,
      change: 12,
      changeType: 'increase' as const,
    },
    {
      label: 'Количество заявок',
      value: totalApplications,
      change: 8,
      changeType: 'increase' as const,
    },
    {
      label: 'Средняя комиссия',
      value: `${averageCommission.toLocaleString('ru-RU')} ₽`,
      change: 5,
      changeType: 'increase' as const,
    },
    {
      label: 'Процент комиссии',
      value: '5%',
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
            <p>• Комиссия составляет 5% от стоимости одобренных заявок</p>
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
