import React, { useState, useEffect, useRef } from 'react'
import { BellIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/router'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import socketService from '../utils/socket'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: any
  read: boolean
  created_at: string
}

const NotificationBell: React.FC = () => {
  const router = useRouter()
  const { user } = useSelector((state: RootState) => state.auth)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const resp = await fetch('/api/notifications/unread-count', { credentials: 'same-origin' })
      if (resp.ok) {
        const data = await resp.json()
        setUnreadCount(data.count || 0)
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  // Handle realtime notification
  const handleRealtimeNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev])
    setUnreadCount(prev => prev + 1)
    
    // Optional: show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      })
    }
  }

  // Subscribe to socket notifications
  useEffect(() => {
    if (user?.id) {
      socketService.joinNotifications(user.id)
      socketService.on('notification', handleRealtimeNotification)
      
      return () => {
        socketService.off('notification', handleRealtimeNotification)
      }
    }
  }, [user?.id])

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const resp = await fetch('/api/notifications?unread=true', { credentials: 'same-origin' })
      if (resp.ok) {
        const data = await resp.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      const resp = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id })
      })
      
      if (resp.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const resp = await fetch('/api/notifications', {
        method: 'DELETE',
        credentials: 'same-origin'
      })
      
      if (resp.ok) {
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    
    // Navigate based on notification type
    if (notification.data?.applicationId) {
      router.push(`/agent/applications`)
    } else if (notification.data?.roomId) {
      router.push(`/agent/chat?room=${notification.data.roomId}`)
    }
    
    setIsOpen(false)
  }

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications()
    }
    setIsOpen(!isOpen)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Fetch unread count on mount and every 30 seconds
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Format time ago
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (seconds < 60) return 'Только что'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} мин назад`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч назад`
    return `${Math.floor(seconds / 86400)} д назад`
  }

  // Get notification icon color
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'application_created': return 'text-blue-600'
      case 'status_changed': return 'text-green-600'
      case 'application_updated': return 'text-yellow-600'
      case 'new_message': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Уведомления</h3>
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium"
              >
                Прочитать все
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-gray-500">Загрузка...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <BellIcon className="h-12 w-12 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Нет новых уведомлений</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${getNotificationColor(notification.type)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {timeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => {
                  router.push('/notifications')
                  setIsOpen(false)
                }}
                className="w-full text-center text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                Посмотреть все
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
