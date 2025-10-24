import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import { fetchDashboardData } from '../../redux/slices/dashboardSlice'
import Layout from '../../components/layout/Layout'
import Dashboard from '../../components/dashboard/Dashboard'
import { CalculatorIcon, DocumentTextIcon, ClockIcon } from '@heroicons/react/24/outline'

const CustomerDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { data, loading } = useSelector((state: RootState) => state.dashboard)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboardData('customer'))
    }
  }, [dispatch, user])

  const stats = [
    { label: 'Всего заявок', value: data.totalApplications || 0 },
    { label: 'Одобренных заявок', value: data.approvedApplications || 0 },
    { label: 'Одобрено на сумму', value: `${data.totalCost || 0} ₽` },
    { label: 'Активных заявок', value: data.activeApplications || 0 },
  ]

  const charts = [
    {
      type: 'line' as const,
      title: 'Заявки по месяцам',
      data: {
        labels: (() => {
          const count = (data.monthlyApplications && data.monthlyApplications.length) || 6
          const labels: string[] = []
          const now = new Date()
          for (let i = count - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            labels.push(d.toLocaleString('ru-RU', { month: 'short' }))
          }
          return labels
        })(),
        datasets: [
          {
            label: 'Заявки',
            data: data.monthlyApplications || [],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
          },
        ],
      },
    },
    {
      type: 'bar' as const,
      title: 'Стоимость по шоу',
      data: {
        labels: (data.costByShow || []).map((c: any) => c.show),
        datasets: [
          {
            label: 'Стоимость (₽)',
            data: (data.costByShow || []).map((c: any) => c.cost),
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
          },
        ],
      },
    },
  ]

  const quickActions = [
    {
      title: 'Калькулятор стоимости',
      description: 'Рассчитайте стоимость рекламы',
      icon: CalculatorIcon,
      href: '/customer/calculator',
      color: 'bg-blue-500',
    },
    {
      title: 'Подать заявку',
      description: 'Создайте новую заявку на рекламу',
      icon: DocumentTextIcon,
      href: '/customer/application',
      color: 'bg-green-500',
    },
    {
      title: 'История заявок',
      description: 'Просмотрите все ваши заявки',
      icon: ClockIcon,
      href: '/customer/history',
      color: 'bg-purple-500',
    },
  ]

  // Pagination
  const recentApplications = data.recentApplications || []
  const totalPages = Math.ceil(recentApplications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedApplications = recentApplications.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Одобрено'
      case 'pending':
        return 'Ожидает агента'
      case 'in_progress':
        return 'В работе'
      case 'sent_to_commercial':
        return 'В работе'
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
      case 'approved':
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
      case 'sent_to_commercial':
        return 'bg-blue-100 text-blue-800'
      case 'rejected':
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Добро пожаловать, {user?.name}!
            </h1>
            <p className="text-secondary-600">
              Панель управления заказчика рекламы
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <a
              key={index}
              href={action.href}
              className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${action.color}`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900">
                    {action.title}
                  </h3>
                  <p className="text-sm text-secondary-600">
                    {action.description}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Dashboard */}
        <Dashboard title="Статистика" charts={charts} stats={stats} />

        {/* Recent Applications */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="p-6 border-b border-secondary-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-secondary-900">
              Последние заявки
            </h3>
            {recentApplications.length > 0 && (
              <p className="text-sm text-gray-600">
                Показано {startIndex + 1}-{Math.min(endIndex, recentApplications.length)} из {recentApplications.length}
              </p>
            )}
          </div>
          <div className="p-6">
            {recentApplications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>У вас пока нет заявок</p>
              </div>
            ) : (
              <>
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
                          Статус
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                          Стоимость
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-secondary-200">
                      {paginatedApplications.map((application: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                            {application.show}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                            {new Date(application.date).toLocaleDateString('ru-RU')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                            {application.duration} сек
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                              {getStatusText(application.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                            {application.cost} ₽
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Назад
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default CustomerDashboard
