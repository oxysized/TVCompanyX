import React, { useState, useEffect } from 'react'
import Layout from '../../components/layout/Layout'
import { PlusIcon, CalendarIcon, ClockIcon, EyeIcon, PencilIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
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
  time_slot?: string
  booked_ads?: number
}

type ViewMode = 'day' | 'week' | 'list'

const CommercialSchedulePage: React.FC = () => {
  const [shows, setShows] = useState<Show[]>([])
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
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

        // Load applications to count booked ads
        const appsResponse = await fetch('/api/applications')
        if (appsResponse.ok) {
          const appsData = await appsResponse.json()
          setApplications(appsData)
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
          // Ensure the item has show_name from selected show
          const fullUpdatedItem = {
            ...updatedItem,
            show_name: selectedShow.name,
          }
          setSchedule(prev => prev.map(item => item.id === editingItem.id ? fullUpdatedItem : item))
          toast.success('Расписание обновлено')
        } else {
          toast.error('Ошибка при обновлении расписания')
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
          // Add show_name to the new item
          const fullNewItem = {
            ...newItem,
            show_name: selectedShow.name,
            time_slot: formData.scheduledDate.includes('T') ? formData.scheduledDate.split('T')[1] : undefined,
          }
          console.log('Adding new schedule item:', fullNewItem)
          setSchedule(prev => [...prev, fullNewItem])
          toast.success('Шоу добавлено в расписание')
        } else {
          toast.error('Ошибка при добавлении в расписание')
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
    // Convert scheduled_date to datetime-local format (YYYY-MM-DDTHH:mm)
    let scheduledDateTime = item.scheduled_date
    if (scheduledDateTime && !scheduledDateTime.includes('T')) {
      scheduledDateTime = scheduledDateTime + 'T00:00'
    } else if (scheduledDateTime && scheduledDateTime.length > 16) {
      scheduledDateTime = scheduledDateTime.slice(0, 16)
    }
    
    setFormData({
      showId: item.show_id,
      scheduledDate: scheduledDateTime,
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
          toast.success('Шоу удалено из расписания')
        } else {
          toast.error('Ошибка при удалении')
        }
      } catch (error) {
        console.error('Error deleting schedule item:', error)
        toast.error('Ошибка при удалении')
      }
    }
  }

  const filteredSchedule = schedule.filter(item => {
    if (filters.dateFrom && item.scheduled_date < filters.dateFrom) return false
    if (filters.dateTo && item.scheduled_date > filters.dateTo) return false
    if (filters.showId && item.show_id !== filters.showId) return false
    return true
  })

  // Helper functions for calendar navigation
  const getWeekDates = (date: Date) => {
    const week = []
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay() + 1) // Monday
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }
    return week
  }

  const getDayStart = (date: Date) => {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    return start
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1))
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    }
    setCurrentDate(newDate)
  }

  // Count booked ads for a specific show on a specific date
  const getBookedAdsCount = (showName: string, date: string) => {
    return applications.filter(app => 
      app.show_name === showName && 
      app.scheduled_at?.startsWith(date) &&
      (app.status === 'approved' || app.status === 'sent_to_commercial')
    ).length
  }

  // Get schedule items for a specific date and hour
  const getScheduleForDateTime = (date: Date, hour: number) => {
    const dateStr = formatDate(date)
    const timeStr = formatTime(hour)
    
    return schedule.filter(item => {
      if (!item.scheduled_date.startsWith(dateStr)) return false
      if (item.time_slot && !item.time_slot.startsWith(timeStr)) return false
      
      // If no time_slot, check if this hour falls within the show's duration
      if (!item.time_slot) {
        const itemDate = new Date(item.scheduled_date)
        const itemHour = itemDate.getHours()
        const durationHours = Math.ceil(item.duration_minutes / 60)
        return hour >= itemHour && hour < (itemHour + durationHours)
      }
      
      return true
    }).map(item => {
      const bookedAds = getBookedAdsCount(item.show_name, dateStr)
      return { ...item, booked_ads: bookedAds }
    })
  }

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
          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="bg-white rounded-lg shadow-sm border flex">
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                  viewMode === 'day' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                День
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'week' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Неделя
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Список
              </button>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Добавить шоу</span>
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        {(viewMode === 'day' || viewMode === 'week') && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  {viewMode === 'day' 
                    ? currentDate.toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                    : `Неделя ${Math.ceil((currentDate.getDate()) / 7)}, ${currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`
                  }
                </h2>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Сегодня
                </button>
              </div>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        )}

        {/* Calendar View - Week */}
        {viewMode === 'week' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">
                    Время
                  </th>
                  {getWeekDates(currentDate).map((date, index) => (
                    <th key={index} className="px-4 py-3 text-center border-l">
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        {date.toLocaleDateString('ru-RU', { weekday: 'short' })}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">
                        {date.getDate()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 24 }, (_, hour) => (
                  <tr key={hour} className="border-b hover:bg-gray-50">
                    <td className="sticky left-0 bg-white px-4 py-2 text-xs font-medium text-gray-500 w-20">
                      {formatTime(hour)}
                    </td>
                    {getWeekDates(currentDate).map((date, dayIndex) => {
                      const items = getScheduleForDateTime(date, hour)
                      return (
                        <td key={dayIndex} className="px-2 py-2 border-l align-top">
                          {items.length > 0 ? (
                            <div className="space-y-1">
                              {items.map((item, itemIndex) => (
                                <div
                                  key={itemIndex}
                                  className="bg-blue-50 border border-blue-200 rounded p-2 text-xs cursor-pointer hover:bg-blue-100 transition-colors"
                                  onClick={() => handleEdit(item)}
                                >
                                  <div className="font-semibold text-blue-900 truncate">
                                    {item.show_name}
                                  </div>
                                  <div className="text-blue-700 mt-1">
                                    {item.duration_minutes} мин
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-green-600 font-medium">
                                      {item.booked_ads || 0}/{item.available_slots}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      (item.booked_ads || 0) >= item.available_slots 
                                        ? 'bg-red-100 text-red-700'
                                        : (item.booked_ads || 0) > item.available_slots / 2
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                      {Math.round(((item.booked_ads || 0) / item.available_slots) * 100)}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Calendar View - Day */}
        {viewMode === 'day' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="divide-y">
              {Array.from({ length: 24 }, (_, hour) => {
                const items = getScheduleForDateTime(currentDate, hour)
                return (
                  <div key={hour} className="flex hover:bg-gray-50">
                    <div className="w-24 px-4 py-3 text-sm font-medium text-gray-500 flex-shrink-0">
                      {formatTime(hour)}
                    </div>
                    <div className="flex-1 px-4 py-3 border-l">
                      {items.length > 0 ? (
                        <div className="space-y-2">
                          {items.map((item, index) => (
                            <div
                              key={index}
                              className="bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                              onClick={() => handleEdit(item)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-blue-900">{item.show_name}</h4>
                                  <p className="text-sm text-blue-700 mt-1">
                                    Длительность: {item.duration_minutes} мин • Реклама: {item.ad_minutes} мин
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900">
                                      {item.booked_ads || 0} / {item.available_slots}
                                    </div>
                                    <div className="text-xs text-gray-500">забронировано</div>
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    (item.booked_ads || 0) >= item.available_slots 
                                      ? 'bg-red-100 text-red-700'
                                      : (item.booked_ads || 0) > item.available_slots / 2
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {Math.round(((item.booked_ads || 0) / item.available_slots) * 100)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 italic">Нет передач</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* List View - Original table */}
        {viewMode === 'list' && (
          <>
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
        </>
        )}

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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата и время</label>
                  <input
                    type="datetime-local"
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

