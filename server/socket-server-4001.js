const http = require('http')
const { Server } = require('socket.io')
const PORT = process.env.SOCKET_PORT || 4000

const server = http.createServer()
const io = new Server(server, {
  cors: { origin: '*' }
})

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id)

  socket.on('join', (roomId) => {
    socket.join(roomId)
    console.log(`${socket.id} joined ${roomId}`)
  })

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId)
    console.log(`${socket.id} joined ${roomId}`)
  })

  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId)
    console.log(`${socket.id} left ${roomId}`)
  })

  socket.on('sendMessage', (data) => {
    try {
      const room = data.roomId
      console.log(`Broadcasting message ${data.id} to room ${room}`)
      io.to(room).emit('message', data)
    } catch (err) {
      console.error('sendMessage error', err)
    }
  })

  // Handle notifications to specific users
  socket.on('sendNotification', (data) => {
    const { userId, notification } = data
    console.log(`[Socket] Sending notification to user-${userId}:`, notification.type)
    io.to(`user-${userId}`).emit('notification', notification)
  })

  socket.on('typing', (data) => {
    const room = data.roomId
    console.log(`Typing event in room ${room} from user ${data.userId}`)
    socket.to(room).emit('typing', { roomId: room, userId: data.userId, isTyping: true })
  })

  socket.on('stopTyping', (data) => {
    const room = data.roomId
    console.log(`StopTyping event in room ${room} from user ${data.userId}`)
    socket.to(room).emit('stopTyping', { roomId: room, userId: data.userId })
  })

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id)
  })
})

server.listen(PORT, () => console.log(`Socket server listening on ${PORT}`))
