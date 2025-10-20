import { io, Socket } from 'socket.io-client'
import { store } from '../redux/store'
import { setConnected, addMessage, setTyping } from '../redux/slices/chatSlice'
import { addNotification } from '../redux/slices/uiSlice'
import Cookies from 'js-cookie'

class SocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect() {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'
    const token = Cookies.get('token')

    if (!token) {
      console.warn('No token found, cannot connect to socket')
      return
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    })

    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('Connected to socket server')
      store.dispatch(setConnected(true))
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason)
      store.dispatch(setConnected(false))
      
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
      store.dispatch(addMessage({
        roomId: data.roomId,
        message: {
          id: data.id,
          senderId: data.senderId,
          senderName: data.senderName,
          content: data.content,
          timestamp: data.timestamp,
          type: data.type || 'text',
        },
      }))
    })

    this.socket.on('typing', (data) => {
      store.dispatch(setTyping({
        roomId: data.roomId,
        userId: data.userId,
        isTyping: data.isTyping,
      }))
    })

    this.socket.on('stopTyping', (data) => {
      store.dispatch(setTyping({
        roomId: data.roomId,
        userId: data.userId,
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
    if (this.socket) {
      this.socket.emit('joinRoom', roomId)
    }
  }

  leaveRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('leaveRoom', roomId)
    }
  }

  sendMessage(roomId: string, content: string, type: 'text' | 'file' = 'text') {
    if (this.socket) {
      this.socket.emit('sendMessage', {
        roomId,
        content,
        type,
      })
    }
  }

  startTyping(roomId: string) {
    if (this.socket) {
      this.socket.emit('typing', { roomId })
    }
  }

  stopTyping(roomId: string) {
    if (this.socket) {
      this.socket.emit('stopTyping', { roomId })
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
