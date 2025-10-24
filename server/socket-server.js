const http = require('http')
const { Server } = require('socket.io')
const PORT = process.env.SOCKET_PORT || 4000

const server = http.createServer()
const io = new Server(server, {
  cors: { origin: '*' }
})

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id)

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId)
    console.log(`${socket.id} joined ${roomId}`);

    // Attempt to fetch recent persisted messages for this room and send to the joining socket
    (async () => {
      try {
        const apiBase = process.env.SOCKET_API_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const resp = await fetch(`${apiBase}/api/chat/rooms/${encodeURIComponent(roomId)}/messages`)
        if (resp.ok) {
          const msgs = await resp.json()
          // send history only to the joining socket (not broadcast)
          msgs.forEach(m => {
            socket.emit('message', m)
          })
        }
      } catch (err) {
        console.warn('Failed to fetch/send history to joining socket', err)
      }
    })()
  })

  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId)
    console.log(`${socket.id} left ${roomId}`)
  })

  socket.on('sendMessage', async (data) => {
    // data includes: roomId, tempId, content, senderId, senderName, timestamp, type, fileUrl, fileName, fileSize, chatType, applicationId
    try {
      const room = data.roomId
      console.log(`[sendMessage] Received message for room ${room}`)
      console.log(`[sendMessage] tempId: ${data.tempId}, senderId: ${data.senderId}, content: ${data.content}`)
      if (data.fileUrl) {
        console.log(`[sendMessage] File attached: ${data.fileName} (${data.fileSize} bytes)`)
      }
      
      // Persist message via API
      const apiBase = process.env.SOCKET_API_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      console.log(`[sendMessage] Sending POST to ${apiBase}/api/chat/rooms/${encodeURIComponent(room)}/messages`)
      
      const resp = await fetch(`${apiBase}/api/chat/rooms/${encodeURIComponent(room)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: data.senderId,
          senderName: data.senderName,
          content: data.content,
          type: data.type || 'text',
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || null,
          fileSize: data.fileSize || null,
          chatType: data.chatType || 'customer-agent',
          applicationId: data.applicationId || null
        })
      })

      console.log(`[sendMessage] API response status: ${resp.status}`)

      if (!resp.ok) {
        const errorText = await resp.text()
        console.error('[sendMessage] Failed to persist message to API:', resp.status, errorText)
        return
      }

      const persistedMessage = await resp.json()
      console.log(`[sendMessage] Persisted message with id: ${persistedMessage.id}`)
      
      // Broadcast the persisted message with the original tempId so clients can replace their optimistic message
      io.to(room).emit('message', {
        ...persistedMessage,
        tempId: data.tempId
      })
      
      console.log(`[sendMessage] Broadcasted message ${persistedMessage.id} to room ${room}`)
      
      console.log(`Broadcasted message ${persistedMessage.id} (was tempId: ${data.tempId}) to room ${room}`)
    } catch (err) {
      console.error('sendMessage error', err)
    }
  })

  socket.on('typing', (data) => {
    const room = data.roomId
    console.log(`Typing event in room ${room} from user ${data.userName || data.userId}`)
    socket.to(room).emit('typing', { roomId: room, userId: data.userId, userName: data.userName, isTyping: true })
  })

  socket.on('stopTyping', (data) => {
    const room = data.roomId
    console.log(`StopTyping event in room ${room} from user ${data.userName || data.userId}`)
    socket.to(room).emit('stopTyping', { roomId: room, userId: data.userId, userName: data.userName })
  })

  // Join user's notification room
  socket.on('joinNotifications', (userId) => {
    const roomName = `user-${userId}`
    socket.join(roomName)
    console.log(`✅ ${socket.id} joined room "${roomName}" for user ${userId}`)
  })

  // Broadcast notification to specific user
  socket.on('sendNotification', (data) => {
    const { userId, notification } = data
    const roomName = `user-${userId}`
    console.log(`📤 Sending notification to room "${roomName}":`, JSON.stringify(notification))
    io.to(roomName).emit('notification', notification)
    console.log(`✅ Notification emitted to room "${roomName}"`)
  })

  // Broadcast application status change
  socket.on('application:statusChanged', (data) => {
    const { applicationId, status, updatedBy } = data
    console.log(`[application:statusChanged] Broadcasting status change for app ${applicationId}: ${status}`)
    // Broadcast to all connected clients
    io.emit('application:statusChanged', { applicationId, status, updatedBy })
  })

  // Broadcast application update (e.g., commercial_id set)
  socket.on('application:updated', (data) => {
    const { applicationId, commercial_id } = data
    console.log(`[application:updated] Broadcasting app update for ${applicationId}`)
    // Broadcast to all connected clients
    io.emit('application:updated', { applicationId, commercial_id })
  })

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id)
  })
})

server.listen(PORT, () => console.log(`Socket server listening on ${PORT}`))
