import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import { fetchDashboardData } from '../../redux/slices/dashboardSlice'
import { adAPI } from '../../utils/api'
import Layout from '../../components/layout/Layout'
import Dashboard from '../../components/dashboard/Dashboard'
import toast from 'react-hot-toast'
import { 
  ClipboardDocumentListIcon, 
  ChartBarIcon, 
  DocumentArrowDownIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface Application {
  id: string
  clientName: string
  clientEmail: string
  show: string
  date: string
  duration: number
  status: 'pending' | 'in_progress' | 'sent_to_commercial' | 'approved' | 'rejected'
  cost: number
  createdAt: string
}

const AgentDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { data, loading } = useSelector((state: RootState) => state.dashboard)
  const [applications, setApplications] = useState<Application[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState('')
  const itemsPerPage = 5

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboardData('agent'))
      loadApplications()
    }
  }, [dispatch, user])

  // Filter applications by status
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredApplications(applications)
    } else {
      setFilteredApplications(applications.filter(a => a.status === statusFilter))
    }
    setCurrentPage(1)
  }, [applications, statusFilter])

  const loadApplications = async () => {
    setApplicationsLoading(true)
    try {
      const response = await adAPI.getApplications({ agentId: user?.id })
      setApplications(response.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка загрузки заявок')
    } finally {
      setApplicationsLoading(false)
    }
  }

  const handleSendToCommercial = async (applicationId: string) => {
    try {
      await adAPI.updateApplication(applicationId, { status: 'sent_to_commercial' })
      toast.success('Заявка отправлена в коммерческий отдел')
      loadApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка отправки заявки')
    }
  }

  const handleDeleteApplication = async (applicationId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту заявку?')) return

    try {
      await adAPI.deleteApplication(applicationId)
      toast.success('Заявка удалена')
      loadApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка удаления заявки')
    }
  }

  // Pagination helpers
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentApplications = filteredApplications.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleQuickJump = (e: React.FormEvent) => {
    e.preventDefault()
    const page = parseInt(pageInput)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      setPageInput('')
    }
  }

  // Get status counts for filter badges
  const getStatusCount = (status: string) => {
    if (status === 'all') return applications.length
    return applications.filter(a => a.status === status).length
  }

  // Generate month labels (last 6 months from current month)
  const getMonthLabels = () => {
    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('ru-RU', { month: 'short' })
      months.push(monthName.charAt(0).toUpperCase() + monthName.slice(1))
    }
    return months
  }

  const stats = [
    {
      label: 'Всего заявок',
      value: data.totalApplications || 0,
      change: 8,
      changeType: 'increase' as const,
    },
    {
      label: 'Отправлено в коммерческий отдел',
      value: data.sentToCommercial || 0,
      change: 5,
      changeType: 'increase' as const,
    },
    {
      label: 'Одобренных заявок',
      value: data.approvedApplications || 0,
      change: 12,
      changeType: 'increase' as const,
    },
    {
      label: 'Общая комиссия',
      value: `${data.totalCommission || 0} ₽`,
      change: 15,
      changeType: 'increase' as const,
    },
  ]

  const charts = [
    {
      type: 'line' as const,
      title: 'Комиссии по месяцам',
      data: {
        labels: getMonthLabels(),
        datasets: [
          {
            label: 'Комиссия (₽)',
            data: data.monthlyCommissions || [0, 0, 0, 0, 0, 0],
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
          },
        ],
      },
    },
    {
      type: 'bar' as const,
      title: 'Заявки по статусам',
      data: {
        labels: ['На рассмотрении', 'Отправлено', 'Одобрено', 'Отклонено'],
            datasets: [
          {
            label: 'Количество',
            data: [
              getStatusCount('pending'),
              getStatusCount('sent_to_commercial'),
              getStatusCount('approved'),
              getStatusCount('rejected'),
            ],
            backgroundColor: 'rgba(251, 191, 36, 0.8)',
          },
        ],
      },
    },
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'На рассмотрении' },
      in_progress: { color: 'bg-blue-100 text-blue-800', text: 'В работе' },
      sent_to_commercial: { color: 'bg-purple-100 text-purple-800', text: 'В ком. отделе' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Одобрено' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Отклонено' },
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    )
  }

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
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Добро пожаловать, {user?.name}!
            </h1>
            <p className="text-secondary-600">
              Панель управления рекламного агента
            </p>
          </div>
        </div>

        {/* Dashboard */}
        <Dashboard title="Статистика" charts={charts} stats={stats} />

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="p-6 border-b border-secondary-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary-900">
                Заявки клиентов
              </h3>
              <button
                onClick={loadApplications}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Обновить
              </button>
            </div>
            
            {/* Status Filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                }`}
              >
                Все заявки ({getStatusCount('all')})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
              >
                На рассмотрении ({getStatusCount('pending')})
              </button>
              <button
                onClick={() => setStatusFilter('in_progress')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'in_progress'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                В работе ({getStatusCount('in_progress')})
              </button>
              <button
                onClick={() => setStatusFilter('sent_to_commercial')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'sent_to_commercial'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                В ком. отделе ({getStatusCount('sent_to_commercial')})
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'approved'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                Одобрено ({getStatusCount('approved')})
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                Отклонено ({getStatusCount('rejected')})
              </button>
            </div>
          </div>

          <div className="p-6">
            {applicationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardDocumentListIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  {statusFilter === 'all' ? 'Заявки не найдены' : 'Заявки с этим статусом не найдены'}
                </h3>
                <p className="text-secondary-600">
                  {statusFilter === 'all' 
                    ? 'У вас пока нет заявок от клиентов'
                    : 'Попробуйте выбрать другой фильтр'
                  }
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-secondary-200">
                    <thead className="bg-secondary-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          ID
                        </th>
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
                          Статус
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
                      {currentApplications.map((application) => (
                        <tr key={application.id} className="hover:bg-secondary-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                            #{application.id.slice(-8)}
                          </td>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                            {application.cost.toLocaleString('ru-RU')} ₽
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {application.status === 'pending' && (
                              <button
                                onClick={() => handleSendToCommercial(application.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Отправить в коммерческий отдел"
                              >
                                <CheckIcon className="h-5 w-5" />
                              </button>
                            )}
                            {application.status === 'sent_to_commercial' && (
                              <span className="text-blue-600 text-xs">Отправлено</span>
                            )}
                            <button
                              onClick={() => handleDeleteApplication(application.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Удалить заявку"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-secondary-600">
                      Показано {startIndex + 1}-{Math.min(endIndex, filteredApplications.length)} из {filteredApplications.length} заявок
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded-md bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ←
                      </button>
                      
                      {totalPages <= 5 ? (
                        Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 rounded-md ${
                              currentPage === page
                                ? 'bg-primary-600 text-white'
                                : 'bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))
                      ) : (
                        <form onSubmit={handleQuickJump} className="flex items-center gap-2">
                          <span className="text-sm text-secondary-600">Страница</span>
                          <input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            placeholder={currentPage.toString()}
                            className="w-16 px-2 py-1 border border-secondary-300 rounded-md text-center text-sm"
                          />
                          <span className="text-sm text-secondary-600">из {totalPages}</span>
                          <button
                            type="submit"
                            className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                          >
                            →
                          </button>
                        </form>
                      )}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded-md bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/agent/commissions"
            className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-green-500">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  Комиссии
                </h3>
                <p className="text-sm text-secondary-600">
                  Просмотр комиссий и статистики
                </p>
              </div>
            </div>
          </a>

          <a
            href="/agent/reports"
            className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-blue-500">
                <DocumentArrowDownIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  Отчеты
                </h3>
                <p className="text-sm text-secondary-600">
                  Генерация отчетов для клиентов
                </p>
              </div>
            </div>
          </a>

          <a
            href="/agent/chat"
            className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-purple-500">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  Чат
                </h3>
                <p className="text-sm text-secondary-600">
                  Общение с клиентами и отделом
                </p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </Layout>
  )
}

export default AgentDashboard
