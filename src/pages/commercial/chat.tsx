import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/layout/Layout'
import Chat from '../../components/chat/Chat'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'

const CommercialChatPage = () => {
  const router = useRouter()
  const { room } = router.query as { room?: string }
  const reduxRooms = useSelector((s: RootState) => s.chat.rooms)
  const user = useSelector((s: RootState) => s.auth.user)
  const [rooms, setRooms] = useState<any[]>([])
  const [filteredRooms, setFilteredRooms] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')

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

        // Filter applications sent to commercial (only these have commercial chats)
        const commercialApps = apps.filter(a => a.status === 'sent_to_commercial' && a.agent_id)

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

        // Merge with Redux rooms to catch any additional rooms
        const commercialReduxChats = reduxRooms
          .filter(r => r.id.startsWith('commercial-agent-'))
          .filter(r => !agentChats.find(ac => ac.id === r.id))
          .map(r => {
            const appIdMatch = r.id.match(/app-(.+)$/)
            const appId = appIdMatch ? appIdMatch[1] : ''
            const app = commercialApps.find(a => a.id === appId)
            
            return {
              id: r.id,
              name: app?.agent_name || 'Агент',
              subtitle: app ? `#${app.id.slice(-8)} • ${app.show_name || ''}` : 'Чат с агентом',
              unread: r.unreadCount || 0,
              status: app?.status,
              raw: app,
            }
          })

        setRooms([...agentChats, ...commercialReduxChats])
      } catch (e) {
        // fallback to redux rooms if API fails
        if (reduxRooms && reduxRooms.length > 0) setRooms(reduxRooms)
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
  }, [rooms, statusFilter])

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
              <option value="all">Все заявки</option>
              <option value="pending">На рассмотрении</option>
              <option value="sent_to_commercial">Отправлена</option>
              <option value="approved">Одобрена</option>
              <option value="rejected">Отклонена</option>
            </select>
          </div>

          <div className="space-y-2">
            {filteredRooms.map(r => {
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
        </aside>
        <main className="col-span-3">
          {selectedRoom && commercialRoomId ? (
            // Show only commercial chat with agent
            <div className="h-[70vh] card">
              <Chat 
                roomId={commercialRoomId} 
                roomName={selectedRoom.name || 'Агент'} 
                subtitle={selectedRoom.subtitle || 'Чат с агентом'}
                showApplicationInfo={true}
                applicationId={selectedRoom.raw?.id}
              />
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
    </Layout>
  )
}

export default CommercialChatPage

