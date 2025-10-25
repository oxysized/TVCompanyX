import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/layout/Layout'
import Chat from '../../components/chat/Chat'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'
import socketService from '../../utils/socket'
import toast from 'react-hot-toast'
import { XMarkIcon, PaperAirplaneIcon, EyeIcon, PencilIcon, XCircleIcon } from '@heroicons/react/24/outline'

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
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState<any>({})
  const [sendingToCommercial, setSendingToCommercial] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [shows, setShows] = useState<any[]>([])
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
        // Load shows
        const showsResp = await fetch('/api/shows', { credentials: 'same-origin' })
        const showsData = await showsResp.json()
        setShows(showsData || [])

        const resp = await (await fetch('/api/applications', { credentials: 'same-origin' })).json()
        const apps: any[] = resp || []

        // Check and auto-reject expired applications
        const checkPromises = apps.map(app => checkAndRejectExpiredApplication(app))
        await Promise.all(checkPromises)
        
        // Reload applications after potential auto-rejections
        const updatedResp = await (await fetch('/api/applications', { credentials: 'same-origin' })).json()
        const updatedApps: any[] = updatedResp || []

        // Filter out only pending applications (no chat exists yet)
        // Keep in_progress, sent_to_commercial, approved, rejected for chat history
        const appsWithChats = updatedApps.filter(a => a.status !== 'pending')

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

  // Check if application date has passed and auto-reject
  const checkAndRejectExpiredApplication = async (app: any) => {
    if (!app || !app.scheduled_at) return false
    
    const scheduledDate = new Date(app.scheduled_at)
    const now = new Date()
    
    // Check if scheduled date is in the past
    if (scheduledDate < now && (app.status === 'pending' || app.status === 'in_progress')) {
      try {
        const response = await fetch(`/api/applications/${app.id}`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'rejected'
          })
        })
        
        if (response.ok) {
          toast.error(`Заявка #${app.id.slice(-8)} автоматически отклонена - дата показа прошла`)
          return true
        }
      } catch (error) {
        console.error('Failed to auto-reject expired application:', error)
      }
    }
    return false
  }

  // Handle send to commercial
  const handleSendToCommercial = async () => {
    if (!appId || !applicationData) return
    
    if (!confirm('Отправить заявку в коммерческий отдел?')) return
    
    setSendingToCommercial(true)
    try {
      const response = await fetch(`/api/applications/${appId}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'sent_to_commercial',
          createCommercialChat: true 
        })
      })
      
      if (response.ok) {
        toast.success('Заявка отправлена в коммерческий отдел')
        // Reload application data
        const updatedApp = await response.json()
        setApplicationData(updatedApp)
        // Update rooms list
        setRooms(prevRooms => 
          prevRooms.map(r => 
            r.id === room ? { ...r, raw: updatedApp, status: updatedApp.status } : r
          )
        )
      } else {
        const error = await response.json()
        toast.error(error.message || 'Ошибка при отправке в коммерческий отдел')
      }
    } catch (error) {
      toast.error('Ошибка при отправке в коммерческий отдел')
    } finally {
      setSendingToCommercial(false)
    }
  }

  // Handle cancel application
  const handleCancelApplication = async () => {
    if (!appId) return
    
    if (!confirm('Вы уверены, что хотите отменить эту заявку?')) return
    
    setCancelling(true)
    try {
      const response = await fetch(`/api/applications/${appId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      })
      
      if (response.ok) {
        toast.success('Заявка отменена')
        // Redirect to chat list
        router.push('/agent/chat')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Ошибка при отмене заявки')
      }
    } catch (error) {
      toast.error('Ошибка при отмене заявки')
    } finally {
      setCancelling(false)
    }
  }

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
    if (!appId) return
    
    try {
      const response = await fetch(`/api/applications/${appId}`, {
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
            r.id === room ? { ...r, raw: updatedApp } : r
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
            
            // Check if application date has passed and auto-reject
            const wasRejected = await checkAndRejectExpiredApplication(data)
            if (wasRejected) {
              // Reload data after auto-rejection
              const updatedResponse = await fetch(`/api/applications/${appId}`, {
                credentials: 'same-origin',
                headers: { 'Cache-Control': 'no-cache' }
              })
              if (updatedResponse.ok) {
                const updatedData = await updatedResponse.json()
                setApplicationData(updatedData)
              }
            } else {
              setApplicationData(data)
            }
          } else {
            console.error('[Agent Chat] Failed to load application, status:', response.status)
          }
        } catch (error) {
          console.error('[Agent Chat] Failed to load application:', error)
        }
      } else if (selectedRoom?.raw) {
        console.log('[Agent Chat] Setting application data from selectedRoom:', selectedRoom.raw)
        
        // Check if application date has passed
        const wasRejected = await checkAndRejectExpiredApplication(selectedRoom.raw)
        if (!wasRejected) {
          setApplicationData(selectedRoom.raw)
        }
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

  // Monitor commercial_id changes for debugging
  useEffect(() => {
    if (applicationData) {
      console.log('[Agent Chat] applicationData updated:', {
        id: applicationData.id?.slice(-8),
        status: applicationData.status,
        commercial_id: applicationData.commercial_id,
        commercial_id_type: typeof applicationData.commercial_id,
        hasCommercialId: !!applicationData.commercial_id
      })
    }
  }, [applicationData?.commercial_id, applicationData?.status])
  
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
            <div className="grid grid-cols-2 gap-2 -m-3" style={{ height: 'calc(100vh - 100px)' }}>
              {/* Customer Chat */}
              <div className="bg-white rounded-l-lg border-r flex flex-col overflow-hidden">
                <div className="border-b px-2 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 flex-shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-xs truncate">💬 {selectedRoom?.name || 'Клиент'}</h3>
                      <p className="text-[10px] text-gray-600 truncate">
                        {selectedRoom?.subtitle || 'Загрузка...'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  {applicationData && applicationData.status === 'in_progress' && (
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        onClick={handleViewDetails}
                        className="flex-1 px-1.5 py-1 bg-white text-blue-700 border border-blue-200 rounded text-[10px] font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-0.5"
                        title="Посмотреть детали"
                      >
                        <EyeIcon className="h-3 w-3" />
                        <span className="hidden sm:inline">Детали</span>
                      </button>
                      <button
                        onClick={handleEdit}
                        className="flex-1 px-1.5 py-1 bg-white text-green-700 border border-green-200 rounded text-[10px] font-medium hover:bg-green-50 transition-colors flex items-center justify-center gap-0.5"
                        title="Редактировать"
                      >
                        <PencilIcon className="h-3 w-3" />
                        <span className="hidden sm:inline">Изменить</span>
                      </button>
                      <button
                        onClick={handleSendToCommercial}
                        disabled={sendingToCommercial}
                        className="flex-1 px-1.5 py-1 bg-purple-600 text-white rounded text-[10px] font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-0.5 disabled:opacity-50"
                        title="В коммерческий отдел"
                      >
                        <PaperAirplaneIcon className="h-3 w-3" />
                        <span className="hidden sm:inline">{sendingToCommercial ? '...' : 'В отдел'}</span>
                      </button>
                      <button
                        onClick={handleCancelApplication}
                        disabled={cancelling}
                        className="px-1.5 py-1 bg-red-600 text-white rounded text-[10px] font-medium hover:bg-red-700 transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Отменить заявку"
                      >
                        <XCircleIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden min-h-0">
                  <Chat 
                    roomId={room as string} 
                    roomName={selectedRoom?.name || 'Клиент'} 
                    subtitle={selectedRoom?.subtitle || ''}
                  />
                </div>
              </div>

              {/* Commercial Department Chat - Only when status is sent_to_commercial */}
              {applicationData && applicationData.status === 'sent_to_commercial' ? (
                <div className="bg-white rounded-r-lg flex flex-col overflow-hidden">
                  <div className="border-b px-2 py-1.5 bg-gradient-to-r from-purple-50 to-purple-100 flex-shrink-0">
                    <h3 className="font-semibold text-purple-900 flex items-center gap-1 text-xs">
                      <span className="text-sm">🏢</span>
                      <span>Ком. отдел</span>
                    </h3>
                    <p className="text-[10px] text-purple-700 truncate">
                      {applicationData.commercial_id 
                        ? `Принято (ID: ${applicationData.commercial_id.slice(0, 8)}...)`
                        : 'Ожидает принятия'}
                    </p>
                  </div>
                  
                  <div className="flex-1 overflow-hidden min-h-0">
                    {!applicationData.commercial_id || applicationData.commercial_id === null ? (
                      // Waiting state - более компактный
                      <div className="h-full flex flex-col items-center justify-center p-4">
                        <div className="text-4xl mb-2 animate-pulse">⏳</div>
                        <div className="text-center max-w-xs">
                          <p className="text-gray-700 font-medium text-sm mb-1">Ожидает принятия</p>
                          <p className="text-xs text-gray-600 mb-2">
                            После принятия коммерческим отделом чат станет активным
                          </p>
                          <div className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-50 rounded-full text-purple-700 text-[10px]">
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Обновление...</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Active chat
                      <Chat
                        roomId={`commercial-agent-${user?.id}-app-${appId}`}
                        roomName="Коммерческий отдел"
                        subtitle="Обсуждение деталей"
                      />
                    )}
                  </div>
                </div>
              ) : (
                // Placeholder when no commercial chat needed
                <div className="bg-white rounded-r-lg flex items-center justify-center overflow-hidden">
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

      {/* Details Modal */}
      {showDetailsModal && applicationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Детали заявки</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1">ID заявки</p>
                  <p className="text-lg font-semibold text-gray-900">#{applicationData.id.slice(-8)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1">Статус</p>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(applicationData.status)}`}>
                    {getStatusText(applicationData.status)}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500 mb-2">📺 Программа</p>
                <p className="text-lg font-semibold text-gray-900">{applicationData.show_name || 'Не указано'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">📅 Дата показа</p>
                  <p className="text-gray-900">
                    {applicationData.scheduled_at 
                      ? new Date(applicationData.scheduled_at).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Не указано'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">⏱️ Длительность</p>
                  <p className="text-gray-900">{applicationData.duration_seconds || 0} сек</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-700 mb-2">💰 Стоимость</p>
                <p className="text-2xl font-bold text-green-600">
                  {(applicationData.cost || 0).toLocaleString('ru-RU')} ₽
                </p>
              </div>

              {applicationData.description && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">📝 Описание</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{applicationData.description}</p>
                </div>
              )}

              {applicationData.contact_phone && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">📞 Контактный телефон</p>
                  <p className="text-lg font-semibold text-gray-900">{applicationData.contact_phone}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">📅 Дата подачи</p>
                  <p className="text-sm text-gray-900">
                    {applicationData.created_at 
                      ? new Date(applicationData.created_at).toLocaleString('ru-RU')
                      : '—'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-2">🔄 Обновлено</p>
                  <p className="text-sm text-gray-900">
                    {applicationData.updated_at 
                      ? new Date(applicationData.updated_at).toLocaleString('ru-RU')
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Закрыть
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  handleEdit()
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <PencilIcon className="h-4 w-4" />
                Редактировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && applicationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 border-b px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <PencilIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Редактировать заявку</h3>
                  <p className="text-sm text-blue-100">ID: {appId?.slice(-8)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-white hover:bg-white/20 transition-colors p-2 rounded-lg"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Выбор шоу */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">📺</span>
                    <span>Шоу</span>
                  </label>
                  <select
                    value={editFormData.show_id || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, show_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  >
                    <option value="">Выберите шоу</option>
                    {shows.map(show => (
                      <option key={show.id} value={show.id}>
                        {show.name} {show.show_type ? `(${show.show_type})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Дата показа */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span>Дата и время показа</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={editFormData.scheduled_at ? new Date(editFormData.scheduled_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditFormData({ ...editFormData, scheduled_at: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Длительность */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">⏱️</span>
                    <span>Длительность (секунды)</span>
                  </label>
                  <input
                    type="number"
                    value={editFormData.duration_seconds || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, duration_seconds: Number(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    min="0"
                    step="1"
                  />
                  {editFormData.duration_seconds > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      ≈ {Math.floor(editFormData.duration_seconds / 60)} мин {editFormData.duration_seconds % 60} сек
                    </p>
                  )}
                </div>

                {/* Контактный телефон */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">📞</span>
                    <span>Контактный телефон</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.contact_phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, contact_phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="+7 (999) 999-99-99"
                  />
                </div>

                {/* Стоимость */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    <span>Стоимость (₽)</span>
                  </label>
                  <input
                    type="number"
                    value={editFormData.cost || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, cost: Number(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    min="0"
                    step="100"
                  />
                </div>

                {/* Описание */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <span>Описание</span>
                  </label>
                  <textarea
                    value={editFormData.description || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Подробное описание заявки..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editFormData.description?.length || 0} символов
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                Отменить
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-medium shadow-lg shadow-green-500/30"
              >
                💾 Сохранить изменения
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default AgentChatPage

