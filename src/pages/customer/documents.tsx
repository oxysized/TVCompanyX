import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'
import Layout from '../../components/layout/Layout'
import toast from 'react-hot-toast'
import { DocumentTextIcon, EyeIcon, ArrowDownTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface Contract {
  id: string
  contract_number: string
  show_name: string
  scheduled_at: string
  duration_seconds: number
  cost: number
  customer_name: string
  customer_email: string
  customer_phone: string
  description: string
  company_name: string
  status: 'sent' | 'viewed' | 'downloaded'
  created_at: string
  viewed_at?: string
  downloaded_at?: string
  contract_date: string
}

const DocumentsPage: React.FC = () => {
  const user = useSelector((s: RootState) => s.auth.user)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadContracts()
    }
  }, [user?.id])

  const loadContracts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/contracts?customerId=${user?.id}`, {
        credentials: 'same-origin'
      })
      
      if (response.ok) {
        const data = await response.json()
        setContracts(data)
      } else {
        toast.error('Ошибка при загрузке договоров')
      }
    } catch (error) {
      console.error('Error loading contracts:', error)
      toast.error('Ошибка при загрузке договоров')
    } finally {
      setLoading(false)
    }
  }

  const handleViewContract = async (contract: Contract) => {
    setSelectedContract(contract)
    setShowDetailsModal(true)
    
    // Mark as viewed if not already
    if (contract.status === 'sent') {
      try {
        await fetch(`/api/contracts/${contract.id}`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'viewed',
            viewed_at: new Date().toISOString()
          })
        })
        
        // Update local state
        setContracts(prev => 
          prev.map(c => 
            c.id === contract.id 
              ? { ...c, status: 'viewed', viewed_at: new Date().toISOString() }
              : c
          )
        )
      } catch (error) {
        console.error('Error marking contract as viewed:', error)
      }
    }
  }

  const handleDownloadContract = async (contract: Contract) => {
    try {
      // Download PDF from API
      const response = await fetch(`/api/contracts/${contract.id}/download`, {
        method: 'GET',
        credentials: 'same-origin'
      })
      
      if (!response.ok) {
        throw new Error('Failed to download contract')
      }

      // Get the PDF blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Contract_${contract.contract_number}.pdf`
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      // Update local state (status updated by API)
      setContracts(prev => 
        prev.map(c => 
          c.id === contract.id 
            ? { ...c, status: 'downloaded', downloaded_at: new Date().toISOString() }
            : c
        )
      )
      
      toast.success(`Договор ${contract.contract_number} успешно загружен`)
      
    } catch (error) {
      console.error('Error downloading contract:', error)
      toast.error('Ошибка при загрузке договора')
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Отправлен</span>
      case 'viewed':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Просмотрен</span>
      case 'downloaded':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded flex items-center gap-1">
          <CheckCircleIcon className="h-3 w-3" />
          Загружен
        </span>
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">{status}</span>
    }
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            Мои документы
          </h1>
          <p className="mt-2 text-gray-600">
            Здесь вы можете просматривать и загружать ваши договоры
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Загрузка документов...</p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет документов</h3>
            <p className="text-gray-600">У вас пока нет договоров</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Номер договора
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Шоу
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата эфира
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Стоимость
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата создания
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contracts.map(contract => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-blue-500 mr-2" />
                        <span className="font-medium text-gray-900">{contract.contract_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{contract.show_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(contract.scheduled_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">{contract.cost.toLocaleString('ru-RU')} ₽</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(contract.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(contract.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewContract(contract)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Просмотреть"
                      >
                        <EyeIcon className="h-5 w-5 inline" />
                      </button>
                      <button
                        onClick={() => handleDownloadContract(contract)}
                        className="text-green-600 hover:text-green-900"
                        title="Скачать"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Contract Details Modal */}
        {showDetailsModal && selectedContract && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">
                  Договор {selectedContract.contract_number}
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:text-gray-200"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Детали договора</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Компания</p>
                      <p className="font-medium">{selectedContract.company_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Дата договора</p>
                      <p className="font-medium">{formatDate(selectedContract.contract_date)}</p>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Информация о заказчике</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Имя</p>
                      <p className="font-medium">{selectedContract.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{selectedContract.customer_email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Телефон</p>
                      <p className="font-medium">{selectedContract.customer_phone}</p>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Детали размещения</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Шоу</p>
                      <p className="font-medium">{selectedContract.show_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Дата и время эфира</p>
                      <p className="font-medium">{formatDateTime(selectedContract.scheduled_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Продолжительность</p>
                      <p className="font-medium">{formatDuration(selectedContract.duration_seconds)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Описание</p>
                      <p className="font-medium">{selectedContract.description || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Стоимость</h3>
                  <div className="text-3xl font-bold text-blue-600">
                    {selectedContract.cost.toLocaleString('ru-RU')} ₽
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Статус документа</h3>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(selectedContract.status)}
                    {selectedContract.viewed_at && (
                      <div className="text-sm text-gray-600">
                        Просмотрен: {formatDateTime(selectedContract.viewed_at)}
                      </div>
                    )}
                    {selectedContract.downloaded_at && (
                      <div className="text-sm text-gray-600">
                        Загружен: {formatDateTime(selectedContract.downloaded_at)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Закрыть
                  </button>
                  <button
                    onClick={() => handleDownloadContract(selectedContract)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Скачать договор
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default DocumentsPage
