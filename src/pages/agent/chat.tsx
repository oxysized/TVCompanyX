import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/layout/Layout'
import Chat from '../../components/chat/Chat'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'
import socketService from '../../utils/socket'
import toast from 'react-hot-toast'

const AgentChatPage: React.FC = () => {
  const router = useRouter()
  const { room } = router.query as { room?: string }
  const reduxRooms = useSelector((s: RootState) => s.chat.rooms)
  const user = useSelector((s: RootState) => s.auth.user)
  const [rooms, setRooms] = useState<any[]>([])
  const [filteredRooms, setFilteredRooms] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [routerReady, setRouterReady] = useState(false)
  const [applicationData, setApplicationData] = useState<any>(null)
  const itemsPerPage = 5

  // Helper to get status text in Russian
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

        // Filter out only pending applications (no chat exists yet)
        // Keep in_progress, sent_to_commercial, approved, rejected for chat history
        const appsWithChats = apps.filter(a => a.status !== 'pending')

        // Build list of customer chats (by application)
        const customerChats = appsWithChats.map(a => {
          const rawId = a.id || ''
          const roomId = rawId.startsWith('application-') ? rawId : `application-${rawId}`
          const reduxRoom = reduxRooms.find(rr => rr.id === roomId)
          
          // Show customer name
          const customerDisplayName = a.customerName || a.customer_name || (reduxRoom && reduxRoom.name) || 'Клиент'
          
          // Build subtitle with show name and cost if available
          const showInfo = a.show || a.show_name ? ` • ${a.show || a.show_name}` : ''
          const costInfo = a.cost ? ` • ${a.cost}₽` : ''
          
          return {
            id: roomId,
            name: customerDisplayName,
            subtitle: `#${(a.id || '').slice(-8)}${showInfo}${costInfo}`,
            unread: reduxRoom ? reduxRoom.unreadCount : 0,
            status: a.status,
            raw: a,
          }
        })
        
        setRooms([...customerChats])
      } catch (e) {
        console.error('Failed to load applications:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Filter rooms by status
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredRooms(rooms)
    } else {
      const filtered = rooms.filter(r => r.status === statusFilter)
      
      // If current room is not in filtered list, add it to keep chat open
      if (room && !filtered.find(r => r.id === room)) {
        const currentRoom = rooms.find(r => r.id === room)
        if (currentRoom) {
          setFilteredRooms([currentRoom, ...filtered])
        } else {
          setFilteredRooms(filtered)
        }
      } else {
        setFilteredRooms(filtered)
      }
    }
    setCurrentPage(1) // Reset to page 1 when filter changes
  }, [rooms, statusFilter, room])

  // No need to auto-join commercial chats since they're not displayed

  // Get counts for each status
  const getStatusCount = (status: string) => {
    if (status === 'all') return rooms.length
    return rooms.filter(r => r.status === status).length
  }

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

  // If ?room= is provided, render single room with both chats; otherwise show default panels
  const selectedRoom = rooms.find(r => r.id === (room as string))
  const isCustomerChat = room && (room as string).startsWith('application-')
  
  // Extract application ID from room
  let appId = ''
  if (isCustomerChat) {
    appId = (room as string).replace('application-', '')
  }

  // Update applicationData when room changes or appId changes
  useEffect(() => {
    const loadData = async () => {
      if (appId) {
        try {
          console.log('[Agent Chat] Fetching fresh application data for:', appId)
          const response = await fetch(`/api/applications/${appId}`, {
            credentials: 'same-origin',
            headers: {
              'Cache-Control': 'no-cache'
            }
          })
          if (response.ok) {
            const data = await response.json()
            console.log('[Agent Chat] Loaded fresh application data:', data)
            console.log('[Agent Chat] commercial_id value:', data.commercial_id, 'type:', typeof data.commercial_id)
            setApplicationData(data)
          } else {
            console.error('[Agent Chat] Failed to load application, status:', response.status)
          }
        } catch (error) {
          console.error('[Agent Chat] Failed to load application:', error)
        }
      } else if (selectedRoom?.raw) {
        console.log('[Agent Chat] Setting application data from selectedRoom:', selectedRoom.raw)
        setApplicationData(selectedRoom.raw)
      }
    }
    
    loadData()
  }, [appId, selectedRoom])

  // Listen for application updates via socket
  useEffect(() => {
    if (!appId) return

    const handleApplicationUpdate = async (data: any) => {
      if (data.applicationId === appId) {
        // Reload full application data from server to get all fields
        try {
          const response = await fetch(`/api/applications/${appId}`, {
            credentials: 'same-origin',
            headers: {
              'Cache-Control': 'no-cache'
            }
          })
          if (response.ok) {
            const fullData = await response.json()
            
            // Force update by creating new object reference
            setApplicationData({ ...fullData })
            
            // Also update in rooms list
            setRooms(prevRooms => 
              prevRooms.map(r => 
                r.id === room ? { ...r, raw: fullData, status: fullData.status } : r
              )
            )
            
            // Show toast notification
            if (fullData.commercial_id && !applicationData?.commercial_id) {
              toast.success('Коммерческий отдел принял заявку в работу')
            }
          }
        } catch (error) {
          console.error('[Agent Chat] Failed to reload application after socket event:', error)
        }
      }
    }

    socketService.on('application:updated', handleApplicationUpdate)

    return () => {
      socketService.off('application:updated', handleApplicationUpdate)
    }
  }, [appId, room, applicationData])
  
  return (
    <Layout role="agent">
      <div className="grid grid-cols-4 gap-4" style={{height: 'calc(100vh - 100px)'}}>
        <aside className="col-span-1 bg-white rounded-lg shadow-sm p-3 flex flex-col h-full">
          <h3 className="font-semibold mb-2 text-sm">Чаты</h3>
          
          {/* Status filter */}
          <div className="mb-3 flex-shrink-0">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Все заявки ({getStatusCount('all')})</option>
              <option value="in_progress">В работе ({getStatusCount('in_progress')})</option>
              <option value="sent_to_commercial">В ком. отделе ({getStatusCount('sent_to_commercial')})</option>
              <option value="approved">Одобрена ({getStatusCount('approved')})</option>
              <option value="rejected">Отклонена ({getStatusCount('rejected')})</option>
            </select>
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto mb-3" style={{maxHeight: 'calc(100% - 150px)'}}>
            {filteredRooms.length === 0 ? (
              <div className="text-center py-8 text-secondary-500">
                <p className="text-sm">Нет заявок</p>
                {statusFilter !== 'all' && (
                  <p className="text-xs mt-2">Попробуйте другой фильтр</p>
                )}
              </div>
            ) : (
              currentRooms.map(r => {
                const roomIdStr = r.id
                const unread = r.unread || 0
                const title = r.name || 'Клиент'
                return (
                  <div key={roomIdStr} className={`w-full p-1.5 rounded ${room === roomIdStr ? 'bg-primary-50' : ''}`}>
                    <button onClick={() => router.push(`/agent/chat?room=${encodeURIComponent(roomIdStr)}`)} className="w-full text-left">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-xs font-medium">{title}</div>
                          <div className="text-xs text-secondary-500 mt-0.5">{r.subtitle}</div>
                          {r.status && (
                            <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
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
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-1.5 flex-shrink-0 border-t pt-2">
              <div className="text-xs text-secondary-600 text-center">
                {startIndex + 1}-{Math.min(endIndex, filteredRooms.length)} из {filteredRooms.length}
              </div>
              
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs rounded-md bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                
                {totalPages <= 5 ? (
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-2 py-1 text-xs rounded-md ${
                        currentPage === page
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))
                ) : (
                  <form onSubmit={handleQuickJump} className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      placeholder={currentPage.toString()}
                      className="w-12 px-1 py-1 border border-secondary-300 rounded-md text-center text-xs"
                    />
                    <span className="text-xs text-secondary-600">/{totalPages}</span>
                  </form>
                )}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs rounded-md bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </aside>
        <main className="col-span-3 bg-white rounded-lg shadow-sm p-3 h-full flex flex-col">
          {loading || !routerReady ? (
            // Show loading state while data loads OR router is not ready
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Загрузка чатов...</p>
              </div>
            </div>
          ) : isCustomerChat && room ? (
            // Show customer chat and commercial chat side by side
            <div className="grid grid-cols-2 gap-3 -m-3 h-full">
              {/* Customer Chat */}
              <div className="bg-white rounded-l-lg border-r flex flex-col h-full">
                <div className="border-b px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 flex-shrink-0">
                  <h3 className="font-semibold text-gray-900 text-sm">💬 Чат с клиентом</h3>
                  <p className="text-xs text-gray-600">
                    {selectedRoom ? `${selectedRoom.name} • ${selectedRoom.subtitle}` : 'Загрузка...'}
                  </p>
                </div>
                <div className="flex-1 overflow-hidden">
                  <Chat 
                    roomId={room as string} 
                    roomName={selectedRoom?.name || 'Клиент'} 
                    subtitle={selectedRoom?.subtitle || ''}
                    showApplicationInfo={true}
                    applicationId={appId}
                  />
                </div>
              </div>

              {/* Commercial Department Chat - Only when status is sent_to_commercial */}
              {applicationData && applicationData.status === 'sent_to_commercial' ? (
                <div className="bg-white rounded-r-lg flex flex-col h-full">
                  <div className="border-b px-3 py-2 bg-gradient-to-r from-purple-50 to-purple-100 flex-shrink-0">
                    <h3 className="font-semibold text-purple-900 flex items-center space-x-1.5 text-sm">
                      <span className="text-lg">🏢</span>
                      <span>Чат с ком. отделом</span>
                    </h3>
                    <p className="text-xs text-purple-700">
                      {applicationData.commercial_id 
                        ? `Принято в работу (ID: ${applicationData.commercial_id.slice(0, 8)}...)`
                        : 'Ожидает принятия коммерческим отделом'}
                    </p>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    {!applicationData.commercial_id ? (
                      // Waiting state
                      <div className="h-full flex flex-col items-center justify-center p-8">
                        <div className="text-6xl mb-4 animate-pulse">⏳</div>
                        <div className="text-center max-w-md">
                          <p className="text-gray-700 font-medium text-lg mb-2">Ожидает принятия в работу</p>
                          <p className="text-sm text-gray-600 mb-4">
                            Коммерческий отдел рассмотрит заявку и примет в работу. 
                            После этого чат станет активным и вы сможете обсудить детали.
                          </p>
                          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-50 rounded-full text-purple-700 text-sm">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Обновление в реальном времени</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Active chat
                      <Chat
                        roomId={`commercial-agent-${user?.id}-app-${appId}`}
                        roomName="Коммерческий отдел"
                        subtitle="Обсуждение деталей заявки"
                        showApplicationInfo={false}
                      />
                    )}
                  </div>
                </div>
              ) : (
                // Placeholder when no commercial chat needed
                <div className="bg-white rounded-r-lg flex items-center justify-center h-full">
                  <div className="text-center text-gray-400 max-w-md px-6">
                    <div className="text-6xl mb-4">📋</div>
                    <p className="text-lg font-medium text-gray-600 mb-2">
                      {applicationData?.status === 'in_progress' 
                        ? 'Работа с клиентом' 
                        : 'Коммерческий отдел не задействован'}
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      {applicationData?.status === 'in_progress' 
                        ? 'Заявка находится в работе. Чат с коммерческим отделом появится после отправки заявки в коммерческий отдел.' 
                        : 'Для работы с коммерческим отделом измените статус заявки на "В коммерческий отдел".'}
                    </p>
                    {applicationData?.status === 'in_progress' && (
                      <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-full text-blue-700 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Активная работа с клиентом</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Default view when no room selected
            <div className="h-[70vh] card">
              {
                (() => {
                  const name = selectedRoom ? selectedRoom.name : 'Чат с клиентами'
                  const subtitle = selectedRoom ? selectedRoom.subtitle : ''
                  const roomIdToUse = (room as string) || 'agent-customers'
                  return <Chat roomId={roomIdToUse} roomName={name} subtitle={subtitle} />
                })()
              }
            </div>
          )}
        </main>
      </div>
    </Layout>
  )
}

export default AgentChatPage

