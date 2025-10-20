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

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboardData('customer'))
    }
  }, [dispatch, user])

  const stats = [
    {
      label: 'Всего заявок',
      value: data.totalApplications || 0,
      change: 12,
      changeType: 'increase' as const,
    },
    {
      label: 'Одобренных заявок',
      value: data.approvedApplications || 0,
      change: 8,
      changeType: 'increase' as const,
    },
    {
      label: 'Общая стоимость',
      value: `${data.totalCost || 0} ₽`,
      change: 15,
      changeType: 'increase' as const,
    },
    {
      label: 'Активных заявок',
      value: data.activeApplications || 0,
      change: -2,
      changeType: 'decrease' as const,
    },
  ]

  const charts = [
    {
      type: 'line' as const,
      title: 'Заявки по месяцам',
      data: {
        labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'],
        datasets: [
          {
            label: 'Заявки',
            data: data.monthlyApplications || [12, 19, 3, 5, 2, 3],
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
        labels: ['Утреннее шоу', 'Дневное шоу', 'Вечернее шоу', 'Ночное шоу'],
        datasets: [
          {
            label: 'Стоимость (₽)',
            data: data.costByShow || [12000, 19000, 30000, 8000],
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
          <div className="p-6 border-b border-secondary-200">
            <h3 className="text-lg font-semibold text-secondary-900">
              Последние заявки
            </h3>
          </div>
          <div className="p-6">
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
                  {(data.recentApplications || []).map((application: any, index: number) => (
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
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            application.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : application.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {application.status === 'approved'
                            ? 'Одобрено'
                            : application.status === 'pending'
                            ? 'На рассмотрении'
                            : 'Отклонено'}
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
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default CustomerDashboard
