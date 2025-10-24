import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'
import Layout from '../../components/layout/Layout'
import { adAPI } from '../../utils/api'
import toast from 'react-hot-toast'
import { useRouter } from 'next/router'
import { ChatBubbleLeftRightIcon, PencilIcon } from '@heroicons/react/24/outline'

const AgentApplicationsPage: React.FC = () => {
  const router = useRouter()
  const { user } = useSelector((state: RootState) => state.auth)
  const [applications, setApplications] = useState<any[]>([])
  const [filteredApplications, setFilteredApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [editingApp, setEditingApp] = useState<any>(null)
  const [shows, setShows] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [editForm, setEditForm] = useState({ 
    description: '', 
    contact_phone: '', 
    duration_seconds: 0,
    show_id: '',
    scheduled_at: '',
    cost: 0
  })

  useEffect(() => {
    if (user) loadApplications()
  }, [user])

  useEffect(() => {
    // Apply status filter
    if (statusFilter === 'all') {
      setFilteredApplications(applications)
    } else {
      setFilteredApplications(applications.filter(app => app.status === statusFilter))
    }
    setCurrentPage(1) // Reset to page 1 when filter changes
  }, [statusFilter, applications])

  const loadApplications = async () => {
    setLoading(true)
    try {
      // Request all applications (server will return combined workflow rows). Passing agentId can filter too aggressively in some setups.
      const response = await adAPI.getApplications()
      setApplications(response.data)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка загрузки заявок')
    } finally {
      setLoading(false)
    }
  }

  const openChat = (applicationId: string) => {
    // use a room name including application id so both sides can join
    const roomId = `application-${applicationId}`
    router.push(`/agent/chat?room=${encodeURIComponent(roomId)}`)
  }

  const takeInWork = async (applicationId: string) => {
    if (!confirm('Взять эту заявку в работу?')) return
    try {
      await adAPI.updateApplication(applicationId, { take: true })
      toast.success('Заявка взята в работу')
      await loadApplications()
      router.push(`/agent/chat?room=${encodeURIComponent(`application-${applicationId}`)}`)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Не удалось взять заявку')
    }
  }

  const openEditModal = async (app: any) => {
    setEditingApp(app)
    
    // Load shows for dropdown
    try {
      const resp = await fetch('/api/shows', { credentials: 'same-origin' })
      const showsData = await resp.json()
      setShows(showsData)
    } catch (e) {
      console.error('Failed to load shows', e)
    }
    
    setEditForm({
      description: app.description || '',
      contact_phone: app.contactPhone || app.contact_phone || '',
      duration_seconds: app.duration || app.duration_seconds || 0,
      show_id: app.showId || app.show_id || '',
      scheduled_at: app.date || app.scheduled_at || '',
      cost: app.cost || 0
    })
  }

  const saveEdit = async () => {
    if (!editingApp) return
    try {
      await adAPI.updateApplication(editingApp.id, editForm)
      toast.success('Заявка обновлена')
      setEditingApp(null)
      await loadApplications()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Не удалось обновить заявку')
    }
  }

  const getStatusText = (status: string) => {
    const statuses: { [key: string]: string } = {
      pending: 'В ожидании',
      in_progress: 'В работе',
      sent_to_commercial: 'В ком. отделе',
      approved: 'Одобрена',
      rejected: 'Отклонена'
    }
    return statuses[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      sent_to_commercial: 'bg-purple-100 text-purple-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-secondary-100 text-secondary-800'
  }

  // Pagination helpers
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentApplications = filteredApplications.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleQuickJump = (e: React.FormEvent) => {
    e.preventDefault()
    const page = parseInt(pageInput)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      setPageInput('')
    }
  }

  return (
    <Layout role="agent">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-secondary-900">Заявки клиентов</h1>
          <div className="flex space-x-2">
            {/* Items per page selector */}
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="px-3 py-2 border rounded-md bg-white"
            >
              <option value={10}>10 заявок</option>
              <option value={25}>25 заявок</option>
              <option value={50}>50 заявок</option>
              <option value={100}>100 заявок</option>
            </select>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-white"
            >
              <option value="all">Все статусы</option>
              <option value="pending">В ожидании</option>
              <option value="in_progress">В работе</option>
              <option value="sent_to_commercial">В ком. отделе</option>
              <option value="approved">Одобрена</option>
              <option value="rejected">Отклонена</option>
            </select>
            <input
              type="text"
              placeholder="Поиск по ID заявки..."
              className="px-3 py-2 border rounded-md"
              onChange={(e) => {
                const query = e.target.value.toLowerCase()
                if (!query) {
                  if (statusFilter === 'all') {
                    setFilteredApplications(applications)
                  } else {
                    setFilteredApplications(applications.filter(app => app.status === statusFilter))
                  }
                  setCurrentPage(1)
                  return
                }
                const baseList = statusFilter === 'all' ? applications : applications.filter(app => app.status === statusFilter)
                const filtered = baseList.filter(app => 
                  app.id.toLowerCase().includes(query)
                )
                setFilteredApplications(filtered)
                setCurrentPage(1)
              }}
            />
            <button onClick={loadApplications} className="px-4 py-2 bg-primary-600 text-white rounded-md">Обновить</button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center">Загрузка...</div>
        ) : filteredApplications.length === 0 ? (
          <div className="py-8 text-center">Нет заявок</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Клиент</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Шоу</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Дата</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Статус</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {currentApplications.map(app => (
                    <tr key={app.id} className="hover:bg-secondary-50">
                      <td className="px-6 py-4">#{app.id.slice(-8)}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{app.customer_name || app.customerName || '—'}</div>
                        <div className="text-sm text-secondary-500">{app.customer_email || app.customerEmail || ''}</div>
                      </td>
                      <td className="px-6 py-4">{app.show || app.show_name}</td>
                      <td className="px-6 py-4">{new Date(app.date || app.scheduled_at || app.created_at).toLocaleDateString('ru-RU')}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(app.status)}`}>
                          {getStatusText(app.status)}
                        </span>
                      </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button onClick={() => openChat(app.id)} className="text-primary-600 hover:text-primary-900" title="Чат с клиентом">
                                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                              </button>
                              {/* Show 'Take in work' if unassigned */}
                              {( (app.status === 'pending') && (!app.agentId && !app.agent_id) ) && (
                                <button onClick={() => takeInWork(app.id)} className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Взять в работу</button>
                              )}
                              {/* Show 'Edit' if assigned to this agent */}
                              {( (app.agentId === user?.id || app.agent_id === user?.id) ) && (
                                <button onClick={() => openEditModal(app)} className="text-secondary-600 hover:text-secondary-900" title="Редактировать">
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg p-4 border border-secondary-200">
                <div className="text-sm text-secondary-600">
                  Показано {startIndex + 1}-{Math.min(endIndex, filteredApplications.length)} из {filteredApplications.length} заявок
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-md bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>
                  
                  {totalPages <= 5 ? (
                    Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 rounded-md ${
                          currentPage === page
                            ? 'bg-primary-600 text-white'
                            : 'bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))
                  ) : (
                    <form onSubmit={handleQuickJump} className="flex items-center gap-2">
                      <span className="text-sm text-secondary-600">Страница</span>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        placeholder={currentPage.toString()}
                        className="w-16 px-2 py-1 border border-secondary-300 rounded-md text-center text-sm"
                      />
                      <span className="text-sm text-secondary-600">из {totalPages}</span>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                      >
                        →
                      </button>
                    </form>
                  )}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-md bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editingApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <h3 className="text-lg font-semibold mb-4">Редактировать заявку #{editingApp.id.slice(-8)}</h3>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Шоу</label>
                  <select
                    value={editForm.show_id}
                    onChange={e => setEditForm({ ...editForm, show_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Выберите шоу</option>
                    {shows.map(show => (
                      <option key={show.id} value={show.id}>{show.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Дата и время</label>
                  <input
                    type="datetime-local"
                    value={editForm.scheduled_at ? new Date(editForm.scheduled_at).toISOString().slice(0, 16) : ''}
                    onChange={e => setEditForm({ ...editForm, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Длительность (секунды)</label>
                  <input
                    type="number"
                    value={editForm.duration_seconds}
                    onChange={e => setEditForm({ ...editForm, duration_seconds: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Стоимость (₽)</label>
                  <input
                    type="number"
                    value={editForm.cost}
                    onChange={e => setEditForm({ ...editForm, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Контактный телефон</label>
                <input
                  type="text"
                  value={editForm.contact_phone}
                  onChange={e => setEditForm({ ...editForm, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Описание</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setEditingApp(null)}
                className="px-4 py-2 border rounded-md hover:bg-secondary-50"
              >
                Отмена
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default AgentApplicationsPage

