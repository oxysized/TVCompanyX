import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import { adAPI } from '../../utils/api'
import Layout from '../../components/layout/Layout'
import toast from 'react-hot-toast'
import { useRouter } from 'next/router'
import { 
  ClipboardDocumentListIcon, 
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  HandRaisedIcon
} from '@heroicons/react/24/outline'

interface Application {
  id: string
  clientName: string
  clientEmail: string
  show: string
  date: string
  duration: number
  status: 'sent_to_commercial' | 'approved' | 'rejected'
  cost: number
  agentId: string
  agentName: string
  description?: string
}

const CommercialApplicationsPage: React.FC = () => {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'sent_to_commercial' | 'approved'>('sent_to_commercial')
  const [selectedApp, setSelectedApp] = useState<any>(null)

  useEffect(() => {
    loadApplications()
  }, [filter])

  const loadApplications = async () => {
    setLoading(true)
    try {
      const response = await adAPI.getApplications()
      // Commercial should NEVER see rejected applications
      let filtered = response.data.filter((app: any) => app.status !== 'rejected')
      
      // Apply additional filter
      if (filter === 'sent_to_commercial') {
        filtered = filtered.filter((app: any) => app.status === 'sent_to_commercial')
      } else if (filter === 'approved') {
        filtered = filtered.filter((app: any) => app.status === 'approved')
      }
      // 'all' shows everything except rejected
      
      setApplications(filtered)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка загрузки заявок')
    } finally {
      setLoading(false)
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

  const handleTakeApplication = async (applicationId: string) => {
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ takeCommercial: true })
      })
      
      if (response.ok) {
        toast.success('Заявка принята в работу')
        // Open chat with agent
        const app = applications.find(a => a.id === applicationId)
        if (app) {
          openChat(app)
        }
      } else {
        throw new Error('Failed to take application')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка принятия заявки')
    }
  }

  const openChat = (app: any) => {
    // Navigate to application-chat page with full details and chat
    router.push(`/commercial/application-chat?appId=${app.id}`)
  }

  const viewDetails = (app: any) => {
    setSelectedApp(app)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      sent_to_commercial: { color: 'bg-yellow-100 text-yellow-800', text: 'На рассмотрении' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Одобрено' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Отклонено' },
      pending: { color: 'bg-blue-100 text-blue-800', text: 'В ожидании' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-secondary-100 text-secondary-800', text: status }
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    )
  }

  return (
    <Layout role="commercial">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Заявки от агентов
            </h1>
            <p className="text-secondary-600">
              Рассмотрение и одобрение заявок на размещение рекламы
            </p>
          </div>
          <button
            onClick={loadApplications}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Обновить
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="border-b border-secondary-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'sent_to_commercial', label: 'На рассмотрении', count: applications.filter(a => a.status === 'sent_to_commercial').length },
                { key: 'approved', label: 'Одобренные', count: applications.filter(a => a.status === 'approved').length },
                { key: 'all', label: 'Все заявки', count: applications.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    filter === tab.key
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 bg-secondary-100 text-secondary-600 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
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
                  {filter === 'sent_to_commercial' 
                    ? 'Нет заявок на рассмотрение' 
                    : `Нет заявок со статусом "${filter}"`
                  }
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
                        Агент
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-secondary-900">
                            {application.clientName}
                          </div>
                          <div className="text-sm text-secondary-500">
                            {application.clientEmail}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {application.agentName}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                          {application.cost.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {application.status === 'sent_to_commercial' && (
                              <>
                                <button
                                  onClick={() => handleTakeApplication(application.id)}
                                  className="text-purple-600 hover:text-purple-900"
                                  title="Принять в работу"
                                >
                                  <HandRaisedIcon className="h-5 w-5" />
                                </button>
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
                            <button
                              onClick={() => viewDetails(application)}
                              className="text-primary-600 hover:text-primary-900"
                              title="Просмотреть детали"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => openChat(application)}
                              className="text-secondary-600 hover:text-secondary-900"
                              title="Чат с агентом"
                            >
                              <ChatBubbleLeftRightIcon className="h-5 w-5" />
                            </button>
                          </div>
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

      {/* Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full m-8">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">Детали заявки #{selectedApp.id.slice(-8)}</h3>
              <button onClick={() => setSelectedApp(null)} className="text-secondary-400 hover:text-secondary-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-secondary-600 mb-2">Информация о клиенте</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-secondary-500">Имя:</span>
                      <p className="font-medium">{selectedApp.clientName || selectedApp.customerName}</p>
                    </div>
                    <div>
                      <span className="text-xs text-secondary-500">Email:</span>
                      <p className="font-medium">{selectedApp.clientEmail || selectedApp.customerEmail}</p>
                    </div>
                    <div>
                      <span className="text-xs text-secondary-500">Телефон:</span>
                      <p className="font-medium">{selectedApp.contactPhone || selectedApp.contact_phone || 'Не указан'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-secondary-600 mb-2">Информация об агенте</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-secondary-500">Имя:</span>
                      <p className="font-medium">{selectedApp.agentName || 'Не назначен'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-secondary-500">ID агента:</span>
                      <p className="font-mono text-sm">{selectedApp.agentId?.slice(-8) || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-secondary-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-secondary-600 mb-2">Детали заявки</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-secondary-500">Шоу:</span>
                    <p className="font-medium">{selectedApp.show}</p>
                  </div>
                  <div>
                    <span className="text-xs text-secondary-500">Дата и время:</span>
                    <p className="font-medium">{new Date(selectedApp.date || selectedApp.scheduled_at).toLocaleString('ru-RU')}</p>
                  </div>
                  <div>
                    <span className="text-xs text-secondary-500">Длительность:</span>
                    <p className="font-medium">{selectedApp.duration || selectedApp.duration_seconds} секунд</p>
                  </div>
                  <div>
                    <span className="text-xs text-secondary-500">Стоимость:</span>
                    <p className="font-medium text-lg">{(selectedApp.cost || 0).toLocaleString('ru-RU')} ₽</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-secondary-500">Статус:</span>
                    <div className="mt-1">{getStatusBadge(selectedApp.status)}</div>
                  </div>
                </div>
              </div>

              {selectedApp.description && (
                <div className="bg-secondary-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-secondary-600 mb-2">Описание</h4>
                  <p className="text-sm text-secondary-700">{selectedApp.description}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => openChat(selectedApp)}
                  className="px-4 py-2 bg-secondary-600 text-white rounded-md hover:bg-secondary-700 flex items-center space-x-2"
                >
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                  <span>Открыть чат с агентом</span>
                </button>
                {selectedApp.status === 'sent_to_commercial' && (
                  <>
                    <button
                      onClick={() => {
                        handleApproveApplication(selectedApp.id)
                        setSelectedApp(null)
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Одобрить
                    </button>
                    <button
                      onClick={() => {
                        handleRejectApplication(selectedApp.id)
                        setSelectedApp(null)
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Отклонить
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default CommercialApplicationsPage
