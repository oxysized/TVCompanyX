const { io } = require('socket.io-client')

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:4000'
const ROOM = 'application-e2e-test-1234'

function wait(ms){ return new Promise(r => setTimeout(r, ms)) }

async function run(){
  console.log('Test connecting to', SOCKET_URL, 'room', ROOM)
  const c1 = io(SOCKET_URL, { transports: ['websocket','polling'], reconnection: false })
  const c2 = io(SOCKET_URL, { transports: ['websocket','polling'], reconnection: false })

  c1.on('connect', () => console.log('c1 connected', c1.id))
  c2.on('connect', () => console.log('c2 connected', c2.id))

  c1.on('message', (data) => console.log('c1 got message', data))
  c2.on('message', (data) => console.log('c2 got message', data))

  c1.on('connect_error', (err) => console.error('c1 connect_error', err))
  c2.on('connect_error', (err) => console.error('c2 connect_error', err))

  // wait for connects
  await wait(500)
  console.log('Joining room on both clients')
  c1.emit('joinRoom', ROOM)
  c2.emit('joinRoom', ROOM)

  await wait(500)
  console.log('c1 sending message')
  c1.emit('sendMessage', { roomId: ROOM, id: 'msg-1', content: 'hello from c1', senderId: 'c1', senderName: 'Client One', timestamp: Date.now() })

  // wait to receive
  await wait(1000)

  console.log('Closing clients')
  c1.disconnect()
  c2.disconnect()
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
