import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'
import { adAPI } from '../../utils/api'
import Layout from '../../components/layout/Layout'
import toast from 'react-hot-toast'
import { 
  ClipboardDocumentListIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface Application {
  id: string
  customer_name?: string
  customer_first_name?: string
  customer_last_name?: string
  customer_email?: string
  show_name?: string
  scheduled_at?: string
  duration_seconds?: number
  status: string
  cost: string
  created_at: string
}

type PeriodType = 'day' | 'week' | 'month'

const CommercialDashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [allApplications, setAllApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodType>('day')

  useEffect(() => {
    if (user) {
      loadAllApplications()
    }
  }, [user])

  const loadAllApplications = async () => {
    setLoading(true)
    try {
      const response = await adAPI.getApplications()
      setAllApplications(response.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка загрузки заявок')
    } finally {
      setLoading(false)
    }
  }

  // Filter applications by period
  const getFilteredApplications = () => {
    const now = new Date()
    const startDate = new Date()

    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
    }

    return allApplications.filter(app => {
      const appDate = new Date(app.created_at)
      return appDate >= startDate
    })
  }

  const filteredApps = getFilteredApplications()

  // Calculate statistics
  const stats = {
    pending: filteredApps.filter(app => 
      app.status === 'sent_to_commercial' || app.status === 'in_progress'
    ).length,
    approved: filteredApps.filter(app => app.status === 'approved').length,
    rejected: filteredApps.filter(app => app.status === 'rejected').length,
    total: filteredApps.length,
    totalRevenue: filteredApps
      .filter(app => app.status === 'approved')
      .reduce((sum, app) => sum + (parseFloat(app.cost) || 0), 0),
  }

  // Applications on review (sent_to_commercial)
  const pendingApplications = allApplications.filter(app => app.status === 'sent_to_commercial')

  const handleApproveApplication = async (applicationId: string) => {
    try {
      await adAPI.updateApplication(applicationId, { status: 'approved' })
      toast.success('Заявка одобрена')
      loadAllApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка одобрения заявки')
    }
  }

  const handleRejectApplication = async (applicationId: string) => {
    try {
      await adAPI.updateApplication(applicationId, { status: 'rejected' })
      toast.success('Заявка отклонена')
      loadAllApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка отклонения заявки')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      pending: { color: 'bg-blue-100 text-blue-800', text: 'Ожидает агента' },
      in_progress: { color: 'bg-yellow-100 text-yellow-800', text: 'В работе' },
      sent_to_commercial: { color: 'bg-orange-100 text-orange-800', text: 'На рассмотрении' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Одобрено' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Отклонено' },
    }

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status }
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const getPeriodLabel = () => {
    switch (period) {
      case 'day': return 'за день'
      case 'week': return 'за неделю'
      case 'month': return 'за месяц'
    }
  }

  // Chart data for status distribution
  const chartData = {
    labels: ['На рассмотрении', 'Одобрено', 'Отклонено'],
    datasets: [
      {
        label: `Количество заявок ${getPeriodLabel()}`,
        data: [stats.pending, stats.approved, stats.rejected],
        backgroundColor: [
          'rgba(251, 191, 36, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(239, 68, 68, 0.7)',
        ],
        borderColor: [
          'rgb(251, 191, 36)',
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
        borderRadius: 6,
        barThickness: 60,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2.5,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `Статусы заявок ${getPeriodLabel()}`,
        font: {
          size: 14,
          weight: 'bold' as const,
        },
        color: '#1f2937',
        padding: {
          bottom: 20,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 12,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        ticks: {
          font: {
            size: 12,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  }

  if (loading) {
    return (
      <Layout role="commercial">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout role="commercial">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Добро пожаловать, {user?.name}!
            </h1>
            <p className="text-secondary-600">
              Панель управления коммерческого отдела
            </p>
          </div>
          <button
            onClick={loadAllApplications}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ArrowPathIcon className="h-5 w-5" />
            <span>Обновить</span>
          </button>
        </div>

        {/* Period Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-secondary-700">Период статистики:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setPeriod('day')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  period === 'day'
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                }`}
              >
                День
              </button>
              <button
                onClick={() => setPeriod('week')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  period === 'week'
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                }`}
              >
                Неделя
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  period === 'month'
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                }`}
              >
                Месяц
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">Заявок на рассмотрении</p>
                <p className="text-3xl font-bold text-secondary-900 mt-2">{stats.pending}</p>
                <p className="text-xs text-secondary-500 mt-1">{getPeriodLabel()}</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100">
                <ClipboardDocumentListIcon className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">Одобрено</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.approved}</p>
                <p className="text-xs text-secondary-500 mt-1">{getPeriodLabel()}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <CheckIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">Отклонено</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected}</p>
                <p className="text-xs text-secondary-500 mt-1">{getPeriodLabel()}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100">
                <XMarkIcon className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">Общий доход</p>
                <p className="text-2xl font-bold text-primary-600 mt-2">
                  {stats.totalRevenue.toLocaleString('ru-RU')} ₽
                </p>
                <p className="text-xs text-secondary-500 mt-1">{getPeriodLabel()}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary-100">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
          <div className="max-w-3xl mx-auto">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Pending Applications Table */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="p-6 border-b border-secondary-200">
            <h3 className="text-lg font-semibold text-secondary-900">
              Заявки на рассмотрении ({pendingApplications.length})
            </h3>
          </div>

          <div className="p-6">
            {pendingApplications.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardDocumentListIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  Заявки не найдены
                </h3>
                <p className="text-secondary-600">
                  Нет заявок на рассмотрение
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Клиент
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Шоу
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Дата размещения
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Длительность
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Стоимость
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {pendingApplications.map((application) => (
                      <tr key={application.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                          {application.customer_name || 
                           `${application.customer_first_name || ''} ${application.customer_last_name || ''}`.trim() ||
                           application.customer_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {application.show_name || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {application.scheduled_at 
                            ? new Date(application.scheduled_at).toLocaleDateString('ru-RU')
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {application.duration_seconds 
                            ? `${Math.floor(application.duration_seconds / 60)} мин ${application.duration_seconds % 60} сек`
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                          {(parseFloat(application.cost) || 0).toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleApproveApplication(application.id)}
                            className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                            title="Одобрить"
                          >
                            <CheckIcon className="h-4 w-4 mr-1" />
                            Одобрить
                          </button>
                          <button
                            onClick={() => handleRejectApplication(application.id)}
                            className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                            title="Отклонить"
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            Отклонить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default CommercialDashboard
