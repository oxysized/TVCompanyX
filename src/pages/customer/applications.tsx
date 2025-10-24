import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'
import Layout from '../../components/layout/Layout'
import EditApplicationModal from '../../components/applications/EditApplicationModal'
import { DocumentTextIcon, EyeIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { useRouter } from 'next/router'

interface Application {
  id: string
  show_name: string
  time_slot: string
  scheduled_at: string
  duration_seconds: number
  cost: number
  status: string
  description: string
  contact_phone: string
  created_at: string
  updated_at: string
  agent_id?: string
  agent_name?: string
}

const ApplicationsPage: React.FC = () => {
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: ''
  })

  const { initialized, user } = useSelector((state: RootState) => state.auth)

  // Wait until auth has been initialized (store sets initialized after loadUser)
  useEffect(() => {
    if (!initialized) return
    loadApplications()
    // reload when user changes or filters change
  }, [filters, initialized, user?.id])

  // Socket listener for application updates
  useEffect(() => {
    if (!user?.id) return

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000')
    
    socket.on('connect', () => {
      console.log('[Customer] Socket connected, user ID:', user.id)
      // Join user-specific room for notifications
      socket.emit('joinNotifications', user.id)
      console.log('[Customer] Sent joinNotifications event for user:', user.id)
    })

    socket.on('notification', (notification: any) => {
      console.log('[Customer] Received notification:', notification)
      
      if (notification.type === 'application:updated') {
        console.log('[Customer] Application updated. Status:', notification.status)
        
        // Show toast notification
        toast.success(notification.message || 'Заявка обновлена')
        
        // If status changed to 'in_progress', reload the page so chat becomes available
        if (notification.status === 'in_progress') {
          console.log('[Customer] Status is in_progress, reloading page...')
          toast.success('Агент взял вашу заявку! Обновляю страницу...', { duration: 2000 })
          
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        } else {
          // For other status changes, just reload applications list
          loadApplications()
        }
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [user?.id])


  const loadApplications = async () => {
    try {
  const params = new URLSearchParams()
  // Do not hardcode customer id here. Server will infer customerId from session cookie
  // If you want to explicitly request another customer's applications (admin), attach customerId.
  // Example: if (user?.role !== 'customer' && someCustomerId) params.append('customerId', someCustomerId)
      
      if (filters.status) params.append('status', filters.status)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)

  const url = params.toString() ? `/api/applications?${params}` : '/api/applications'
  const response = await fetch(url, { credentials: 'same-origin' })
      if (response.ok) {
        const data = await response.json()
        setApplications(data)
      } else {
        throw new Error('Failed to load applications')
      }
    } catch (error) {
      toast.error('Ошибка загрузки заявок')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelApplication = async (applicationId: string) => {
    if (!confirm('Вы уверены, что хотите отменить эту заявку?')) {
      return
    }

    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      })

      if (response.ok) {
        toast.success('Заявка успешно отменена')
        loadApplications() // Reload applications list
      } else {
        const error = await response.json()
        toast.error(error.message || 'Ошибка при отмене заявки')
      }
    } catch (error) {
      toast.error('Ошибка при отмене заявки')
    }
  }

  const canCancelApplication = (status: string) => {
    // Можно отменить только заявки в статусе pending, in_progress или sent_to_commercial
    return status === 'pending' || status === 'in_progress' || status === 'sent_to_commercial'
  }

  const handleViewDetails = (application: Application) => {
    setSelectedApplication(application)
    setShowDetailsModal(true)
  }

  const closeDetailsModal = () => {
    setShowDetailsModal(false)
    setSelectedApplication(null)
  }

  const handleEdit = (application: Application) => {
    setSelectedApplication(application)
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setSelectedApplication(null)
  }

  const handleUpdateSuccess = () => {
    loadApplications() // Reload applications after edit
  }

  const canEdit = (status: string) => {
    // Можно редактировать только заявки в статусе pending, in_progress
    return status === 'pending' || status === 'in_progress'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'sent_to_commercial':
        return <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'paid':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'overdue':
        return <XCircleIcon className="h-5 w-5 text-red-600" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Ожидает агента'
      case 'in_progress':
        return 'В работе' // Для клиента - просто "В работе"
      case 'sent_to_commercial':
        return 'В работе' // Объединяем для клиента
      case 'approved':
        return 'Одобрено'
      case 'rejected':
        return 'Отклонено'
      case 'paid':
        return 'Оплачено'
      case 'overdue':
        return 'Просрочено'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'sent_to_commercial':
        return 'bg-blue-100 text-blue-800' // Тот же цвет для клиента
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredApplications = applications.filter(app => {
    if (filters.status && app.status !== filters.status) return false
    if (filters.dateFrom && new Date(app.created_at) < new Date(filters.dateFrom)) return false
    if (filters.dateTo && new Date(app.created_at) > new Date(filters.dateTo)) return false
    return true
  })

  // Pagination
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedApplications = filteredApplications.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters.status, filters.dateFrom, filters.dateTo])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Layout role="customer">
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <DocumentTextIcon className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Мои заявки
            </h1>
            <p className="text-secondary-600">
              История всех ваших заявок на размещение рекламы
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Всего заявок</p>
                <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Одобрено</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(app => app.status === 'approved' || app.status === 'paid').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">В обработке</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(app => app.status === 'pending' || app.status === 'in_progress' || app.status === 'sent_to_commercial').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">₽</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Одобрено на сумму</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications
                    .filter(app => app.status === 'approved' || app.status === 'paid')
                    .reduce((sum, app) => sum + app.cost, 0)
                    .toLocaleString('ru-RU')} ₽
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Фильтры</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Все статусы</option>
                <option value="pending">Ожидает агента</option>
                <option value="in_progress">В работе</option>
                <option value="approved">Одобрено</option>
                <option value="rejected">Отклонено</option>
                <option value="paid">Оплачено</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата от</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата до</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', dateFrom: '', dateTo: '' })}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Заявки</h3>
            <p className="text-sm text-gray-600">
              Показано {startIndex + 1}-{Math.min(endIndex, filteredApplications.length)} из {filteredApplications.length}
            </p>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка заявок...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-8 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Заявки не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Шоу
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата показа
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Длительность
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Стоимость
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата подачи
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{application.show_name}</div>
                          <div className="text-sm text-gray-500">{application.time_slot}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {application.scheduled_at ? (
                          <>
                            {new Date(application.scheduled_at).toLocaleDateString('ru-RU')}
                            <br />
                            <span className="text-gray-500">
                              {new Date(application.scheduled_at).toLocaleTimeString('ru-RU', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {application.duration_seconds || 0} сек
                        <br />
                        <span className="text-gray-500">
                          {((application.duration_seconds || 0) / 60).toFixed(2)} мин
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(application.cost || 0).toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(application.status)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                            {getStatusText(application.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {application.created_at ? new Date(application.created_at).toLocaleDateString('ru-RU') : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(application)}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition-colors" 
                            title="Посмотреть полностью"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            <span className="text-xs font-medium">Посмотреть</span>
                          </button>
                          {canEdit(application.status) && (
                            <button
                              onClick={() => handleEdit(application)}
                              className="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md transition-colors"
                              title="Редактировать заявку"
                            >
                              <PencilIcon className="h-4 w-4 mr-1" />
                              <span className="text-xs font-medium">Редактировать</span>
                            </button>
                          )}
                          {canCancelApplication(application.status) && (
                            <button
                              onClick={() => handleCancelApplication(application.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md transition-colors"
                              title="Отменить заявку"
                            >
                              <TrashIcon className="h-4 w-4 mr-1" />
                              <span className="text-xs font-medium">Отменить</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredApplications.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Назад
                </button>
                
                <div className="flex items-center gap-1">
                  {totalPages <= 7 ? (
                    // Show all pages if 7 or fewer
                    Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === page
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))
                  ) : (
                    // Show first, last, and pages around current
                    <>
                      <button
                        onClick={() => handlePageChange(1)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === 1
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        1
                      </button>
                      
                      {currentPage > 3 && <span className="px-2 text-gray-500">...</span>}
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page > 1 && page < totalPages && Math.abs(page - currentPage) <= 1)
                        .map(page => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                              currentPage === page
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      
                      {currentPage < totalPages - 2 && <span className="px-2 text-gray-500">...</span>}
                      
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === totalPages
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Вперед →
                </button>
              </div>

              <div className="text-sm text-gray-600">
                Страница {currentPage} из {totalPages}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Полная информация о заявке</h3>
              <button
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Статус заявки</p>
                    <div className="flex items-center">
                      {getStatusIcon(selectedApplication.status)}
                      <span className={`ml-2 inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedApplication.status)}`}>
                        {getStatusText(selectedApplication.status)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500 mb-1">ID заявки</p>
                    <p className="text-sm font-mono text-gray-900">#{selectedApplication.id.slice(-8)}</p>
                  </div>
                </div>
              </div>

              {/* Show Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">📺 Программа</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedApplication.show_name}</p>
                  <p className="text-sm text-gray-600 mt-1">{selectedApplication.time_slot}</p>
                </div>

                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">📅 Дата и время показа</p>
                  {selectedApplication.scheduled_at ? (
                    <>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(selectedApplication.scheduled_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(selectedApplication.scheduled_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500">Не указано</p>
                  )}
                </div>

                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">⏱️ Длительность</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedApplication.duration_seconds || 0} сек</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {((selectedApplication.duration_seconds || 0) / 60).toFixed(2)} мин
                  </p>
                </div>

                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">💰 Стоимость</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(selectedApplication.cost || 0).toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedApplication.description && (
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">📝 Описание</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedApplication.description}</p>
                </div>
              )}

              {/* Contact */}
              {selectedApplication.contact_phone && (
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">📞 Контактный телефон</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedApplication.contact_phone}</p>
                </div>
              )}

              {/* Agent */}
              {selectedApplication.agent_name && (
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">👤 Агент</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedApplication.agent_name}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">📅 Дата подачи</p>
                  <p className="text-gray-900">
                    {selectedApplication.created_at 
                      ? new Date(selectedApplication.created_at).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '—'}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">🔄 Последнее обновление</p>
                  <p className="text-gray-900">
                    {selectedApplication.updated_at 
                      ? new Date(selectedApplication.updated_at).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={closeDetailsModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Закрыть
                </button>
                {canEdit(selectedApplication.status) && (
                  <button
                    onClick={() => {
                      closeDetailsModal()
                      handleEdit(selectedApplication)
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Редактировать
                  </button>
                )}
                <a
                  href={`/customer/chat?room=${encodeURIComponent(`application-${selectedApplication.id}`)}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Открыть чат
                </a>
                {canCancelApplication(selectedApplication.status) && (
                  <button
                    onClick={() => {
                      closeDetailsModal()
                      handleCancelApplication(selectedApplication.id)
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Отменить заявку
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedApplication && (
        <EditApplicationModal
          application={selectedApplication}
          onClose={closeEditModal}
          onUpdate={handleUpdateSuccess}
        />
      )}
    </Layout>
  )
}

export default ApplicationsPage
