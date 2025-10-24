import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import Layout from '../../components/layout/Layout'
import { reportAPI } from '../../utils/api'
import toast from 'react-hot-toast'
import { DocumentArrowDownIcon, CalendarIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

interface ReportFormData {
  clientEmail: string
  periodType: 'custom' | 'month' | 'quarter' | 'year'
  month?: number
  quarter?: number
  year: number
  startDate?: Date
  endDate?: Date
  format: 'pdf' | 'excel'
  includeCharts: boolean
}

interface Report {
  id: string
  name: string
  type: string
  createdAt: string
  status: 'generating' | 'ready' | 'error'
  downloadUrl?: string
}

const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([])
  const [generating, setGenerating] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReportFormData>({
    defaultValues: {
      clientEmail: '',
      periodType: 'month',
      month: new Date().getMonth() + 1,
      quarter: Math.floor(new Date().getMonth() / 3) + 1,
      year: new Date().getFullYear(),
      format: 'pdf',
      includeCharts: false,
    },
  })

  const watchedFormat = watch('format')
  const watchedPeriodType = watch('periodType')
  const watchedYear = watch('year')
  const watchedMonth = watch('month')
  const watchedQuarter = watch('quarter')

  const onSubmit = async (data: ReportFormData) => {
    setGenerating(true)
    try {
      // Calculate dates based on period type
      let startDate: Date
      let endDate: Date
      let reportName: string

      if (data.periodType === 'month' && data.month) {
        startDate = new Date(data.year, data.month - 1, 1)
        endDate = new Date(data.year, data.month, 0, 23, 59, 59)
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
        reportName = `Отчет за ${monthNames[data.month - 1]} ${data.year}`
      } else if (data.periodType === 'quarter' && data.quarter) {
        const quarterStartMonth = (data.quarter - 1) * 3
        startDate = new Date(data.year, quarterStartMonth, 1)
        endDate = new Date(data.year, quarterStartMonth + 3, 0, 23, 59, 59)
        reportName = `Отчет за ${data.quarter} квартал ${data.year}`
      } else if (data.periodType === 'year') {
        startDate = new Date(data.year, 0, 1)
        endDate = new Date(data.year, 11, 31, 23, 59, 59)
        reportName = `Годовой отчет за ${data.year}`
      } else {
        // custom period
        if (!data.startDate || !data.endDate) {
          toast.error('Укажите даты периода')
          setGenerating(false)
          return
        }
        startDate = data.startDate
        endDate = data.endDate
        reportName = `Отчет за ${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`
      }

      const reportData = {
        clientEmail: data.clientEmail,
        periodType: data.periodType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        format: data.format,
        includeCharts: data.includeCharts,
      }

      const response = await reportAPI.generateReport('agent', reportData)
      
      // Add to reports list
      const newReport: Report = {
        id: response.data.id,
        name: reportName,
        type: 'agent',
        createdAt: new Date().toISOString(),
        status: 'ready', // Mark as ready immediately since we generate on demand
        downloadUrl: `/api/reports/download/${response.data.id}?format=${data.format}&clientEmail=${encodeURIComponent(data.clientEmail)}&startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`
      }
      
      setReports(prev => [newReport, ...prev])
      toast.success('Отчет готов к скачиванию')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка генерации отчета')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (report: Report) => {
    if (!report.downloadUrl) {
      toast.error('URL для скачивания не найден')
      return
    }

    try {
      // Open PDF report in new tab for printing
      window.open(report.downloadUrl, '_blank')
      toast.success('Отчет открыт в новой вкладке. Используйте Ctrl+P для печати/сохранения в PDF')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка загрузки отчета')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      generating: { color: 'bg-yellow-100 text-yellow-800', text: 'Генерируется' },
      ready: { color: 'bg-green-100 text-green-800', text: 'Готов' },
      error: { color: 'bg-red-100 text-red-800', text: 'Ошибка' },
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    )
  }

  return (
    <Layout role="agent">
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <DocumentArrowDownIcon className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Отчеты для клиентов
            </h1>
            <p className="text-secondary-600">
              Генерация и управление отчетами
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Report Generation Form */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Создать отчет
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Client Email */}
              <div>
                <label htmlFor="clientEmail" className="block text-sm font-medium text-secondary-700 mb-1">
                  Email клиента
                </label>
                <input
                  {...register('clientEmail', { 
                    required: 'Введите email клиента',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Неверный формат email'
                    }
                  })}
                  type="email"
                  id="clientEmail"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="client@example.com"
                />
                {errors.clientEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.clientEmail.message}</p>
                )}
              </div>

              {/* Period Type */}
              <div>
                <label htmlFor="periodType" className="block text-sm font-medium text-secondary-700 mb-1">
                  Тип периода
                </label>
                <select
                  {...register('periodType', { required: 'Выберите тип периода' })}
                  id="periodType"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="month">Месяц</option>
                  <option value="quarter">Квартал</option>
                  <option value="year">Год</option>
                  <option value="custom">Произвольный период</option>
                </select>
              </div>

              {/* Year selector (shown for all types) */}
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-secondary-700 mb-1">
                  Год
                </label>
                <select
                  {...register('year', { required: 'Выберите год' })}
                  id="year"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Month selector (shown only for month type) */}
              {watchedPeriodType === 'month' && (
                <div>
                  <label htmlFor="month" className="block text-sm font-medium text-secondary-700 mb-1">
                    Месяц
                  </label>
                  <select
                    {...register('month', { required: 'Выберите месяц' })}
                    id="month"
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value={1}>Январь</option>
                    <option value={2}>Февраль</option>
                    <option value={3}>Март</option>
                    <option value={4}>Апрель</option>
                    <option value={5}>Май</option>
                    <option value={6}>Июнь</option>
                    <option value={7}>Июль</option>
                    <option value={8}>Август</option>
                    <option value={9}>Сентябрь</option>
                    <option value={10}>Октябрь</option>
                    <option value={11}>Ноябрь</option>
                    <option value={12}>Декабрь</option>
                  </select>
                </div>
              )}

              {/* Quarter selector (shown only for quarter type) */}
              {watchedPeriodType === 'quarter' && (
                <div>
                  <label htmlFor="quarter" className="block text-sm font-medium text-secondary-700 mb-1">
                    Квартал
                  </label>
                  <select
                    {...register('quarter', { required: 'Выберите квартал' })}
                    id="quarter"
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value={1}>1 квартал (Январь - Март)</option>
                    <option value={2}>2 квартал (Апрель - Июнь)</option>
                    <option value={3}>3 квартал (Июль - Сентябрь)</option>
                    <option value={4}>4 квартал (Октябрь - Декабрь)</option>
                  </select>
                </div>
              )}

              {/* Custom date range (shown only for custom type) */}
              {watchedPeriodType === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-secondary-700 mb-1">
                      Дата начала
                    </label>
                    <DatePicker
                      selected={watch('startDate')}
                      onChange={(date) => setValue('startDate', date || undefined)}
                      dateFormat="dd.MM.yyyy"
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholderText="Выберите дату"
                    />
                  </div>

                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-secondary-700 mb-1">
                      Дата окончания
                    </label>
                    <DatePicker
                      selected={watch('endDate')}
                      onChange={(date) => setValue('endDate', date || undefined)}
                      dateFormat="dd.MM.yyyy"
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholderText="Выберите дату"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Формат отчета
                </label>
                <div className="flex items-center space-x-2">
                  <div className="px-3 py-2 bg-secondary-100 border border-secondary-300 rounded-md text-secondary-700">
                    PDF (откроется для печати)
                  </div>
                  <input type="hidden" {...register('format')} value="pdf" />
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {generating ? 'Генерация...' : 'Сгенерировать отчет'}
              </button>
            </form>
          </div>

          {/* Report Templates */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Шаблоны отчетов
            </h2>

            <div className="space-y-3">
              {[
                {
                  name: 'Месячный отчет',
                  description: 'Отчет по заявкам за текущий месяц',
                  icon: CalendarIcon,
                  action: () => {
                    const now = new Date()
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                    setValue('startDate', startOfMonth)
                    setValue('endDate', now)
                  },
                },
                {
                  name: 'Квартальный отчет',
                  description: 'Отчет по заявкам за текущий квартал',
                  icon: ChartBarIcon,
                  action: () => {
                    const now = new Date()
                    const quarter = Math.floor(now.getMonth() / 3)
                    const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1)
                    setValue('startDate', startOfQuarter)
                    setValue('endDate', now)
                  },
                },
                {
                  name: 'Годовой отчет',
                  description: 'Отчет по заявкам за текущий год',
                  icon: DocumentArrowDownIcon,
                  action: () => {
                    const now = new Date()
                    const startOfYear = new Date(now.getFullYear(), 0, 1)
                    setValue('startDate', startOfYear)
                    setValue('endDate', now)
                  },
                },
              ].map((template, index) => (
                <button
                  key={index}
                  onClick={template.action}
                  className="w-full flex items-center space-x-3 p-3 text-left border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors duration-200"
                >
                  <template.icon className="h-5 w-5 text-primary-600" />
                  <div>
                    <div className="text-sm font-medium text-secondary-900">
                      {template.name}
                    </div>
                    <div className="text-xs text-secondary-600">
                      {template.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generated Reports */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
          <div className="p-6 border-b border-secondary-200">
            <h3 className="text-lg font-semibold text-secondary-900">
              Сгенерированные отчеты
            </h3>
          </div>

          <div className="p-6">
            {reports.length === 0 ? (
              <div className="text-center py-8">
                <DocumentArrowDownIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  Отчеты не найдены
                </h3>
                <p className="text-secondary-600">
                  Создайте первый отчет для клиента
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Название
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Тип
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Статус
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
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                          {report.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          Отчет для клиента
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(report.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                          {new Date(report.createdAt).toLocaleString('ru-RU')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {report.status === 'ready' && (
                            <button
                              onClick={() => handleDownload(report)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              Скачать
                            </button>
                          )}
                          {report.status === 'generating' && (
                            <span className="text-secondary-500">Генерируется...</span>
                          )}
                          {report.status === 'error' && (
                            <span className="text-red-600">Ошибка</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Информация об отчетах
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• Отчеты содержат информацию о заявках, их статусах и стоимости</p>
            <p>• PDF отчеты включают графики и диаграммы для лучшей визуализации</p>
            <p>• Excel отчеты удобны для дальнейшего анализа данных</p>
            <p>• Генерация отчета может занять несколько минут</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ReportsPage
