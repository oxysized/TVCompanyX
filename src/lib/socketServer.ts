// Server-side notification helper
// This file is used in API routes to send notifications via Socket.io

import { io as ioClient, Socket } from 'socket.io-client'

let socket: Socket | null = null

// Connect to socket server
function getSocket(): Socket {
  if (!socket || !socket.connected) {
    const socketUrl = process.env.SOCKET_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'
    socket = ioClient(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    socket.on('connect', () => {
      console.log('[Server] Connected to socket server at', socketUrl)
    })

    socket.on('disconnect', () => {
      console.log('[Server] Disconnected from socket server')
    })

    socket.on('connect_error', (error) => {
      console.error('[Server] Socket connection error:', error)
    })
  }

  return socket
}

// Send notification to user
export function sendNotificationToUser(userId: string, notification: any) {
  try {
    const sock = getSocket()
    if (sock.connected) {
      sock.emit('sendNotification', { userId, notification })
      console.log(`[Server] Sent notification to user ${userId}`)
      return true
    } else {
      console.warn('[Server] Socket not connected, cannot send notification')
      return false
    }
  } catch (error) {
    console.error('[Server] Failed to send notification:', error)
    return false
  }
}

// Disconnect socket (call on server shutdown)
export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
