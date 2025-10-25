import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/layout/Layout'
import Chat from '../../components/chat/Chat'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'
import { EyeIcon, PencilIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const CommercialChatPage = () => {
  const router = useRouter()
  const { room } = router.query as { room?: string }
  const reduxRooms = useSelector((s: RootState) => s.chat.rooms)
  const user = useSelector((s: RootState) => s.auth.user)
  const [rooms, setRooms] = useState<any[]>([])
  const [filteredRooms, setFilteredRooms] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [applicationData, setApplicationData] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [shows, setShows] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState('')
  const itemsPerPage = 7

  // Helper to get status text in Russian
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает агента'
      case 'approved': return 'Одобрена'
      case 'rejected': return 'Отклонена'
      case 'sent_to_commercial': return 'В обработке'
      default: return 'Неизвестно'
    }
  }

  // Helper to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'sent_to_commercial': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  useEffect(() => {
    // Fetch applications to build commercial rooms list
    ;(async () => {
      try {
        const resp = await (await fetch('/api/applications', { credentials: 'same-origin' })).json()
        const apps: any[] = resp || []

        // Filter applications that were sent to commercial (including approved ones)
        // Show: sent_to_commercial (pending) and approved (processed)
        const commercialApps = apps.filter(a => 
          (a.status === 'sent_to_commercial' || a.status === 'approved') && a.agent_id
        )

        // Build list of agent chats (commercial-agent-{agentId}-app-{appId})
        const agentChats = commercialApps.map(a => {
          const roomId = `commercial-agent-${a.agent_id}-app-${a.id}`
          const reduxRoom = reduxRooms.find(rr => rr.id === roomId)
          
          return {
            id: roomId,
            name: a.agent_name || a.agent_first_name || 'Агент',
            subtitle: `#${a.id.slice(-8)} • ${a.show_name || a.show || ''} • ${(a.cost || 0).toLocaleString('ru-RU')} ₽`,
            unread: reduxRoom ? reduxRoom.unreadCount : 0,
            status: a.status,
            raw: a,
          }
        })

        // DON'T merge with Redux rooms - only show rooms that have actual application data
        // This prevents showing empty "Агент" chats after application is approved/rejected

        setRooms(agentChats)
      } catch (e) {
        // fallback to empty array if API fails
        setRooms([])
      }
    })()
  }, [reduxRooms])

  // Filter rooms by status
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredRooms(rooms)
    } else {
      setFilteredRooms(rooms.filter(r => r.status === statusFilter))
    }
    setCurrentPage(1) // Reset to page 1 when filter changes
  }, [rooms, statusFilter])

  // Pagination helpers
  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentRooms = filteredRooms.slice(startIndex, endIndex)

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

  // Get counts for each status
  const getStatusCount = (status: string) => {
    if (status === 'all') return rooms.length
    return rooms.filter(r => r.status === status).length
  }

  // Load shows for edit dropdown
  useEffect(() => {
    ;(async () => {
      try {
        const resp = await fetch('/api/shows', { credentials: 'same-origin' })
        if (resp.ok) {
          const data = await resp.json()
          setShows(data || [])
        }
      } catch (e) {
        console.error('Failed to load shows:', e)
      }
    })()
  }, [])

  // Load application data when room changes
  useEffect(() => {
    const loadApplicationData = async () => {
      if (!room) {
        setApplicationData(null)
        return
      }

      // Extract appId from commercial room format: commercial-agent-{agentId}-app-{appId}
      const appIdMatch = (room as string).match(/app-(.+)$/)
      if (!appIdMatch) return
      
      const appId = appIdMatch[1]
      
      setLoading(true)
      try {
        const response = await fetch(`/api/applications/${appId}`, {
          credentials: 'same-origin',
          headers: { 'Cache-Control': 'no-cache' }
        })
        
        if (response.ok) {
          const data = await response.json()
          setApplicationData(data)
        }
      } catch (error) {
        console.error('Failed to load application data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadApplicationData()
  }, [room])

  // Handle view details
  const handleViewDetails = () => {
    if (!applicationData) return
    setShowDetailsModal(true)
  }

  // Handle edit
  const handleEdit = () => {
    if (!applicationData) return
    setEditFormData({
      description: applicationData.description || '',
      contact_phone: applicationData.contact_phone || '',
      cost: applicationData.cost || 0,
      duration_seconds: applicationData.duration_seconds || 0,
      show_id: applicationData.show_id || '',
      scheduled_at: applicationData.scheduled_at || ''
    })
    setShowEditModal(true)
  }

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!applicationData?.id) return
    
    try {
      const response = await fetch(`/api/applications/${applicationData.id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      })
      
      if (response.ok) {
        const updatedApp = await response.json()
        setApplicationData(updatedApp)
        setRooms(prevRooms => 
          prevRooms.map(r => 
            r.raw?.id === updatedApp.id ? { ...r, raw: updatedApp } : r
          )
        )
        setShowEditModal(false)
        toast.success('Заявка обновлена')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Ошибка при обновлении заявки')
      }
    } catch (error) {
      toast.error('Ошибка при обновлении заявки')
    }
  }

  // Handle approve application
  const handleApprove = async () => {
    if (!applicationData?.id) return
    
    if (!confirm('Вы уверены, что хотите одобрить эту заявку?')) return
    
    setApproving(true)
    try {
      const response = await fetch(`/api/applications/${applicationData.id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      })
      
      if (response.ok) {
        toast.success('Заявка одобрена')
        const updatedApp = await response.json()
        setApplicationData(updatedApp)
        setRooms(prevRooms => 
          prevRooms.map(r => 
            r.raw?.id === updatedApp.id ? { ...r, raw: updatedApp, status: updatedApp.status } : r
          )
        )
      } else {
        const error = await response.json()
        toast.error(error.message || 'Ошибка при одобрении заявки')
      }
    } catch (error) {
      toast.error('Ошибка при одобрении заявки')
    } finally {
      setApproving(false)
    }
  }

  // Handle reject application
  const handleReject = async () => {
    if (!applicationData?.id) return
    
    if (!confirm('Вы уверены, что хотите отклонить эту заявку?')) return
    
    setRejecting(true)
    try {
      const response = await fetch(`/api/applications/${applicationData.id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      })
      
      if (response.ok) {
        toast.success('Заявка отклонена')
        const updatedApp = await response.json()
        setApplicationData(updatedApp)
        setRooms(prevRooms => 
          prevRooms.map(r => 
            r.raw?.id === updatedApp.id ? { ...r, raw: updatedApp, status: updatedApp.status } : r
          )
        )
      } else {
        const error = await response.json()
        toast.error(error.message || 'Ошибка при отклонении заявки')
      }
    } catch (error) {
      toast.error('Ошибка при отклонении заявки')
    } finally {
      setRejecting(false)
    }
  }

  // Auto-join commercial chat rooms via Socket.IO for real-time updates
  useEffect(() => {
    if (!user?.id) return
    
    const socketService = require('../../utils/socket').default
    
    // Join all commercial chats
    rooms.forEach(room => {
      if (room.id.startsWith('commercial-agent-')) {
        console.log('[Commercial Chat] Auto-joining commercial room:', room.id)
        socketService.joinRoom(room.id)
      }
    })
    
    // Cleanup
    return () => {
      rooms.forEach(room => {
        if (room.id.startsWith('commercial-agent-')) {
          socketService.leaveRoom(room.id)
        }
      })
    }
  }, [rooms, user?.id])

  // If ?room= is provided, use it directly (commercial chats already have correct format)
  const selectedRoom = rooms.find(r => r.id === (room as string))
  
  // For commercial department, room parameter should already be in format: commercial-agent-{agentId}-app-{appId}
  // We just use it directly, no need to reconstruct
  const commercialRoomId = room as string || ''
  console.log('[Commercial Chat] Current room:', commercialRoomId, 'Selected:', selectedRoom)
  
  return (
    <Layout role="commercial">
      <div className="grid grid-cols-4 gap-6">
        <aside className="col-span-1 bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-semibold mb-3">💬 Чаты с агентами</h3>
          
          {/* Status filter */}
          <div className="mb-4">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Все заявки ({getStatusCount('all')})</option>
              <option value="sent_to_commercial">Отправлена ({getStatusCount('sent_to_commercial')})</option>
              <option value="approved">Одобрена ({getStatusCount('approved')})</option>
            </select>
          </div>

          <div className="space-y-2">
            {currentRooms.map(r => {
                const roomIdStr = r.id
                const unread = r.unread || 0
                const title = r.name || 'Агент'
                return (
                  <div key={roomIdStr} className={`w-full p-2 rounded ${room === roomIdStr ? 'bg-primary-50' : ''}`}>
                    <button onClick={() => router.push(`/commercial/chat?room=${encodeURIComponent(roomIdStr)}`)} className="w-full text-left">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{title}</div>
                          <div className="text-xs text-secondary-500 mt-1">{r.subtitle}</div>
                          {r.status && (
                            <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                              {getStatusText(r.status)}
                            </span>
                          )}
                        </div>
                        <div>
                          {unread > 0 && (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white text-xs">{unread}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                )
              })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                <span className="text-xs text-gray-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
              {totalPages > 5 && (
                <form onSubmit={handleQuickJump} className="flex gap-1">
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    placeholder="№"
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    →
                  </button>
                </form>
              )}
            </div>
          )}
        </aside>
        <main className="col-span-3">
          {selectedRoom && commercialRoomId ? (
            // Show commercial chat with agent and action buttons
            <div className="h-[70vh] card flex flex-col">
              {/* Header with action buttons */}
              <div className="border-b px-4 py-3 bg-gradient-to-r from-purple-50 to-purple-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">💬 {selectedRoom.name || 'Агент'}</h3>
                    <p className="text-xs text-gray-600 truncate">{selectedRoom.subtitle || 'Чат с агентом'}</p>
                  </div>
                </div>
                
                {/* Action Buttons - show for sent_to_commercial status */}
                {applicationData && applicationData.status === 'sent_to_commercial' && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={handleViewDetails}
                      className="flex-1 px-3 py-2 bg-white text-blue-700 border border-blue-200 rounded text-xs font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                      title="Посмотреть детали"
                    >
                      <EyeIcon className="h-4 w-4" />
                      <span>Детали</span>
                    </button>
                    <button
                      onClick={handleEdit}
                      className="flex-1 px-3 py-2 bg-white text-green-700 border border-green-200 rounded text-xs font-medium hover:bg-green-50 transition-colors flex items-center justify-center gap-1"
                      title="Редактировать"
                    >
                      <PencilIcon className="h-4 w-4" />
                      <span>Изменить</span>
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={approving}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      title="Одобрить заявку"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>{approving ? 'Одобрение...' : 'Одобрить'}</span>
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={rejecting}
                      className="px-3 py-2 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      title="Отклонить заявку"
                    >
                      <XCircleIcon className="h-4 w-4" />
                      <span>{rejecting ? 'Отклонение...' : 'Отклонить'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Chat area */}
              <div className="flex-1 overflow-hidden">
                <Chat 
                  roomId={commercialRoomId} 
                  roomName={selectedRoom.name || 'Агент'} 
                  subtitle={selectedRoom.subtitle || 'Чат с агентом'}
                />
              </div>
            </div>
          ) : (
            // Default view when no room selected
            <div className="h-[70vh] card flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-xl font-semibold mb-2">💬 Выберите чат</p>
                <p className="text-sm">Выберите чат с агентом из списка слева</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Details Modal */}
      {showDetailsModal && applicationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Детали заявки</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID заявки</label>
                <p className="text-sm text-gray-900">#{applicationData.id.slice(-8)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Передача</label>
                <p className="text-sm text-gray-900">{applicationData.show_name || applicationData.show || 'Не указано'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Дата показа</label>
                <p className="text-sm text-gray-900">
                  {applicationData.scheduled_at ? new Date(applicationData.scheduled_at).toLocaleString('ru-RU') : 'Не указано'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Длительность</label>
                <p className="text-sm text-gray-900">{applicationData.duration_seconds || 0} сек</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Телефон</label>
                <p className="text-sm text-gray-900">{applicationData.contact_phone || 'Не указано'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Стоимость</label>
                <p className="text-sm text-gray-900">{(applicationData.cost || 0).toLocaleString('ru-RU')} ₽</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Описание</label>
                <p className="text-sm text-gray-900">{applicationData.description || 'Нет описания'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Статус</label>
                <p className="text-sm text-gray-900">
                  {applicationData.status === 'pending' && 'Ожидает агента'}
                  {applicationData.status === 'in_progress' && 'В работе'}
                  {applicationData.status === 'sent_to_commercial' && 'Отправлена в коммерческий'}
                  {applicationData.status === 'approved' && 'Одобрена'}
                  {applicationData.status === 'rejected' && 'Отклонена'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && applicationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Редактировать заявку</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Передача</label>
                <select
                  value={editFormData.show_id || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, show_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Выберите передачу</option>
                  {shows.map(show => (
                    <option key={show.id} value={show.id}>{show.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата показа</label>
                <input
                  type="datetime-local"
                  value={editFormData.scheduled_at ? new Date(editFormData.scheduled_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditFormData({ ...editFormData, scheduled_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Длительность (секунд)</label>
                <input
                  type="number"
                  value={editFormData.duration_seconds || 0}
                  onChange={(e) => setEditFormData({ ...editFormData, duration_seconds: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                <input
                  type="tel"
                  value={editFormData.contact_phone || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Стоимость (₽)</label>
                <input
                  type="number"
                  value={editFormData.cost || 0}
                  onChange={(e) => setEditFormData({ ...editFormData, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea
                  value={editFormData.description || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
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

export default CommercialChatPage

