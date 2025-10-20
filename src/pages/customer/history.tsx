import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import { adAPI } from '../../utils/api'
import Layout from '../../components/layout/Layout'
import toast from 'react-hot-toast'
import { ClockIcon, EyeIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

interface Application {
  id: string
  show: string
  date: string
  duration: number
  status: 'pending' | 'approved' | 'rejected'
  cost: number
  createdAt: string
  description?: string
  contactPhone?: string
}

const ApplicationHistory: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)

  useEffect(() => {
    loadApplications()
  }, [])

  const loadApplications = async () => {
    setLoading(true)
    try {
      const response = await adAPI.getApplications()
      setApplications(response.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка загрузки заявок')
    } finally {
      setLoading(false)
    }
  }

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true
    return app.status === filter
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'На рассмотрении' },
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <Layout role="customer">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout role="customer">
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <ClockIcon className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              История заявок
            </h1>
            <p className="text-secondary-600">
              Все ваши заявки на размещение рекламы
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="border-b border-secondary-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'all', label: 'Все заявки', count: applications.length },
                { key: 'pending', label: 'На рассмотрении', count: applications.filter(a => a.status === 'pending').length },
                { key: 'approved', label: 'Одобренные', count: applications.filter(a => a.status === 'approved').length },
                { key: 'rejected', label: 'Отклоненные', count: applications.filter(a => a.status === 'rejected').length },
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
            {filteredApplications.length === 0 ? (
              <div className="text-center py-8">
                <DocumentTextIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  Заявки не найдены
                </h3>
                <p className="text-secondary-600">
                  {filter === 'all' 
                    ? 'У вас пока нет заявок' 
                    : `Нет заявок со статусом "${filter === 'pending' ? 'На рассмотрении' : filter === 'approved' ? 'Одобренные' : 'Отклоненные'}"`
                  }
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
                        Дата показа
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
                        Создано
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {filteredApplications.map((application) => (
                      <tr key={application.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-secondary-900">
                            {application.show}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {formatDate(application.date)}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {formatDateTime(application.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelectedApplication(application)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <EyeIcon className="h-5 w-5" />
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

        {/* Application Details Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-secondary-900">
                    Детали заявки
                  </h3>
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="text-secondary-400 hover:text-secondary-600"
                  >
                    <span className="sr-only">Закрыть</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-secondary-600">Шоу</label>
                      <p className="text-sm text-secondary-900">{selectedApplication.show}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-secondary-600">Статус</label>
                      <div className="mt-1">{getStatusBadge(selectedApplication.status)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-secondary-600">Дата показа</label>
                      <p className="text-sm text-secondary-900">{formatDate(selectedApplication.date)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-secondary-600">Длительность</label>
                      <p className="text-sm text-secondary-900">{selectedApplication.duration} секунд</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-secondary-600">Стоимость</label>
                      <p className="text-sm text-secondary-900">{selectedApplication.cost.toLocaleString('ru-RU')} ₽</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-secondary-600">Создано</label>
                      <p className="text-sm text-secondary-900">{formatDateTime(selectedApplication.createdAt)}</p>
                    </div>
                  </div>

                  {selectedApplication.contactPhone && (
                    <div>
                      <label className="text-sm font-medium text-secondary-600">Контактный телефон</label>
                      <p className="text-sm text-secondary-900">{selectedApplication.contactPhone}</p>
                    </div>
                  )}

                  {selectedApplication.description && (
                    <div>
                      <label className="text-sm font-medium text-secondary-600">Описание</label>
                      <p className="text-sm text-secondary-900 mt-1">{selectedApplication.description}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ApplicationHistory
