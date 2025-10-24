import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/layout/Layout'
import Chat from '../../components/chat/Chat'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'

interface AppRow { id: string; agent_name?: string; agent_id?: string }

const CustomerChatPage: React.FC = () => {
  const router = useRouter()
  const { room } = router.query as { room?: string }
  const reduxRooms = useSelector((s: RootState) => s.chat.rooms)
  const [rooms, setRooms] = useState<any[]>([])
  const [filteredRooms, setFilteredRooms] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('active') // 'active' or 'all'
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [routerReady, setRouterReady] = useState(false)
  const roomsPerPage = 5

  // Helper to get status badge text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает агента'
      case 'in_progress': return 'В работе'
      case 'sent_to_commercial': return 'В ком. отделе'
      case 'approved': return 'Одобрена'
      case 'rejected': return 'Отклонена'
      default: return 'Неизвестно'
    }
  }

  // Helper to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'sent_to_commercial': return 'bg-purple-100 text-purple-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Wait for router to be ready
  useEffect(() => {
    if (router.isReady) {
      setRouterReady(true)
    }
  }, [router.isReady])

  // Fetch applications once on mount
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const resp = await (await fetch('/api/applications', { credentials: 'same-origin' })).json()
        const apps: any[] = resp || []

        const list = apps.map(a => {
          const rawId = a.id || ''
          const roomId = rawId.startsWith('application-') ? rawId : `application-${rawId}`
          const reduxRoom = reduxRooms.find(rr => rr.id === roomId)
          
          // Show agent name if assigned, otherwise "Ожидает агента"
          const agentDisplayName = a.agentName || a.agent_name || (a.agent_id ? 'Агент' : 'Ожидает агента')
          
          // Build subtitle with show name and cost if available
          const showInfo = a.show ? ` • ${a.show}` : ''
          const costInfo = a.cost ? ` • ${a.cost}₽` : ''
          
          return {
            id: roomId,
            name: agentDisplayName,
            subtitle: `#${(a.id || '').slice(-8)}${showInfo}${costInfo}`,
            unread: reduxRoom ? reduxRoom.unreadCount : 0,
            status: a.status,
            raw: a,
          }
        })

        setRooms(list)
      } catch (e) {
        console.error('Failed to load applications:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Apply filter
  useEffect(() => {
    let filtered: typeof rooms
    if (statusFilter === 'active') {
      // Show active chats: pending (waiting for agent) + in_progress (agent working) + sent_to_commercial (in commercial dept)
      filtered = rooms.filter(r => 
        r.status === 'pending' || r.status === 'in_progress' || r.status === 'sent_to_commercial'
      )
    } else {
      // Show all chats (including approved, rejected)
      filtered = rooms
    }
    
    // If current room is not in filtered list, add it to keep chat open
    if (room && !filtered.find(r => r.id === room)) {
      const currentRoom = rooms.find(r => r.id === room)
      if (currentRoom) {
        filtered = [currentRoom, ...filtered]
      }
    }
    
    setFilteredRooms(filtered)
    // Reset to first page when filter changes
    setCurrentPage(1)
  }, [rooms, statusFilter, room])

  // Calculate pagination
  const totalPages = Math.ceil(filteredRooms.length / roomsPerPage)
  const startIndex = (currentPage - 1) * roomsPerPage
  const endIndex = startIndex + roomsPerPage
  const paginatedRooms = filteredRooms.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      setPageInput('')
    }
  }

  return (
    <Layout role="customer">
      <div className="grid grid-cols-4 gap-6">
        <aside className="col-span-1 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Мои чаты</h3>
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-800 text-xs font-medium">
              {filteredRooms.length}
            </span>
          </div>
          
          {/* Filter */}
          <div className="mb-4">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="active">
                Активные чаты ({rooms.filter(r => r.status === 'pending' || r.status === 'in_progress' || r.status === 'sent_to_commercial').length})
              </option>
              <option value="all">Все чаты ({rooms.length})</option>
            </select>
          </div>

          {filteredRooms.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">
                {statusFilter === 'active' ? 'Нет активных чатов' : 'Нет чатов'}
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            {paginatedRooms.map(r => {
              const roomIdStr = r.id
              const unread = r.unread || 0
              const title = r.name || 'Агент'
              return (
                <div key={roomIdStr} className={`w-full p-2 rounded ${room === roomIdStr ? 'bg-primary-50' : ''}`}>
                  <button onClick={() => router.push(`/customer/chat?room=${encodeURIComponent(roomIdStr)}`)} className="w-full text-left">
                    <div className="flex justify-between items-center">
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                <span>Страница {currentPage} из {totalPages}</span>
                <span>{filteredRooms.length} чатов</span>
              </div>
              
              {/* Page numbers */}
              <div className="flex items-center justify-center gap-1 mb-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={i}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded ${
                        currentPage === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>

              {/* Quick page jump */}
              {totalPages > 5 && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-gray-600">Перейти на страницу:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handlePageInputSubmit()}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="№"
                  />
                  <button
                    onClick={handlePageInputSubmit}
                    className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>
        <main className="col-span-3">
          <div className="h-[70vh] card">
            {
              (() => {
                // Show loading state while data is being fetched OR router is not ready
                if (loading || !routerReady) {
                  return (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Загрузка чатов...</p>
                      </div>
                    </div>
                  )
                }
                
                const selected = filteredRooms.find(r => r.id === (room as string))
                
                // If room is specified in URL but not found yet, try to render anyway
                if (room && !selected) {
                  // Try to find in all rooms (not just filtered)
                  const roomInAll = rooms.find(r => r.id === (room as string))
                  if (roomInAll) {
                    // Room exists but filtered out, still show it
                    return (
                      <Chat
                        roomId={room as string}
                        roomName={roomInAll.name}
                        subtitle={roomInAll.subtitle}
                        showApplicationInfo={true}
                        applicationId={roomInAll.id?.replace('application-', '')}
                      />
                    )
                  }
                  // Room not found at all, show placeholder
                  return (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="text-gray-400 mb-2">
                          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="text-gray-500">Выберите чат для начала общения</p>
                      </div>
                    </div>
                  )
                }
                
                // If no room selected, show placeholder
                if (!room) {
                  return (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="text-gray-400 mb-2">
                          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="text-gray-500">Выберите чат для начала общения</p>
                      </div>
                    </div>
                  )
                }
                
                // If application is still pending (waiting for agent), show info message
                if (selected.status === 'pending') {
                  return (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center max-w-md p-6">
                        <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Ожидание агента
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Ваша заявка ожидает рассмотрения агентом. Чат станет доступен после того, как агент возьмет вашу заявку в работу.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                          <p className="text-sm text-blue-900 font-medium mb-2">Детали заявки:</p>
                          <p className="text-sm text-blue-800">{selected.subtitle}</p>
                        </div>
                      </div>
                    </div>
                  )
                }
                
                const name = selected ? selected.name : 'Чат с агентом'
                const subtitle = selected ? selected.subtitle : ''
                const roomIdToUse = (room as string) || 'customer-agent'
                
                return <Chat roomId={roomIdToUse} roomName={name} subtitle={subtitle} />
              })()
            }
          </div>
        </main>
      </div>
    </Layout>
  )
}

export default CustomerChatPage

