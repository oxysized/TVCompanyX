import { io, Socket } from 'socket.io-client'
import { store } from '../redux/store'
import { setConnected, addMessage, setTyping } from '../redux/slices/chatSlice'
import { addNotification } from '../redux/slices/uiSlice'
import Cookies from 'js-cookie'

class SocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private pendingJoins: string[] = []
  private pendingEmits: Array<{event:string; data:any}> = []
  private joinedRooms: Set<string> = new Set() // Track already joined rooms

  connect() {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'
    // Avoid creating multiple sockets: disconnect existing before creating a new one
    if (this.socket) {
      try { this.socket.disconnect() } catch (e) { /* ignore */ }
      this.socket = null
    }

    // With server-managed HttpOnly sessions we should not read tokens from JS.
    // If the socket server validates sessions via cookie, ensure it accepts
    // cookies and configure the client accordingly. Otherwise implement a
    // secure handshake endpoint that returns a short-lived socket token.
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      // Note: for some socket servers, enabling withCredentials is necessary
      // to send cookies; socket.io-client uses 'extraHeaders' on Node and
      // 'withCredentials' on the browser automatically when needed.
      withCredentials: true,
    })

    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('Connected to socket server')
      store.dispatch(setConnected(true))
      this.reconnectAttempts = 0
      
      // Clear joined rooms on reconnect (need to rejoin)
      this.joinedRooms.clear()
      
      // flush any pending joins/emits
      if (this.pendingJoins.length > 0) {
        this.pendingJoins.forEach(r => {
          console.log('Flushing pending join for', r)
          this.joinedRooms.add(r)
          this.socket?.emit('joinRoom', r)
        })
        this.pendingJoins = []
      }
      if (this.pendingEmits.length > 0) {
        this.pendingEmits.forEach(item => {
          console.log('Flushing pending emit', item.event, item.data && item.data.id)
          this.socket?.emit(item.event, item.data)
        })
        this.pendingEmits = []
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason)
      store.dispatch(setConnected(false))
      
      // Clear joined rooms on disconnect
      this.joinedRooms.clear()
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      store.dispatch(setConnected(false))
      this.handleReconnect()
    })

    // Chat events
    this.socket.on('message', (data) => {
      // Ensure timestamp exists (fallback to now) and canonicalize roomId
      const timestamp = data.timestamp || Date.now()
      const room = data.roomId && data.roomId.indexOf('application-') !== -1 ? data.roomId.slice(data.roomId.lastIndexOf('application-')) : data.roomId
      store.dispatch(addMessage({
        roomId: room,
        message: {
          id: data.id,
          senderId: data.senderId || data.sender_id || null,
          senderName: data.senderName || data.sender_name || null,
          content: data.content,
          timestamp,
          type: data.type || 'text',
          tempId: data.tempId, // Pass tempId so reducer can replace optimistic message
          pending: false, // Message from server is confirmed, not pending
          fileUrl: data.fileUrl || data.file_url || null,
          fileName: data.fileName || data.file_name || null,
          fileSize: data.fileSize || data.file_size || null,
        },
      }))
    })

    this.socket.on('typing', (data) => {
      store.dispatch(setTyping({
        roomId: data.roomId,
        userId: data.userId,
        userName: data.userName,
        isTyping: data.isTyping,
      }))
    })

    this.socket.on('stopTyping', (data) => {
      store.dispatch(setTyping({
        roomId: data.roomId,
        userId: data.userId,
        userName: data.userName,
        isTyping: false,
      }))
    })

    // Notification events
    this.socket.on('notification', (data) => {
      store.dispatch(addNotification({
        type: data.type || 'info',
        title: data.title,
        message: data.message,
      }))
    })

    // Dashboard updates
    this.socket.on('dashboardUpdate', (data) => {
      // Handle real-time dashboard updates
      console.log('Dashboard update received:', data)
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        this.connect()
      }, delay)
    } else {
      console.error('Max reconnection attempts reached')
      store.dispatch(addNotification({
        type: 'error',
        title: 'Connection Lost',
        message: 'Unable to reconnect to server. Please refresh the page.',
      }))
    }
  }

  // Chat methods
  joinRoom(roomId: string) {
    const canonical = (roomId && roomId.indexOf('application-') !== -1) ? roomId.slice(roomId.lastIndexOf('application-')) : roomId
    
    // Skip if already joined
    if (this.joinedRooms.has(canonical)) {
      console.log('Already in room:', canonical)
      return
    }
    
    // If socket connected, emit immediately; otherwise queue
    if (this.socket && this.socket.connected) {
      console.log('Joining socket room:', canonical)
      this.joinedRooms.add(canonical)
      // support ack callback
      this.socket.emit('joinRoom', canonical, (err: any) => {
        if (err) {
          console.warn('Join ack error', err)
          this.joinedRooms.delete(canonical) // Remove on error
        }
      })
    } else {
      console.log('Queueing join for', canonical)
      if (!this.pendingJoins.includes(canonical)) this.pendingJoins.push(canonical)
    }
  }

  leaveRoom(roomId: string) {
    const canonical = (roomId && roomId.indexOf('application-') !== -1) ? roomId.slice(roomId.lastIndexOf('application-')) : roomId
    
    // Skip if not joined
    if (!this.joinedRooms.has(canonical)) {
      console.log('Not in room (skipping leave):', canonical)
      return
    }
    
    if (this.socket && this.socket.connected) {
      console.log('Leaving socket room:', canonical)
      this.joinedRooms.delete(canonical)
      this.socket.emit('leaveRoom', canonical)
    } else {
      // remove from pending joins if queued
      this.pendingJoins = this.pendingJoins.filter(r => r !== canonical)
      this.joinedRooms.delete(canonical)
    }
  }

  async sendMessage(roomId: string, content: string, metadata?: any) {
    // Real-time messenger pattern: emit via socket immediately, server persists and broadcasts
    try {
      const state: any = store.getState()
      const me = state?.auth?.user
      const senderId = me?.id || null
      const senderName = me ? (me.first_name ? `${me.first_name}${me.last_name ? ' ' + me.last_name : ''}` : me.name || null) : null

      // canonicalize room id
      const canonical = (roomId && roomId.indexOf('application-') !== -1) ? roomId.slice(roomId.lastIndexOf('application-')) : roomId

      // Generate temporary ID for optimistic UI
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const timestamp = Date.now()

      // Show message immediately (optimistic UI)
      store.dispatch(addMessage({ 
        roomId: canonical, 
        message: {
          id: tempId,
          senderId,
          senderName,
          content,
          timestamp,
          type: metadata?.fileUrl ? 'file' : 'text',
          pending: true,
          fileUrl: metadata?.fileUrl,
          fileName: metadata?.fileName,
          fileSize: metadata?.fileSize
        }
      }))

      // Emit via socket - server will persist and broadcast to all clients
      const payload = {
        roomId: canonical,
        tempId,
        content,
        type: metadata?.fileUrl ? 'file' : 'text',
        senderId,
        senderName,
        timestamp,
        fileUrl: metadata?.fileUrl || null,
        fileName: metadata?.fileName || null,
        fileSize: metadata?.fileSize || null,
        chatType: metadata?.chatType || 'customer-agent',
        applicationId: metadata?.applicationId || null
      }

      if (this.socket && this.socket.connected) {
        console.log('Emitting sendMessage to room:', canonical)
        this.socket.emit('sendMessage', payload)
      } else {
        console.log('Queueing sendMessage for room:', canonical)
        this.pendingEmits.push({ event: 'sendMessage', data: payload })
      }
    } catch (e) {
      console.warn('Send message error', e)
    }
  }

  startTyping(roomId: string) {
    const canonical = (roomId && roomId.indexOf('application-') !== -1) ? roomId.slice(roomId.lastIndexOf('application-')) : roomId
    const state: any = store.getState()
    const me = state?.auth?.user
    const userId = me?.id
    const userName = me ? (me.first_name ? `${me.first_name}${me.last_name ? ' ' + me.last_name : ''}` : me.name || 'Пользователь') : 'Пользователь'
    const data = { roomId: canonical, userId, userName, isTyping: true }
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing', data)
    } else {
      this.pendingEmits.push({ event: 'typing', data })
    }
  }

  stopTyping(roomId: string) {
    const canonical = (roomId && roomId.indexOf('application-') !== -1) ? roomId.slice(roomId.lastIndexOf('application-')) : roomId
    const state: any = store.getState()
    const me = state?.auth?.user
    const userId = me?.id
    const userName = me ? (me.first_name ? `${me.first_name}${me.last_name ? ' ' + me.last_name : ''}` : me.name || 'Пользователь') : 'Пользователь'
    const data = { roomId: canonical, userId, userName }
    if (this.socket && this.socket.connected) {
      this.socket.emit('stopTyping', data)
    } else {
      this.pendingEmits.push({ event: 'stopTyping', data })
    }
  }
  // Dashboard methods
  subscribeToDashboard(role: string) {
    if (this.socket) {
      this.socket.emit('subscribeDashboard', { role })
    }
  }

  unsubscribeFromDashboard(role: string) {
    if (this.socket) {
      this.socket.emit('unsubscribeDashboard', { role })
    }
  }

  // General methods
  emit(event: string, data?: any) {
    if (this.socket) {
      this.socket.emit(event, data)
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }

  // Notifications methods
  joinNotifications(userId: string) {
    if (this.socket && this.socket.connected) {
      console.log('Joining notifications for user:', userId)
      this.socket.emit('joinNotifications', userId)
    }
  }

  sendNotification(userId: string, notification: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('sendNotification', { userId, notification })
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      store.dispatch(setConnected(false))
    }
  }

  isConnected() {
    return this.socket?.connected || false
  }
}

export default new SocketService()
