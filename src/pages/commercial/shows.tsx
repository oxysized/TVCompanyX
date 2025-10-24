import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'
import Layout from '../../components/layout/Layout'
import toast from 'react-hot-toast'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  TvIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

interface Show {
  id: string
  name: string
  show_type: string
  time_slot: string
  base_price_per_min: number
  duration_minutes: number
  description?: string
  is_active: boolean
  is_recurring?: boolean
  recurring_days?: string
  created_at: string
}

const ShowsManagementPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingShow, setEditingShow] = useState<Show | null>(null)
  const [timeConflict, setTimeConflict] = useState<{show: string, time: string} | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    show_type: 'program',
    time_slot: '',
    base_price_per_min: '',
    duration_minutes: 60,
    description: '',
    is_active: true,
    is_recurring: false,
    recurring_days: 'daily'
  })

  useEffect(() => {
    loadShows()
  }, [])

  const loadShows = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/shows', { credentials: 'same-origin' })
      if (response.ok) {
        const data = await response.json()
        setShows(data)
      } else {
        throw new Error('Failed to load shows')
      }
    } catch (error) {
      toast.error('Ошибка загрузки списка шоу')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    let newValue: any = value
    
    if (type === 'number') {
      newValue = value === '' ? '' : parseFloat(value) || ''
    } else if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }))
  }

  const openCreateModal = () => {
    setEditingShow(null)
    setFormData({
      name: '',
      show_type: 'program',
      time_slot: '',
      base_price_per_min: '',
      duration_minutes: 60,
      description: '',
      is_active: true,
      is_recurring: false,
      recurring_days: 'daily'
    })
    setIsModalOpen(true)
  }

  const openEditModal = (show: Show) => {
    setEditingShow(show)
    setFormData({
      name: show.name,
      show_type: show.show_type || 'program',
      time_slot: show.time_slot,
      base_price_per_min: show.base_price_per_min.toString(),
      duration_minutes: show.duration_minutes,
      description: show.description || '',
      is_active: show.is_active,
      is_recurring: show.is_recurring || false,
      recurring_days: show.recurring_days || 'daily'
    })
    setTimeConflict(null)
    setIsModalOpen(true)
  }

  const checkTimeConflict = async (timeSlot: string) => {
    if (!timeSlot || !timeSlot.includes('-')) {
      setTimeConflict(null)
      return
    }

    try {
      const response = await fetch('/api/shows/check-time-conflict', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time_slot: timeSlot,
          show_id: editingShow?.id,
          is_recurring: formData.is_recurring,
          recurring_days: formData.recurring_days
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.conflict && data.conflicts && data.conflicts.length > 0) {
          const conflict = data.conflicts[0]
          setTimeConflict({
            show: conflict.name,
            time: conflict.time_slot
          })
          toast.error(`Конфликт времени: "${conflict.name}" (${conflict.time_slot})`)
        } else {
          setTimeConflict(null)
        }
      }
    } catch (error) {
      console.error('Error checking time conflict:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check for time conflict before submitting
    if (timeConflict) {
      toast.error('Исправьте конфликт времени перед сохранением')
      return
    }
    
    try {
      const url = editingShow ? `/api/shows/${editingShow.id}` : '/api/shows'
      const method = editingShow ? 'PUT' : 'POST'
      
      // Convert string values to numbers
      const submitData = {
        ...formData,
        base_price_per_min: parseFloat(formData.base_price_per_min as any) || 0,
        duration_minutes: parseInt(formData.duration_minutes as any) || 60
      }
      
      const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      })

      if (response.ok) {
        toast.success(editingShow ? 'Шоу обновлено' : 'Шоу создано')
        setIsModalOpen(false)
        loadShows()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка сохранения шоу')
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка сохранения шоу')
    }
  }

  const handleDelete = async (showId: string) => {
    if (!confirm('Вы уверены, что хотите удалить это шоу?')) return
    
    try {
      const response = await fetch(`/api/shows/${showId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      })

      if (response.ok) {
        toast.success('Шоу удалено')
        loadShows()
      } else {
        throw new Error('Ошибка удаления шоу')
      }
    } catch (error) {
      toast.error('Ошибка удаления шоу')
    }
  }

  const getShowTypeText = (type: string) => {
    const types: Record<string, string> = {
      program: 'Программа',
      series: 'Сериал',
      morning: 'Утреннее шоу',
      day: 'Дневное шоу',
      evening: 'Вечернее шоу',
      news: 'Новости',
      entertainment: 'Развлекательное',
      sport: 'Спортивное',
      documentary: 'Документальное',
      children: 'Детское',
      movie: 'Кино'
    }
    return types[type] || type
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

  return (
    <Layout role="commercial">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TvIcon className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">
                Управление шоу
              </h1>
              <p className="text-secondary-600">
                Создание и редактирование телевизионных программ
              </p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Создать шоу</span>
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <TvIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Всего шоу</p>
                <p className="text-2xl font-bold text-gray-900">{shows.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Активных</p>
                <p className="text-2xl font-bold text-gray-900">
                  {shows.filter(s => s.is_active).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Ср. цена/мин</p>
                <p className="text-2xl font-bold text-gray-900">
                  {shows.length > 0 
                    ? Math.round(shows.reduce((sum, s) => sum + (Number(s.base_price_per_min) || 0), 0) / shows.length).toLocaleString('ru-RU')
                    : 0} ₽
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Shows Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка шоу...</p>
            </div>
          ) : shows.length === 0 ? (
            <div className="p-8 text-center">
              <TvIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Нет созданных шоу</p>
              <button
                onClick={openCreateModal}
                className="mt-4 text-primary-600 hover:text-primary-700"
              >
                Создать первое шоу
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Название
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Тип
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Время
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Длительность
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Цена/мин
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shows.map((show) => (
                    <tr key={show.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{show.name}</div>
                        {show.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{show.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getShowTypeColor(show.show_type)}`}>
                          {getShowTypeText(show.show_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {show.time_slot}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {show.duration_minutes} мин
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {show.base_price_per_min.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          show.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {show.is_active ? 'Активно' : 'Неактивно'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditModal(show)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Редактировать"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(show.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Удалить"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <h3 className="text-lg font-semibold mb-4">
              {editingShow ? 'Редактировать шоу' : 'Создать новое шоу'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название шоу *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Например: Вечерние новости"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип шоу *
                  </label>
                  <select
                    name="show_type"
                    value={formData.show_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="program">Программа</option>
                    <option value="series">Сериал</option>
                    <option value="morning">Утреннее шоу</option>
                    <option value="day">Дневное шоу</option>
                    <option value="evening">Вечернее шоу</option>
                    <option value="news">Новости</option>
                    <option value="entertainment">Развлекательное</option>
                    <option value="sport">Спортивное</option>
                    <option value="documentary">Документальное</option>
                    <option value="children">Детское</option>
                    <option value="movie">Кино</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Время показа *
                  </label>
                  <input
                    type="text"
                    name="time_slot"
                    value={formData.time_slot}
                    onChange={handleInputChange}
                    onBlur={(e) => checkTimeConflict(e.target.value)}
                    required
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      timeConflict 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-primary-500'
                    }`}
                    placeholder="09:00-10:00"
                  />
                  <p className="mt-1 text-xs text-gray-500">Формат: ЧЧ:ММ-ЧЧ:ММ</p>
                  {timeConflict && (
                    <p className="mt-1 text-xs text-red-600">
                      ⚠️ В это время уже идёт "{timeConflict.show}" ({timeConflict.time})
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Длительность (минуты) *
                  </label>
                  <input
                    type="number"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Базовая цена за минуту (₽) *
                </label>
                <input
                  type="number"
                  name="base_price_per_min"
                  value={formData.base_price_per_min}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Краткое описание программы..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Шоу активно (доступно для размещения рекламы)
                </label>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  {editingShow ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default ShowsManagementPage
