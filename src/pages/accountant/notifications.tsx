import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import Layout from '../../components/layout/Layout'
import { 
  BellIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: 'low' | 'medium' | 'high'
}

const AccountantNotificationsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all')

  useEffect(() => {
    loadNotifications()
  }, [filter])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      // Mock data - replace with actual API call
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'warning',
          title: 'Просроченный платеж',
          message: 'Клиент "ООО Реклама+" не оплатил заявку #12345 в срок',
          timestamp: new Date().toISOString(),
          read: false,
          priority: 'high'
        },
        {
          id: '2',
          type: 'success',
          title: 'Платеж получен',
          message: 'Оплата заявки #12340 от "ИП Иванов" поступила на счет',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: true,
          priority: 'medium'
        },
        {
          id: '3',
          type: 'info',
          title: 'Новая заявка одобрена',
          message: 'Заявка #12341 от "Торговый дом" одобрена коммерческим отделом',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          read: false,
          priority: 'medium'
        },
        {
          id: '4',
          type: 'error',
          title: 'Ошибка банковского перевода',
          message: 'Не удалось обработать платеж от "ООО Стройка" - неверные реквизиты',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          read: false,
          priority: 'high'
        }
      ]
      
      let filtered = mockNotifications
      if (filter === 'unread') {
        filtered = mockNotifications.filter(n => !n.read)
      } else if (filter === 'high') {
        filtered = mockNotifications.filter(n => n.priority === 'high')
      }
      
      setNotifications(filtered)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    const iconConfig = {
      info: { icon: InformationCircleIcon, color: 'text-blue-600' },
      warning: { icon: ExclamationTriangleIcon, color: 'text-yellow-600' },
      error: { icon: XCircleIcon, color: 'text-red-600' },
      success: { icon: CheckCircleIcon, color: 'text-green-600' },
    }

    const config = iconConfig[type as keyof typeof iconConfig]
    const Icon = config.icon
    return <Icon className={`h-6 w-6 ${config.color}`} />
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { color: 'bg-gray-100 text-gray-800', text: 'Низкий' },
      medium: { color: 'bg-yellow-100 text-yellow-800', text: 'Средний' },
      high: { color: 'bg-red-100 text-red-800', text: 'Высокий' },
    }

    const config = priorityConfig[priority as keyof typeof priorityConfig]
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'только что'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`
    return date.toLocaleDateString('ru-RU')
  }

  return (
    <Layout role="accountant">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Уведомления
            </h1>
            <p className="text-secondary-600">
              Финансовые уведомления и важные события
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-secondary-600 text-white rounded-md hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
            >
              Отметить все как прочитанные
            </button>
            <button
              onClick={loadNotifications}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Обновить
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="border-b border-secondary-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'all', label: 'Все уведомления', count: notifications.length },
                { key: 'unread', label: 'Непрочитанные', count: notifications.filter(n => !n.read).length },
                { key: 'high', label: 'Высокий приоритет', count: notifications.filter(n => n.priority === 'high').length },
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
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <BellIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  Уведомления не найдены
                </h3>
                <p className="text-secondary-600">
                  {filter === 'all' 
                    ? 'У вас пока нет уведомлений' 
                    : `Нет уведомлений для фильтра "${filter}"`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${
                      notification.read 
                        ? 'bg-secondary-50 border-secondary-200' 
                        : 'bg-white border-secondary-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={`text-sm font-medium ${
                            notification.read ? 'text-secondary-600' : 'text-secondary-900'
                          }`}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {getPriorityBadge(notification.priority)}
                            <span className="text-xs text-secondary-500">
                              {formatTime(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                        <p className={`mt-1 text-sm ${
                          notification.read ? 'text-secondary-500' : 'text-secondary-700'
                        }`}>
                          {notification.message}
                        </p>
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="mt-2 text-xs text-primary-600 hover:text-primary-800"
                          >
                            Отметить как прочитанное
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AccountantNotificationsPage
