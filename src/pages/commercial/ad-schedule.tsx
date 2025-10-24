import React, { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import toast from 'react-hot-toast'
import { 
  CalendarIcon, 
  TvIcon, 
  ClockIcon,
  DocumentTextIcon,
  UserIcon
} from '@heroicons/react/24/outline'

interface Advertisement {
  id: string
  customer_id: string
  show_id: string
  show_name: string
  show_type?: string
  time_slot?: string
  scheduled_at: string
  duration_seconds: number
  cost: number
  description?: string
  status: string
  // Customer info from JOIN
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
}

const AdSchedulePage: React.FC = () => {
  const [ads, setAds] = useState<Advertisement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedShow, setSelectedShow] = useState<string>('all')
  const [shows, setShows] = useState<any[]>([])

  useEffect(() => {
    loadShows()
  }, [])

  useEffect(() => {
    loadAdvertisements()
  }, [selectedDate, selectedShow])

  const loadShows = async () => {
    try {
      const response = await fetch('/api/shows', { credentials: 'same-origin' })
      if (response.ok) {
        const data = await response.json()
        setShows(data)
      }
    } catch (error) {
      console.error('Error loading shows:', error)
    }
  }

  const loadAdvertisements = async () => {
    setLoading(true)
    try {
      // Get approved applications for the selected date
      const params = new URLSearchParams()
      if (selectedDate) params.append('dateFrom', selectedDate)
      if (selectedDate) params.append('dateTo', selectedDate)
      params.append('status', 'approved')

      const response = await fetch(`/api/applications?${params}`, { 
        credentials: 'same-origin' 
      })
      
      if (response.ok) {
        let data = await response.json()
        
        // Filter by show if selected
        if (selectedShow !== 'all') {
          data = data.filter((ad: any) => ad.show_id === selectedShow)
        }
        
        // Sort by scheduled time
        data.sort((a: any, b: any) => 
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        )
        
        setAds(data)
      } else {
        throw new Error('Failed to load advertisements')
      }
    } catch (error) {
      toast.error('Ошибка загрузки расписания рекламы')
    } finally {
      setLoading(false)
    }
  }

  const groupAdsByShow = () => {
    const grouped: Record<string, Advertisement[]> = {}
    
    ads.forEach(ad => {
      const showName = ad.show_name || 'Без шоу'
      if (!grouped[showName]) {
        grouped[showName] = []
      }
      grouped[showName].push(ad)
    })
    
    return grouped
  }

  const getShowTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      series: 'bg-purple-100 text-purple-800',
      morning: 'bg-yellow-100 text-yellow-800',
      day: 'bg-blue-100 text-blue-800',
      evening: 'bg-indigo-100 text-indigo-800',
      news: 'bg-red-100 text-red-800',
      entertainment: 'bg-pink-100 text-pink-800',
      sport: 'bg-green-100 text-green-800',
      documentary: 'bg-gray-100 text-gray-800',
      children: 'bg-orange-100 text-orange-800',
      movie: 'bg-teal-100 text-teal-800',
      program: 'bg-blue-100 text-blue-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const groupedAds = groupAdsByShow()

  return (
    <Layout role="commercial">
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Расписание рекламы
            </h1>
            <p className="text-secondary-600">
              Одобренные рекламные ролики по шоу и времени
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Шоу
              </label>
              <select
                value={selectedShow}
                onChange={(e) => setSelectedShow(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Все шоу</option>
                {shows.map(show => (
                  <option key={show.id} value={show.id}>
                    {show.name} ({show.time_slot})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadAdvertisements}
                className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
              >
                Обновить
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Всего роликов</p>
                <p className="text-2xl font-bold text-gray-900">{ads.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <TvIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Шоу с рекламой</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(groupedAds).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Общая длительность</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(ads.reduce((sum, ad) => sum + (ad.duration_seconds || 0), 0) / 60)} мин
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">₽</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Общий доход</p>
                <p className="text-2xl font-bold text-gray-900">
                  {ads.reduce((sum, ad) => sum + (ad.cost || 0), 0).toLocaleString('ru-RU')} ₽
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule by Show */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка расписания...</p>
          </div>
        ) : Object.keys(groupedAds).length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Нет одобренной рекламы на выбранную дату</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAds).map(([showName, showAds]) => {
              const firstAd = showAds[0]
              return (
                <div key={showName} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <TvIcon className="h-6 w-6 text-primary-600" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{showName}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-600">{firstAd.time_slot}</span>
                            {firstAd.show_type && (
                              <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getShowTypeColor(firstAd.show_type)}`}>
                                {firstAd.show_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Роликов: {showAds.length}</p>
                        <p className="text-sm font-medium text-primary-600">
                          {Math.round(showAds.reduce((sum, ad) => sum + (ad.duration_seconds || 0), 0) / 60)} мин
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {showAds.map((ad, index) => (
                      <div key={ad.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-600 font-semibold text-sm">
                                {index + 1}
                              </span>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <UserIcon className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium text-gray-900">
                                    {ad.customer_name || 
                                     (ad.first_name || ad.last_name 
                                       ? `${ad.first_name || ''} ${ad.last_name || ''}`.trim() 
                                       : 'Клиент')}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500">{ad.customer_email || ad.email || '—'}</p>
                              </div>
                            </div>
                            
                            {ad.description && (
                              <div className="mt-3 ml-11">
                                <p className="text-sm text-gray-700">
                                  <span className="font-medium">Описание:</span> {ad.description}
                                </p>
                              </div>
                            )}
                            
                            <div className="mt-2 ml-11 flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <ClockIcon className="h-4 w-4" />
                                <span>{Math.round(ad.duration_seconds / 60)} мин ({ad.duration_seconds} сек)</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span>📞</span>
                                <span>{ad.customer_phone || ad.phone || '—'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right ml-4">
                            <p className="text-sm text-gray-500">
                              {new Date(ad.scheduled_at).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            <p className="text-lg font-bold text-primary-600 mt-1">
                              {(ad.cost || 0).toLocaleString('ru-RU')} ₽
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default AdSchedulePage
