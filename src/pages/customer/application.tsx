import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/router'
import Layout from '../../components/layout/Layout'
import { adAPI, showAPI } from '../../utils/api'
import toast from 'react-hot-toast'
import { DocumentTextIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

interface ApplicationFormData {
  showId: string
  duration: number
  date: Date
  timeSlot: string
  description?: string
  contactPhone?: string
}

interface Show {
  id: string
  name: string
  basePrice: number
  timeSlot: string
  availableSlots: string[]
}

const ApplicationForm: React.FC = () => {
  const router = useRouter()
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(false)
  const [showsLoading, setShowsLoading] = useState(true)
  const [selectedShow, setSelectedShow] = useState<Show | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ApplicationFormData>()

  const watchedShowId = watch('showId')
  const watchedDate = watch('date')

  useEffect(() => {
    // Load shows
    const loadShows = async () => {
      try {
        const response = await showAPI.getShows()
        setShows(response.data)
      } catch (error) {
        toast.error('Ошибка загрузки списка шоу')
      } finally {
        setShowsLoading(false)
      }
    }

    loadShows()
  }, [])

  useEffect(() => {
    // Set pre-filled values from URL params
    const { seconds, showId, cost } = router.query
    if (seconds) setValue('duration', Number(seconds))
    if (showId) setValue('showId', showId as string)
  }, [router.query, setValue])

  useEffect(() => {
    // Update selected show when showId changes
    if (watchedShowId) {
      const show = shows.find(s => s.id === watchedShowId)
      setSelectedShow(show || null)
    } else {
      setSelectedShow(null)
    }
  }, [watchedShowId, shows])

  const onSubmit = async (data: ApplicationFormData) => {
    setLoading(true)
    try {
      const applicationData = {
        ...data,
        date: data.date.toISOString(),
        estimatedCost: selectedShow ? (selectedShow.basePrice * data.duration / 60) : 0,
      }

      await adAPI.createApplication(applicationData)
      toast.success('Заявка успешно подана!')
      router.push('/customer/history')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка подачи заявки')
    } finally {
      setLoading(false)
    }
  }

  const minDate = new Date()
  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + 3) // 3 months ahead

  return (
    <Layout role="customer">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-3">
          <DocumentTextIcon className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Подача заявки на рекламу
            </h1>
            <p className="text-secondary-600">
              Заполните форму для создания новой заявки
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="showId" className="block text-sm font-medium text-secondary-700 mb-1">
                  Выберите шоу *
                </label>
                <select
                  {...register('showId', { required: 'Выберите шоу' })}
                  id="showId"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  disabled={showsLoading}
                >
                  <option value="">Выберите шоу...</option>
                  {shows.map((show) => (
                    <option key={show.id} value={show.id}>
                      {show.name} ({show.timeSlot})
                    </option>
                  ))}
                </select>
                {errors.showId && (
                  <p className="mt-1 text-sm text-red-600">{errors.showId.message}</p>
                )}
                {showsLoading && (
                  <p className="mt-1 text-sm text-secondary-500">Загрузка шоу...</p>
                )}
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-secondary-700 mb-1">
                  Длительность рекламы (секунды) *
                </label>
                <input
                  {...register('duration', {
                    required: 'Укажите длительность',
                    min: { value: 5, message: 'Минимум 5 секунд' },
                    max: { value: 300, message: 'Максимум 300 секунд' },
                  })}
                  type="number"
                  id="duration"
                  min="5"
                  max="300"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Введите длительность"
                />
                {errors.duration && (
                  <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-secondary-700 mb-1">
                  Дата показа *
                </label>
                <DatePicker
                  selected={watchedDate}
                  onChange={(date) => setValue('date', date || new Date())}
                  minDate={minDate}
                  maxDate={maxDate}
                  dateFormat="dd.MM.yyyy"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholderText="Выберите дату"
                  showPopperArrow={false}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="timeSlot" className="block text-sm font-medium text-secondary-700 mb-1">
                  Предпочтительное время
                </label>
                <select
                  {...register('timeSlot')}
                  id="timeSlot"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Любое время</option>
                  {selectedShow?.availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-secondary-700 mb-1">
                Контактный телефон
              </label>
              <input
                {...register('contactPhone', {
                  pattern: {
                    value: /^[\+]?[1-9][\d]{0,15}$/,
                    message: 'Неверный формат телефона',
                  },
                })}
                type="tel"
                id="contactPhone"
                className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="+7 (999) 123-45-67"
              />
              {errors.contactPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.contactPhone.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-1">
                Дополнительная информация
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={4}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Опишите особенности вашей рекламы, требования к размещению и т.д."
              />
            </div>

            {/* Cost Estimation */}
            {selectedShow && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-primary-900 mb-2">
                  Предварительная стоимость
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-primary-700">Шоу:</span>
                    <span className="ml-2 font-medium">{selectedShow.name}</span>
                  </div>
                  <div>
                    <span className="text-primary-700">Базовая цена:</span>
                    <span className="ml-2 font-medium">{selectedShow.basePrice} ₽/мин</span>
                  </div>
                  <div>
                    <span className="text-primary-700">Примерная стоимость:</span>
                    <span className="ml-2 font-medium text-lg">
                      {((selectedShow.basePrice * (watch('duration') || 0)) / 60).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-secondary-300 rounded-md text-secondary-700 hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? 'Отправка...' : 'Подать заявку'}
              </button>
            </div>
          </form>
        </div>

        {/* Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Информация о заявке
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• После подачи заявки она будет рассмотрена нашим коммерческим отделом</p>
            <p>• Обычно рассмотрение занимает 1-2 рабочих дня</p>
            <p>• Вы получите уведомление о статусе заявки по email</p>
            <p>• Окончательная стоимость может отличаться от предварительной</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ApplicationForm
