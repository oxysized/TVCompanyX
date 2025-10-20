import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import { fetchDashboardData } from '../../redux/slices/dashboardSlice'
import { showAPI, adAPI } from '../../utils/api'
import Layout from '../../components/layout/Layout'
import Dashboard from '../../components/dashboard/Dashboard'
import toast from 'react-hot-toast'
import { 
  CalendarIcon, 
  ClipboardDocumentListIcon, 
  ChatBubbleLeftRightIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

interface ShowSchedule {
  id: string
  showName: string
  date: string
  duration: number
  adMinutes: number
  availableSlots: number
}

interface Application {
  id: string
  clientName: string
  show: string
  date: string
  duration: number
  status: 'sent_to_commercial' | 'approved' | 'rejected'
  cost: number
  agentId: string
}

const CommercialDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { data, loading } = useSelector((state: RootState) => state.dashboard)
  const [schedule, setSchedule] = useState<ShowSchedule[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [applicationsLoading, setApplicationsLoading] = useState(true)
  const [showScheduleForm, setShowScheduleForm] = useState(false)

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboardData('commercial'))
      loadSchedule()
      loadApplications()
    }
  }, [dispatch, user])

  const loadSchedule = async () => {
    setScheduleLoading(true)
    try {
      const response = await showAPI.getSchedule()
      setSchedule(response.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка загрузки расписания')
    } finally {
      setScheduleLoading(false)
    }
  }

  const loadApplications = async () => {
    setApplicationsLoading(true)
    try {
      const response = await adAPI.getApplications({ status: 'sent_to_commercial' })
      setApplications(response.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка загрузки заявок')
    } finally {
      setApplicationsLoading(false)
    }
  }

  const handleApproveApplication = async (applicationId: string) => {
    try {
      await adAPI.updateApplication(applicationId, { status: 'approved' })
      toast.success('Заявка одобрена')
      loadApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка одобрения заявки')
    }
  }

  const handleRejectApplication = async (applicationId: string) => {
    try {
      await adAPI.updateApplication(applicationId, { status: 'rejected' })
      toast.success('Заявка отклонена')
      loadApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка отклонения заявки')
    }
  }

  const stats = [
    {
      label: 'Заявок на рассмотрении',
      value: data.pendingApplications || 0,
      change: 3,
      changeType: 'increase' as const,
    },
    {
      label: 'Одобренных заявок',
      value: data.approvedApplications || 0,
      change: 8,
      changeType: 'increase' as const,
    },
    {
      label: 'Запланированных шоу',
      value: data.scheduledShows || 0,
      change: 2,
      changeType: 'increase' as const,
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
      title: 'Заявки по дням',
      data: {
        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        datasets: [
          {
            label: 'Заявки',
            data: data.dailyApplications || [5, 8, 12, 6, 9, 3, 2],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
          },
        ],
      },
    },
    {
      type: 'bar' as const,
      title: 'Статусы заявок',
      data: {
        labels: ['На рассмотрении', 'Одобрено', 'Отклонено'],
        datasets: [
          {
            label: 'Количество',
            data: [
              applications.filter(a => a.status === 'sent_to_commercial').length,
              applications.filter(a => a.status === 'approved').length,
              applications.filter(a => a.status === 'rejected').length,
            ],
            backgroundColor: [
              'rgba(251, 191, 36, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(239, 68, 68, 0.8)',
            ],
          },
        ],
      },
    },
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      sent_to_commercial: { color: 'bg-yellow-100 text-yellow-800', text: 'На рассмотрении' },
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Добро пожаловать, {user?.name}!
            </h1>
            <p className="text-secondary-600">
              Панель управления коммерческого отдела
            </p>
          </div>
        </div>

        {/* Dashboard */}
        <Dashboard title="Статистика" charts={charts} stats={stats} />

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="p-6 border-b border-secondary-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-secondary-900">
                Заявки от агентов
              </h3>
              <button
                onClick={loadApplications}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Обновить
              </button>
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
                        Дата
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Длительность
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
                    {applications.map((application) => (
                      <tr key={application.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                          {application.clientName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {application.show}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {new Date(application.date).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {application.duration} сек
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(application.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {application.cost.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {application.status === 'sent_to_commercial' && (
                            <>
                              <button
                                onClick={() => handleApproveApplication(application.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Одобрить"
                              >
                                <CheckIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleRejectApplication(application.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Отклонить"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </>
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

        {/* Schedule Table */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="p-6 border-b border-secondary-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-secondary-900">
                Расписание шоу
              </h3>
              <button
                onClick={() => setShowScheduleForm(!showScheduleForm)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Добавить шоу</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {scheduleLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : schedule.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  Расписание пусто
                </h3>
                <p className="text-secondary-600">
                  Добавьте первое шоу в расписание
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Шоу
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Дата
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Длительность
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Минуты рекламы
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Доступные слоты
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {schedule.map((show) => (
                      <tr key={show.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                          {show.showName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {new Date(show.date).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {show.duration} мин
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {show.adMinutes} мин
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {show.availableSlots}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            href="/commercial/schedule"
            className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-blue-500">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  Управление расписанием
                </h3>
                <p className="text-sm text-secondary-600">
                  Создание и редактирование расписания шоу
                </p>
              </div>
            </div>
          </a>

          <a
            href="/commercial/chat"
            className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-green-500">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  Чат с агентами
                </h3>
                <p className="text-sm text-secondary-600">
                  Общение с рекламными агентами
                </p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </Layout>
  )
}

export default CommercialDashboard
