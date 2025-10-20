import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import Layout from '../../components/layout/Layout'
import { reportAPI } from '../../utils/api'
import toast from 'react-hot-toast'
import { DocumentArrowDownIcon, CalendarIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

interface ReportFormData {
  clientId?: string
  startDate: Date
  endDate: Date
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
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      endDate: new Date(),
      format: 'pdf',
      includeCharts: true,
    },
  })

  const watchedFormat = watch('format')

  const onSubmit = async (data: ReportFormData) => {
    setGenerating(true)
    try {
      const reportData = {
        ...data,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
      }

      const response = await reportAPI.generateReport('client', reportData)
      
      // Add to reports list
      const newReport: Report = {
        id: response.data.id,
        name: `Отчет за ${data.startDate.toLocaleDateString('ru-RU')} - ${data.endDate.toLocaleDateString('ru-RU')}`,
        type: 'client',
        createdAt: new Date().toISOString(),
        status: 'generating',
      }
      
      setReports(prev => [newReport, ...prev])
      toast.success('Отчет поставлен в очередь на генерацию')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка генерации отчета')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (reportId: string) => {
    try {
      const response = await reportAPI.downloadReport(reportId)
      
      // Create blob and download
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `report_${reportId}.${watchedFormat}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Отчет загружен')
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
              <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-secondary-700 mb-1">
                  Клиент (опционально)
                </label>
                <input
                  {...register('clientId')}
                  type="text"
                  id="clientId"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="ID клиента или оставьте пустым для всех"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-secondary-700 mb-1">
                    Дата начала
                  </label>
                  <DatePicker
                    selected={watch('startDate')}
                    onChange={(date) => setValue('startDate', date || new Date())}
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
                    onChange={(date) => setValue('endDate', date || new Date())}
                    dateFormat="dd.MM.yyyy"
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholderText="Выберите дату"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="format" className="block text-sm font-medium text-secondary-700 mb-1">
                  Формат отчета
                </label>
                <select
                  {...register('format', { required: 'Выберите формат' })}
                  id="format"
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  {...register('includeCharts')}
                  type="checkbox"
                  id="includeCharts"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                />
                <label htmlFor="includeCharts" className="ml-2 block text-sm text-secondary-700">
                  Включить графики и диаграммы
                </label>
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
                              onClick={() => handleDownload(report.id)}
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
