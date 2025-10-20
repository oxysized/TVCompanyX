import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import { fetchDashboardData } from '../../redux/slices/dashboardSlice'
import { adAPI, reportAPI } from '../../utils/api'
import Layout from '../../components/layout/Layout'
import Dashboard from '../../components/dashboard/Dashboard'
import toast from 'react-hot-toast'
import { 
  ClipboardDocumentListIcon, 
  DocumentArrowDownIcon, 
  CurrencyDollarIcon,
  BellIcon,
  EyeIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

interface Application {
  id: string
  clientName: string
  clientEmail: string
  show: string
  date: string
  duration: number
  status: 'approved' | 'paid' | 'overdue'
  cost: number
  paymentMethod: 'card' | 'transfer' | 'cash'
  paymentDate?: string
  dueDate: string
}

const AccountantDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { data, loading } = useSelector((state: RootState) => state.dashboard)
  const [applications, setApplications] = useState<Application[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(true)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    client: '',
    amountFrom: '',
    amountTo: '',
    status: 'all',
    paymentMethod: 'all',
  })

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboardData('accountant'))
      loadApplications()
    }
  }, [dispatch, user])

  const loadApplications = async () => {
    setApplicationsLoading(true)
    try {
      const response = await adAPI.getApplications({ 
        status: 'approved',
        ...filters 
      })
      setApplications(response.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка загрузки заявок')
    } finally {
      setApplicationsLoading(false)
    }
  }

  const handleMarkAsPaid = async (applicationId: string) => {
    try {
      await adAPI.updateApplication(applicationId, { 
        status: 'paid',
        paymentDate: new Date().toISOString()
      })
      toast.success('Заявка отмечена как оплаченная')
      loadApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка обновления статуса')
    }
  }

  const handleExportReport = async (format: 'pdf' | 'csv') => {
    try {
      const reportData = {
        type: 'accounting',
        format,
        filters,
        applications: applications.map(app => app.id),
      }

      const response = await reportAPI.generateReport('accounting', reportData)
      
      // Download the report
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `accounting_report_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Отчет экспортирован')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка экспорта отчета')
    }
  }

  const stats = [
    {
      label: 'Одобренных заявок',
      value: data.approvedApplications || 0,
      change: 8,
      changeType: 'increase' as const,
    },
    {
      label: 'Оплаченных заявок',
      value: data.paidApplications || 0,
      change: 12,
      changeType: 'increase' as const,
    },
    {
      label: 'Просроченных платежей',
      value: data.overduePayments || 0,
      change: -2,
      changeType: 'decrease' as const,
    },
    {
      label: 'Общий доход',
      value: `${data.totalRevenue || 0} ₽`,
      change: 15,
      changeType: 'increase' as const,
    },
  ]

  const charts = [
    {
      type: 'line' as const,
      title: 'Доходы по месяцам',
      data: {
        labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'],
        datasets: [
          {
            label: 'Доход (₽)',
            data: data.monthlyRevenue || [120000, 150000, 180000, 200000, 220000, 250000],
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
          },
        ],
      },
    },
    {
      type: 'bar' as const,
      title: 'Способы оплаты',
      data: {
        labels: ['Карта', 'Перевод', 'Наличные'],
        datasets: [
          {
            label: 'Количество',
            data: [
              applications.filter(a => a.paymentMethod === 'card').length,
              applications.filter(a => a.paymentMethod === 'transfer').length,
              applications.filter(a => a.paymentMethod === 'cash').length,
            ],
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(251, 191, 36, 0.8)',
            ],
          },
        ],
      },
    },
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { color: 'bg-yellow-100 text-yellow-800', text: 'Ожидает оплаты' },
      paid: { color: 'bg-green-100 text-green-800', text: 'Оплачено' },
      overdue: { color: 'bg-red-100 text-red-800', text: 'Просрочено' },
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const getPaymentMethodBadge = (method: string) => {
    const methodConfig = {
      card: { color: 'bg-blue-100 text-blue-800', text: 'Карта' },
      transfer: { color: 'bg-green-100 text-green-800', text: 'Перевод' },
      cash: { color: 'bg-yellow-100 text-yellow-800', text: 'Наличные' },
    }

    const config = methodConfig[method as keyof typeof methodConfig]
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  }

  if (loading) {
    return (
      <Layout role="accountant">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout role="accountant">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Добро пожаловать, {user?.name}!
            </h1>
            <p className="text-secondary-600">
              Панель управления бухгалтера
            </p>
          </div>
        </div>

        {/* Dashboard */}
        <Dashboard title="Финансовая статистика" charts={charts} stats={stats} />

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900">
              Фильтры
            </h3>
            <button
              onClick={loadApplications}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Применить</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Дата от
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Дата до
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Клиент
              </label>
              <input
                type="text"
                value={filters.client}
                onChange={(e) => setFilters({ ...filters, client: e.target.value })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Поиск по клиенту"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Сумма от
              </label>
              <input
                type="number"
                value={filters.amountFrom}
                onChange={(e) => setFilters({ ...filters, amountFrom: e.target.value })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Сумма до
              </label>
              <input
                type="number"
                value={filters.amountTo}
                onChange={(e) => setFilters({ ...filters, amountTo: e.target.value })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="1000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Статус
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">Все</option>
                <option value="approved">Ожидает оплаты</option>
                <option value="paid">Оплачено</option>
                <option value="overdue">Просрочено</option>
              </select>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="p-6 border-b border-secondary-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-secondary-900">
                Одобренные заявки
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleExportReport('pdf')}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => handleExportReport('csv')}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {applicationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardDocumentListIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  Заявки не найдены
                </h3>
                <p className="text-secondary-600">
                  Нет заявок, соответствующих фильтрам
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
                        Дата
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Статус оплаты
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Способ оплаты
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Стоимость
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Срок оплаты
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {applications.map((application) => (
                      <tr key={application.id} className={`hover:bg-secondary-50 ${isOverdue(application.dueDate) ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-secondary-900">
                            {application.clientName}
                          </div>
                          <div className="text-sm text-secondary-500">
                            {application.clientEmail}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {application.show}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {new Date(application.date).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(application.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPaymentMethodBadge(application.paymentMethod)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                          {application.cost.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          <span className={isOverdue(application.dueDate) ? 'text-red-600 font-medium' : ''}>
                            {new Date(application.dueDate).toLocaleDateString('ru-RU')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {application.status === 'approved' && (
                            <button
                              onClick={() => handleMarkAsPaid(application.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Отметить как оплаченную"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                          )}
                          {application.status === 'paid' && (
                            <span className="text-green-600 text-xs">Оплачено</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Overdue Notifications */}
        {applications.filter(app => isOverdue(app.dueDate)).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <BellIcon className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">
                  Просроченные платежи
                </h3>
                <p className="text-red-800">
                  У вас есть {applications.filter(app => isOverdue(app.dueDate)).length} просроченных платежей
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default AccountantDashboard
