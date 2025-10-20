import React, { useState, useEffect } from 'react'
import { adAPI } from '../utils/api'
import socketService from '../utils/socket'
import { 
  PlayIcon, 
  CalendarIcon, 
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface Service {
  id: string
  showName: string
  clientName: string
  date: string
  duration: number
  cost: number
  status: 'completed' | 'scheduled'
  description?: string
}

const PublicServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'completed' | 'scheduled'>('all')

  useEffect(() => {
    loadServices()
    
    // Subscribe to real-time updates
    socketService.on('serviceUpdate', (newService: Service) => {
      setServices(prev => [newService, ...prev])
    })

    return () => {
      socketService.off('serviceUpdate')
    }
  }, [])

  const loadServices = async () => {
    setLoading(true)
    try {
      const response = await adAPI.getApplications({ 
        status: 'approved',
        public: true 
      })
      setServices(response.data)
    } catch (error: any) {
      console.error('Error loading services:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredServices = services.filter(service => {
    if (filter === 'all') return true
    return service.status === filter
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', text: 'Завершено', icon: CheckCircleIcon },
      scheduled: { color: 'bg-blue-100 text-blue-800', text: 'Запланировано', icon: CalendarIcon },
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-primary-600">
                TV Company Ad System
              </h1>
              <p className="text-secondary-600 mt-1">
                Публичные услуги и размещения рекламы
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-secondary-500">
                Обновлено в реальном времени
              </p>
              <div className="flex items-center mt-1">
                <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-xs text-green-600">Онлайн</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-500">
                <PlayIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Всего услуг</p>
                <p className="text-2xl font-bold text-secondary-900">{services.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-500">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Завершено</p>
                <p className="text-2xl font-bold text-secondary-900">
                  {services.filter(s => s.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-500">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Запланировано</p>
                <p className="text-2xl font-bold text-secondary-900">
                  {services.filter(s => s.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-500">
                <CurrencyDollarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Общая стоимость</p>
                <p className="text-2xl font-bold text-secondary-900">
                  {services.reduce((sum, service) => sum + service.cost, 0).toLocaleString('ru-RU')} ₽
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 mb-6">
          <div className="border-b border-secondary-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'all', label: 'Все услуги', count: services.length },
                { key: 'completed', label: 'Завершенные', count: services.filter(s => s.status === 'completed').length },
                { key: 'scheduled', label: 'Запланированные', count: services.filter(s => s.status === 'scheduled').length },
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
        </div>

        {/* Services List */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-12">
                <PlayIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  Услуги не найдены
                </h3>
                <p className="text-secondary-600">
                  {filter === 'all' 
                    ? 'Пока нет размещений рекламы' 
                    : `Нет услуг со статусом "${filter === 'completed' ? 'Завершенные' : 'Запланированные'}"`
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className="border border-secondary-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-primary-100">
                          <PlayIcon className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-secondary-900">
                            {service.showName}
                          </h3>
                          <p className="text-sm text-secondary-600">
                            Клиент: {service.clientName}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(service.status)}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-secondary-600">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        <span>{formatDate(service.date)}</span>
                      </div>

                      <div className="flex items-center text-sm text-secondary-600">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        <span>{service.duration} секунд</span>
                      </div>

                      <div className="flex items-center text-sm font-medium text-secondary-900">
                        <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                        <span>{service.cost.toLocaleString('ru-RU')} ₽</span>
                      </div>

                      {service.description && (
                        <div className="pt-2 border-t border-secondary-200">
                          <p className="text-sm text-secondary-600">
                            {service.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            О наших услугах
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• Мы предоставляем качественные услуги размещения рекламы в популярных телешоу</p>
            <p>• Все размещения проходят тщательный контроль качества</p>
            <p>• Информация обновляется в реальном времени</p>
            <p>• Мы работаем с проверенными клиентами и партнерами</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-secondary-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-secondary-600">
              © 2024 TV Company Ad System. Все права защищены.
            </p>
            <p className="text-xs text-secondary-500 mt-2">
              Данные обновляются в реальном времени через WebSocket соединение
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PublicServicesPage
