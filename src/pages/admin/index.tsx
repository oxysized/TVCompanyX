import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import { fetchDashboardData } from '../../redux/slices/dashboardSlice'
import { userAPI } from '../../utils/api'
import Layout from '../../components/layout/Layout'
import Dashboard from '../../components/dashboard/Dashboard'
import toast from 'react-hot-toast'
import { 
  UsersIcon, 
  ChartBarIcon, 
  ServerIcon,
  CogIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLogin?: string
  createdAt: string
}

interface SystemLog {
  id: string
  level: 'info' | 'warning' | 'error'
  message: string
  timestamp: string
  source: string
}

const AdminDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { data, loading } = useSelector((state: RootState) => state.dashboard)
  const [users, setUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboardData('admin'))
      loadUsers()
      loadLogs()
    }
  }, [dispatch, user])

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const response = await userAPI.getUsers()
      setUsers(response.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка загрузки пользователей')
    } finally {
      setUsersLoading(false)
    }
  }

  const loadLogs = async () => {
    setLogsLoading(true)
    try {
      // Mock logs data - replace with actual API call
      const mockLogs: SystemLog[] = [
        { id: '1', level: 'info', message: 'User login successful', timestamp: new Date().toISOString(), source: 'auth' },
        { id: '2', level: 'warning', message: 'High memory usage detected', timestamp: new Date(Date.now() - 3600000).toISOString(), source: 'system' },
        { id: '3', level: 'error', message: 'Database connection failed', timestamp: new Date(Date.now() - 7200000).toISOString(), source: 'database' },
        { id: '4', level: 'info', message: 'Application started', timestamp: new Date(Date.now() - 10800000).toISOString(), source: 'app' },
      ]
      setLogs(mockLogs)
    } catch (error: any) {
      toast.error('Ошибка загрузки логов')
    } finally {
      setLogsLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return

    try {
      await userAPI.deleteUser(userId)
      toast.success('Пользователь удален')
      loadUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка удаления пользователя')
    }
  }

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await userAPI.updateUser(userId, { isActive: !isActive })
      toast.success(`Пользователь ${!isActive ? 'активирован' : 'деактивирован'}`)
      loadUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка обновления статуса')
    }
  }

  const stats = [
    {
      label: 'Активных пользователей',
      value: data.activeUsers || 0,
      change: 3,
      changeType: 'increase' as const,
    },
    {
      label: 'Всего пользователей',
      value: data.totalUsers || 0,
      change: 1,
      changeType: 'increase' as const,
    },
    {
      label: 'Ошибок за день',
      value: data.dailyErrors || 0,
      change: -2,
      changeType: 'decrease' as const,
    },
    {
      label: 'Время работы системы',
      value: data.uptime || '99.9%',
      change: 0.1,
      changeType: 'increase' as const,
    },
  ]

  const charts = [
    {
      type: 'line' as const,
      title: 'Активные пользователи',
      data: {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
        datasets: [
          {
            label: 'Пользователи',
            data: data.hourlyActiveUsers || [5, 2, 15, 25, 20, 12],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
          },
        ],
      },
    },
    {
      type: 'bar' as const,
      title: 'Пользователи по ролям',
      data: {
        labels: ['Заказчики', 'Агенты', 'Коммерческий', 'Бухгалтер', 'Админ', 'Директор'],
            datasets: [
          {
            label: 'Количество',
            data: data.usersByRole || [25, 8, 3, 2, 1, 1],
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
          },
        ],
      },
    },
  ]

  const getRoleDisplayName = (role: string) => {
    const roleNames: { [key: string]: string } = {
      customer: 'Заказчик',
      agent: 'Рекламный агент',
      commercial: 'Коммерческий отдел',
      accountant: 'Бухгалтер',
      admin: 'ИТ-администратор',
      director: 'Директор',
    }
    return roleNames[role] || role
  }

  const getLogLevelBadge = (level: string) => {
    const levelConfig = {
      info: { color: 'bg-blue-100 text-blue-800', text: 'INFO' },
      warning: { color: 'bg-yellow-100 text-yellow-800', text: 'WARN' },
      error: { color: 'bg-red-100 text-red-800', text: 'ERROR' },
    }

    const config = levelConfig[level as keyof typeof levelConfig]
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    )
  }

  if (loading) {
    return (
      <Layout role="admin">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Добро пожаловать, {user?.name}!
            </h1>
            <p className="text-secondary-600">
              Панель управления ИТ-администратора
            </p>
          </div>
        </div>

        {/* Dashboard */}
        <Dashboard title="Системная статистика" charts={charts} stats={stats} />

        {/* Users Management */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="p-6 border-b border-secondary-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-secondary-900">
                Управление пользователями
              </h3>
              <button
                onClick={() => setShowUserForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Добавить пользователя</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <UsersIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  Пользователи не найдены
                </h3>
                <p className="text-secondary-600">
                  Добавьте первого пользователя
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Пользователь
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Роль
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Статус
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Последний вход
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Создан
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-secondary-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-secondary-500">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {getRoleDisplayName(user.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Активен' : 'Неактивен'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {user.lastLogin 
                            ? new Date(user.lastLogin).toLocaleString('ru-RU')
                            : 'Никогда'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Редактировать"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                            className={`${user.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                            title={user.isActive ? 'Деактивировать' : 'Активировать'}
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Удалить"
                          >
                            <TrashIcon className="h-5 w-5" />
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

        {/* System Logs */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="p-6 border-b border-secondary-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-secondary-900">
                Системные логи
              </h3>
              <button
                onClick={loadLogs}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Обновить
              </button>
            </div>
          </div>

          <div className="p-6">
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8">
                <ServerIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  Логи не найдены
                </h3>
                <p className="text-secondary-600">
                  Нет системных логов
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Уровень
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Сообщение
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Источник
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Время
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getLogLevelBadge(log.level)}
                        </td>
                        <td className="px-6 py-4 text-sm text-secondary-900">
                          {log.message}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {log.source}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {new Date(log.timestamp).toLocaleString('ru-RU')}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/admin/stats"
            className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-blue-500">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  Статистика системы
                </h3>
                <p className="text-sm text-secondary-600">
                  Подробная статистика работы системы
                </p>
              </div>
            </div>
          </a>

          <a
            href="/admin/logs"
            className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-red-500">
                <ServerIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  Логи сервера
                </h3>
                <p className="text-sm text-secondary-600">
                  Просмотр системных логов и ошибок
                </p>
              </div>
            </div>
          </a>

          <a
            href="/admin/settings"
            className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-gray-500">
                <CogIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">
                  Настройки системы
                </h3>
                <p className="text-sm text-secondary-600">
                  Конфигурация системы и параметры
                </p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </Layout>
  )
}

export default AdminDashboard
