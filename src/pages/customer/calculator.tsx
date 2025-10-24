import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Layout from '../../components/layout/Layout'
import toast from 'react-hot-toast'
import { CalculatorIcon, CurrencyDollarIcon, CalendarIcon } from '@heroicons/react/24/outline'

interface CalculatorFormData {
  seconds: number
  showId: string
  selectedDate: string
  selectedTime: string
}

interface Show {
  id: string
  name: string
  base_price_per_min: number
  time_slot: string
  show_type: string
}

const CostCalculator: React.FC = () => {
  const [shows, setShows] = useState<Show[]>([])
  const [availableShows, setAvailableShows] = useState<Show[]>([])
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [showsLoading, setShowsLoading] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CalculatorFormData>()

  const watchedSeconds = watch('seconds')
  const watchedShowId = watch('showId')
  const watchedDate = watch('selectedDate')
  const watchedTime = watch('selectedTime')

  useEffect(() => {
    // Load all shows
    const loadShows = async () => {
      try {
        const response = await fetch('/api/shows')
        if (response.ok) {
          const showsData = await response.json()
          setShows(showsData)
        } else {
          throw new Error('Failed to load shows')
        }
      } catch (error) {
        toast.error('Ошибка загрузки списка шоу')
      } finally {
        setShowsLoading(false)
      }
    }

    loadShows()
  }, [])

  useEffect(() => {
    // Filter shows based on selected date and time
    if (watchedDate) {
      const selectedDate = new Date(watchedDate)
      const now = new Date()
      
      // Filter shows: only show those that are in the future
      const filtered = shows.filter(show => {
        // Extract start time from time_slot (format: "HH:MM-HH:MM")
        const timeSlotStart = show.time_slot.split('-')[0]
        
        // Create datetime for the show
        const showDateTime = new Date(`${watchedDate}T${timeSlotStart}:00`)
        
        // Only include shows that haven't started yet
        return showDateTime > now
      })
      
      setAvailableShows(filtered)
      
      // Show warning if no shows available
      if (filtered.length === 0 && shows.length > 0) {
        toast.error('На выбранную дату все шоу уже прошли. Выберите другую дату.')
      }
      
      // Reset show selection if previously selected show is not available on new date
      if (watchedShowId && !filtered.find(s => s.id === watchedShowId)) {
        setValue('showId', '')
        setCalculatedCost(null)
      }
    } else {
      setAvailableShows([])
    }
  }, [watchedDate, shows, watchedShowId, setValue])

  useEffect(() => {
    // Auto-calculate when all required values are present
    if (watchedSeconds && watchedShowId && watchedDate && watchedSeconds > 0) {
      calculateCost({ 
        seconds: watchedSeconds, 
        showId: watchedShowId,
        selectedDate: watchedDate,
        selectedTime: watchedTime || ''
      })
    } else {
      setCalculatedCost(null)
    }
  }, [watchedSeconds, watchedShowId, watchedDate, watchedTime])

  const calculateCost = async (data: CalculatorFormData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/calculate-cost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration_seconds: data.seconds,
          show_id: data.showId,
          selected_date: data.selectedDate,
          selected_time: data.selectedTime
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        setCalculatedCost(result.cost)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка расчета стоимости')
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка расчета стоимости')
      setCalculatedCost(null)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: CalculatorFormData) => {
    await calculateCost(data)
  }

  const selectedShow = shows.find(show => show.id === watchedShowId)

  return (
    <Layout role="customer">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-3">
          <CalculatorIcon className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Калькулятор стоимости рекламы
            </h1>
            <p className="text-secondary-600">
              Рассчитайте стоимость размещения рекламы в наших шоу
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calculator Form */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Параметры рекламы
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="selectedDate" className="block text-sm font-medium text-secondary-700 mb-1">
                  Дата показа рекламы <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('selectedDate', { required: 'Выберите дату' })}
                  type="date"
                  id="selectedDate"
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                {errors.selectedDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.selectedDate.message}</p>
                )}
                <p className="mt-1 text-xs text-secondary-500">
                  Выберите дату, когда вы хотите показать рекламу
                </p>
              </div>

              <div>
                <label htmlFor="selectedTime" className="block text-sm font-medium text-secondary-700 mb-1">
                  Время показа (опционально)
                </label>
                <input
                  {...register('selectedTime')}
                  type="time"
                  id="selectedTime"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="mt-1 text-xs text-secondary-500">
                  Укажите желаемое время показа (если важно)
                </p>
              </div>

              <div>
                <label htmlFor="showId" className="block text-sm font-medium text-secondary-700 mb-1">
                  Выберите шоу <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('showId', { required: 'Выберите шоу' })}
                  id="showId"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  disabled={!watchedDate || showsLoading}
                >
                  <option value="">
                    {!watchedDate ? 'Сначала выберите дату' : 'Выберите шоу...'}
                  </option>
                  {availableShows.map((show) => (
                    <option key={show.id} value={show.id}>
                      {show.name} ({show.time_slot}) - {show.base_price_per_min} ₽/мин
                    </option>
                  ))}
                </select>
                {errors.showId && (
                  <p className="mt-1 text-sm text-red-600">{errors.showId.message}</p>
                )}
                {!watchedDate && (
                  <p className="mt-1 text-xs text-yellow-600">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    Выберите дату, чтобы увидеть доступные шоу
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="seconds" className="block text-sm font-medium text-secondary-700 mb-1">
                  Длительность рекламы (секунды)
                </label>
                <input
                  {...register('seconds', {
                    required: 'Укажите длительность',
                    min: { value: 5, message: 'Минимум 5 секунд' },
                    max: { value: 300, message: 'Максимум 300 секунд' },
                  })}
                  type="number"
                  id="seconds"
                  min="5"
                  max="300"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Введите длительность в секундах"
                />
                {errors.seconds && (
                  <p className="mt-1 text-sm text-red-600">{errors.seconds.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !watchedSeconds || !watchedShowId || !watchedDate}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? 'Расчет...' : 'Рассчитать стоимость'}
              </button>
            </form>
          </div>

          {/* Cost Display */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Результат расчета
            </h2>

            {calculatedCost !== null ? (
              <div className="text-center space-y-4">
                <div className="bg-primary-50 rounded-lg p-6">
                  <CurrencyDollarIcon className="h-12 w-12 text-primary-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-primary-600">
                    {calculatedCost.toLocaleString('ru-RU')} ₽
                  </div>
                  <p className="text-sm text-secondary-600 mt-2">
                    Стоимость рекламы
                  </p>
                </div>

                {selectedShow && (
                  <div className="bg-secondary-50 rounded-lg p-4 text-left">
                    <h3 className="font-medium text-secondary-900 mb-2">
                      Детали расчета:
                    </h3>
                    <div className="space-y-1 text-sm text-secondary-600">
                      <div className="flex justify-between">
                        <span>Шоу:</span>
                        <span className="font-medium">{selectedShow.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Время:</span>
                        <span className="font-medium">{selectedShow.time_slot}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Дата показа:</span>
                        <span className="font-medium">
                          {watchedDate ? new Date(watchedDate).toLocaleDateString('ru-RU') : '—'}
                        </span>
                      </div>
                      {watchedTime && (
                        <div className="flex justify-between">
                          <span>Время показа:</span>
                          <span className="font-medium">{watchedTime}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Базовая цена:</span>
                        <span className="font-medium">{selectedShow.base_price_per_min} ₽/мин</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Длительность:</span>
                        <span className="font-medium">{watchedSeconds} сек</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Минуты:</span>
                        <span className="font-medium">{(watchedSeconds / 60).toFixed(2)} мин</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    // Navigate to application form with pre-filled data
                    const params = new URLSearchParams({
                      seconds: watchedSeconds.toString(),
                      showId: watchedShowId,
                      cost: calculatedCost.toString(),
                      date: watchedDate
                    })
                    if (watchedTime) {
                      params.append('time', watchedTime)
                    }
                    window.location.href = `/customer/application?${params.toString()}`
                  }}
                  className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                >
                  Подать заявку
                </button>
              </div>
            ) : (
              <div className="text-center text-secondary-500 py-8">
                <CalculatorIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Выберите параметры для расчета стоимости</p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Информация о расчете
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• <strong>Дата показа:</strong> Выберите конкретную дату, когда вы хотите показать рекламу</p>
            <p>• <strong>Время показа:</strong> Опционально укажите желаемое время для более точного расчета</p>
            <p>• <strong>Стоимость:</strong> Рассчитывается на основе базовой цены шоу, длительности и времени показа</p>
            <p>• <strong>Минимальная длительность:</strong> 5 секунд</p>
            <p>• <strong>Максимальная длительность:</strong> 300 секунд (5 минут)</p>
            <p>• Цены могут варьироваться в зависимости от времени показа и популярности шоу</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default CostCalculator
