import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import { fetchDashboardData } from '../../redux/slices/dashboardSlice'
import Layout from '../../components/layout/Layout'
import Dashboard from '../../components/dashboard/Dashboard'
import toast from 'react-hot-toast'
import { 
  PresentationChartBarIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface StaffStats {
  id: string
  name: string
  role: string
  closedDeals: number
  revenue: number
  kpi: number
  commission: number
}

interface CompanyStats {
  totalRevenue: number
  totalApplications: number
  activeClients: number
  averageDealSize: number
  growthRate: number
}

const DirectorDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { data, loading } = useSelector((state: RootState) => state.dashboard)
  const [staffStats, setStaffStats] = useState<StaffStats[]>([])
  const [companyStats, setCompanyStats] = useState<CompanyStats | null>(null)
  const [staffLoading, setStaffLoading] = useState(true)
  const [commissionSettings, setCommissionSettings] = useState({
    agentCommission: 5,
    minutePrice: 1000,
  })

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboardData('director'))
      loadStaffStats()
      loadCompanyStats()
    }
  }, [dispatch, user])

  const loadStaffStats = async () => {
    setStaffLoading(true)
    try {
      // Mock data - replace with actual API call
      const mockStaffStats: StaffStats[] = [
        { id: '1', name: 'Иван Петров', role: 'agent', closedDeals: 25, revenue: 500000, kpi: 95, commission: 25000 },
        { id: '2', name: 'Мария Сидорова', role: 'agent', closedDeals: 18, revenue: 360000, kpi: 87, commission: 18000 },
        { id: '3', name: 'Алексей Козлов', role: 'agent', closedDeals: 32, revenue: 640000, kpi: 98, commission: 32000 },
        { id: '4', name: 'Елена Морозова', role: 'commercial', closedDeals: 45, revenue: 900000, kpi: 92, commission: 0 },
      ]
      setStaffStats(mockStaffStats)
    } catch (error: any) {
      toast.error('Ошибка загрузки статистики сотрудников')
    } finally {
      setStaffLoading(false)
    }
  }

  const loadCompanyStats = async () => {
    try {
      // Mock data - replace with actual API call
      const mockCompanyStats: CompanyStats = {
        totalRevenue: 2500000,
        totalApplications: 120,
        activeClients: 45,
        averageDealSize: 20833,
        growthRate: 15.5,
      }
      setCompanyStats(mockCompanyStats)
    } catch (error: any) {
      toast.error('Ошибка загрузки статистики компании')
    }
  }

  const handleUpdateCommissionSettings = async () => {
    try {
      // Mock API call - replace with actual implementation
      toast.success('Настройки комиссий обновлены')
    } catch (error: any) {
      toast.error('Ошибка обновления настроек')
    }
  }

  const stats = [
    {
      label: 'Общий доход',
      value: `${companyStats?.totalRevenue.toLocaleString('ru-RU') || 0} ₽`,
      change: companyStats?.growthRate || 0,
      changeType: 'increase' as const,
    },
    {
      label: 'Всего заявок',
      value: companyStats?.totalApplications || 0,
      change: 12,
      changeType: 'increase' as const,
    },
    {
      label: 'Активных клиентов',
      value: companyStats?.activeClients || 0,
      change: 8,
      changeType: 'increase' as const,
    },
    {
      label: 'Средний размер сделки',
      value: `${companyStats?.averageDealSize.toLocaleString('ru-RU') || 0} ₽`,
      change: 5,
      changeType: 'increase' as const,
    },
  ]

  const charts = [
    {
      type: 'line' as const,
      title: 'Доходы компании',
      data: {
        labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'],
        datasets: [
          {
            label: 'Доход (₽)',
            data: data.monthlyRevenue || [200000, 250000, 300000, 350000, 400000, 450000],
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
          },
        ],
      },
    },
    {
      type: 'bar' as const,
      title: 'Статистика сотрудников',
      data: {
        labels: staffStats.map(staff => staff.name),
        datasets: [
          {
            label: 'Закрытые сделки',
            data: staffStats.map(staff => staff.closedDeals),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
          },
          {
            label: 'Доход (тыс. ₽)',
            data: staffStats.map(staff => staff.revenue / 1000),
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
          },
        ],
      },
    },
  ]

  const getRoleDisplayName = (role: string) => {
    const roleNames: { [key: string]: string } = {
      agent: 'Рекламный агент',
      commercial: 'Коммерческий отдел',
      accountant: 'Бухгалтер',
      admin: 'ИТ-администратор',
      director: 'Директор',
    }
    return roleNames[role] || role
  }

  const getKpiBadge = (kpi: number) => {
    let color = 'bg-red-100 text-red-800'
    if (kpi >= 90) color = 'bg-green-100 text-green-800'
    else if (kpi >= 80) color = 'bg-yellow-100 text-yellow-800'

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${color}`}>
        {kpi}%
      </span>
    )
  }

  if (loading) {
    return (
      <Layout role="director">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout role="director">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Добро пожаловать, {user?.name}!
            </h1>
            <p className="text-secondary-600">
              Панель управления директора
            </p>
          </div>
        </div>

        {/* Dashboard */}
        <Dashboard title="Статистика компании" charts={charts} stats={stats} />

        {/* Staff Statistics */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="p-6 border-b border-secondary-200">
            <h3 className="text-lg font-semibold text-secondary-900">
              Статистика сотрудников
            </h3>
          </div>

          <div className="p-6">
            {staffLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : staffStats.length === 0 ? (
              <div className="text-center py-8">
                <UsersIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  Данные не найдены
                </h3>
                <p className="text-secondary-600">
                  Нет данных о сотрудниках
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Сотрудник
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Роль
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Закрытые сделки
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Доход
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        KPI
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Комиссия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {staffStats.map((staff) => (
                      <tr key={staff.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                          {staff.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {getRoleDisplayName(staff.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {staff.closedDeals}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                          {staff.revenue.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getKpiBadge(staff.kpi)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {staff.commission.toLocaleString('ru-RU')} ₽
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Commission Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Настройки комиссий и цен
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Комиссия агентов (%)
              </label>
              <input
                type="number"
                value={commissionSettings.agentCommission}
                onChange={(e) => setCommissionSettings({
                  ...commissionSettings,
                  agentCommission: Number(e.target.value)
                })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                min="0"
                max="100"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Стоимость минуты рекламы (₽)
              </label>
              <input
                type="number"
                value={commissionSettings.minutePrice}
                onChange={(e) => setCommissionSettings({
                  ...commissionSettings,
                  minutePrice: Number(e.target.value)
                })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                min="0"
                step="100"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleUpdateCommissionSettings}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Обновить настройки
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <a
            href="/director/staff-stats"
            className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-blue-500">
                <PresentationChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  Статистика сотрудников
                </h3>
                <p className="text-sm text-secondary-600">
                  Подробная статистика по сотрудникам
                </p>
              </div>
            </div>
          </a>

          <a
            href="/director/commissions"
            className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-green-500">
                <CurrencyDollarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  Комиссии агентов
                </h3>
                <p className="text-sm text-secondary-600">
                  Управление комиссиями
                </p>
              </div>
            </div>
          </a>

          <a
            href="/director/client-reports"
            className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-purple-500">
                <DocumentArrowDownIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  Отчеты по клиентам
                </h3>
                <p className="text-sm text-secondary-600">
                  Анализ клиентской базы
                </p>
              </div>
            </div>
          </a>

          <a
            href="/director/company-stats"
            className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-orange-500">
                <BuildingOfficeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  Статистика компании
                </h3>
                <p className="text-sm text-secondary-600">
                  Общие показатели компании
                </p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </Layout>
  )
}

export default DirectorDashboard
