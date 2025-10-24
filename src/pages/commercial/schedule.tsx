import React, { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import { PlusIcon, CalendarIcon, ClockIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface Show {
  id: string
  name: string
  time_slot: string
  base_price_per_min: number
}

interface ScheduleItem {
  id: string
  show_id: string
  show_name: string
  scheduled_date: string
  duration_minutes: number
  ad_minutes: number
  available_slots: number
  created_at: string
}

const CommercialSchedulePage: React.FC = () => {
  const [shows, setShows] = useState<Show[]>([])
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    showId: '',
  })

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load shows
        const showsResponse = await fetch('/api/shows')
        if (showsResponse.ok) {
          const showsData = await showsResponse.json()
          setShows(showsData)
        }

        // Load schedule
        const scheduleResponse = await fetch('/api/schedule')
        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json()
          setSchedule(scheduleData)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    loadData()
  }, [])

  const [formData, setFormData] = useState({
    showId: '',
    scheduledDate: '',
    durationMinutes: 60,
    adMinutes: 10,
    availableSlots: 10,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const selectedShow = shows.find(s => s.id === formData.showId)
    if (!selectedShow) return

    try {
      if (editingItem) {
        // Update existing item
        const response = await fetch(`/api/schedule/${editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scheduled_date: formData.scheduledDate,
            duration_minutes: formData.durationMinutes,
            ad_minutes: formData.adMinutes,
            available_slots: formData.availableSlots,
          })
        })

        if (response.ok) {
          const updatedItem = await response.json()
          setSchedule(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item))
        }
      } else {
        // Create new item
        const response = await fetch('/api/schedule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            show_id: formData.showId,
            scheduled_date: formData.scheduledDate,
            duration_minutes: formData.durationMinutes,
            ad_minutes: formData.adMinutes,
            available_slots: formData.availableSlots,
          })
        })

        if (response.ok) {
          const newItem = await response.json()
          setSchedule(prev => [...prev, newItem])
        }
      }

      setShowForm(false)
      setEditingItem(null)
      setFormData({
        showId: '',
        scheduledDate: '',
        durationMinutes: 60,
        adMinutes: 10,
        availableSlots: 10,
      })
    } catch (error) {
      console.error('Error saving schedule item:', error)
    }
  }

  const handleEdit = (item: ScheduleItem) => {
    setEditingItem(item)
    setFormData({
      showId: item.show_id,
      scheduledDate: item.scheduled_date,
      durationMinutes: item.duration_minutes,
      adMinutes: item.ad_minutes,
      availableSlots: item.available_slots,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот элемент расписания?')) {
      try {
        const response = await fetch(`/api/schedule/${id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          setSchedule(prev => prev.filter(item => item.id !== id))
        }
      } catch (error) {
        console.error('Error deleting schedule item:', error)
      }
    }
  }

  const filteredSchedule = schedule.filter(item => {
    if (filters.dateFrom && item.scheduled_date < filters.dateFrom) return false
    if (filters.dateTo && item.scheduled_date > filters.dateTo) return false
    if (filters.showId && item.show_id !== filters.showId) return false
    return true
  })

  // Chart data
  const chartData = {
    labels: schedule.map(item => new Date(item.scheduled_date).toLocaleDateString()),
    datasets: [
      {
        label: 'Доступные слоты',
        data: schedule.map(item => item.available_slots),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
      {
        label: 'Минуты рекламы',
        data: schedule.map(item => item.ad_minutes),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.1,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Статистика расписания',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  return (
    <Layout role="commercial">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Расписание шоу</h1>
            <p className="text-secondary-600">Управление расписанием телепередач и рекламными слотами</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Добавить шоу</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Всего шоу</p>
                <p className="text-2xl font-bold text-gray-900">{schedule.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Общее время</p>
                <p className="text-2xl font-bold text-gray-900">
                  {schedule.reduce((acc, item) => acc + item.duration_minutes, 0)} мин
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <EyeIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Рекламное время</p>
                <p className="text-2xl font-bold text-gray-900">
                  {schedule.reduce((acc, item) => acc + item.ad_minutes, 0)} мин
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">%</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Заполненность</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(
                    (schedule.reduce((acc, item) => acc + item.ad_minutes, 0) /
                      schedule.reduce((acc, item) => acc + item.duration_minutes, 0)) * 100
                  )}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика расписания</h3>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Фильтры</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата от</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата до</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Шоу</label>
              <select
                value={filters.showId}
                onChange={(e) => setFilters(prev => ({ ...prev, showId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Все шоу</option>
                {shows.map(show => (
                  <option key={show.id} value={show.id}>{show.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ dateFrom: '', dateTo: '', showId: '' })}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Расписание шоу</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Шоу
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Длительность
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Реклама
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Слоты
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSchedule.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.show_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.scheduled_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.duration_minutes} мин
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.ad_minutes} мин
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.available_slots > 5 
                          ? 'bg-green-100 text-green-800' 
                          : item.available_slots > 2 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.available_slots} слотов
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingItem ? 'Редактировать шоу' : 'Добавить шоу в расписание'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Шоу</label>
                  <select
                    value={formData.showId}
                    onChange={(e) => setFormData(prev => ({ ...prev, showId: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Выберите шоу</option>
                    {shows.map(show => (
                      <option key={show.id} value={show.id}>{show.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Длительность (минуты)</label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) }))}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Минуты рекламы</label>
                  <input
                    type="number"
                    value={formData.adMinutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, adMinutes: parseInt(e.target.value) }))}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Доступные слоты</label>
                  <input
                    type="number"
                    value={formData.availableSlots}
                    onChange={(e) => setFormData(prev => ({ ...prev, availableSlots: parseInt(e.target.value) }))}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
                  >
                    {editingItem ? 'Сохранить' : 'Добавить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingItem(null)
                      setFormData({
                        showId: '',
                        scheduledDate: '',
                        durationMinutes: 60,
                        adMinutes: 10,
                        availableSlots: 10,
                      })
                    }}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default CommercialSchedulePage

