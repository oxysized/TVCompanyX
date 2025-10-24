import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import { adAPI } from '../../utils/api'
import Layout from '../../components/layout/Layout'
import toast from 'react-hot-toast'
import { 
  ClipboardDocumentListIcon, 
  EyeIcon,
  CurrencyDollarIcon,
  CheckCircleIcon
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
  agentName: string
}

const AccountantApplicationsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'approved' | 'paid' | 'overdue'>('approved')

  useEffect(() => {
    loadApplications()
  }, [filter])

  const loadApplications = async () => {
    setLoading(true)
    try {
      const response = await adAPI.getApplications({ 
        status: filter === 'all' ? 'approved' : filter 
      })
      setApplications(response.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка загрузки заявок')
    } finally {
      setLoading(false)
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

  return (
    <Layout role="accountant">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Одобренные заявки
            </h1>
            <p className="text-secondary-600">
              Управление оплатами и финансовым учетом
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
                { key: 'approved', label: 'Ожидают оплаты', count: applications.filter(a => a.status === 'approved').length },
                { key: 'paid', label: 'Оплаченные', count: applications.filter(a => a.status === 'paid').length },
                { key: 'overdue', label: 'Просроченные', count: applications.filter(a => a.status === 'overdue').length },
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
                        Агент
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
                          {application.agentName}
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
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                          )}
                          {application.status === 'paid' && (
                            <span className="text-green-600 text-xs">Оплачено</span>
                          )}
                          <button
                            className="text-primary-600 hover:text-primary-900 ml-2"
                            title="Просмотреть детали"
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

        {/* Overdue Notifications */}
        {applications.filter(app => isOverdue(app.dueDate)).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <CurrencyDollarIcon className="h-6 w-6 text-red-600" />
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

export default AccountantApplicationsPage
