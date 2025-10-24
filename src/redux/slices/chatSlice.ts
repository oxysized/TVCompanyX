import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: number
  read?: boolean
  type: 'text' | 'file' | 'system'
  tempId?: string // For optimistic UI: temp messages have tempId, real messages may echo it back
  pending?: boolean // Optimistic messages are marked as pending until confirmed
  fileUrl?: string // URL to uploaded file
  fileName?: string // Original file name
  fileSize?: number // File size in bytes
}

interface ChatRoom {
  id: string
  name: string
  participants: string[]
  messages: Message[]
  lastMessage?: Message
  unreadCount: number
}

interface ChatState {
  rooms: ChatRoom[]
  activeRoom: string | null
  connected: boolean
  typing: { [roomId: string]: Array<{ userId: string; userName: string }> }
}

const initialState: ChatState = {
  rooms: [],
  activeRoom: null,
  connected: false,
  typing: {},
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload
    },
    addRoom: (state, action: PayloadAction<ChatRoom>) => {
      const existingRoom = state.rooms.find(room => room.id === action.payload.id)
      if (!existingRoom) {
        state.rooms.push(action.payload)
      }
    },
    updateRoom: (state, action: PayloadAction<Partial<ChatRoom> & { id: string }>) => {
      const room = state.rooms.find(r => r.id === action.payload.id)
      if (room) {
        Object.assign(room, action.payload)
      }
    },
    removeRoom: (state, action: PayloadAction<string>) => {
      state.rooms = state.rooms.filter(room => room.id !== action.payload)
      if (state.activeRoom === action.payload) {
        state.activeRoom = null
      }
    },
    setActiveRoom: (state, action: PayloadAction<string | null>) => {
      state.activeRoom = action.payload
    },
    addMessage: (state, action: PayloadAction<{ roomId: string; message: Message }>) => {
      let room = state.rooms.find(r => r.id === action.payload.roomId)
      // If room doesn't exist, create it with minimal data
      if (!room) {
        room = { id: action.payload.roomId, name: action.payload.roomId, participants: [], messages: [], unreadCount: 0 }
        state.rooms.push(room)
      }

      const incomingMsg = action.payload.message

      // If incoming message has tempId, replace the temp message with the real one
      if (incomingMsg.tempId) {
        const tempIndex = room.messages.findIndex(m => m.id === incomingMsg.tempId)
        if (tempIndex !== -1) {
          // Replace temp message with real message
          room.messages[tempIndex] = { ...incomingMsg, read: incomingMsg.read || false, pending: false }
          room.messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
          room.lastMessage = room.messages[room.messages.length - 1]
          return
        }
      }

      // Deduplicate by message id
      const exists = room.messages.find(m => m.id === incomingMsg.id)
      if (exists) return

      // ensure read flag
      const msg = { ...incomingMsg, read: incomingMsg.read || false }

      room.messages.push(msg)

      // Keep messages sorted by timestamp ascending
      room.messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

      room.lastMessage = room.messages[room.messages.length - 1]

      // Ensure unreadCount is numeric
      if (typeof room.unreadCount !== 'number') room.unreadCount = 0

      // Increment unread count if message is not read and this room is not active
      if (!msg.read && state.activeRoom !== action.payload.roomId) {
        room.unreadCount = (room.unreadCount || 0) + 1
      }
    },
    markRoomAsRead: (state, action: PayloadAction<string>) => {
      const room = state.rooms.find(r => r.id === action.payload)
      if (room) {
        room.unreadCount = 0
        room.messages = room.messages.map(m => ({ ...m, read: true }))
      }
    },
    setTyping: (state, action: PayloadAction<{ roomId: string; userId: string; userName?: string; isTyping: boolean }>) => {
      const { roomId, userId, userName, isTyping } = action.payload
      
      if (!state.typing[roomId]) {
        state.typing[roomId] = []
      }
      
      if (isTyping) {
        // Add if not already in the list
        if (!state.typing[roomId].find(t => t.userId === userId)) {
          state.typing[roomId].push({ userId, userName: userName || 'Пользователь' })
        }
      } else {
        // Remove from list
        state.typing[roomId] = state.typing[roomId].filter(t => t.userId !== userId)
      }
    },
    clearTyping: (state, action: PayloadAction<string>) => {
      state.typing[action.payload] = []
    },
  },
})

export const {
  setConnected,
  addRoom,
  updateRoom,
  removeRoom,
  setActiveRoom,
  addMessage,
  markRoomAsRead,
  setTyping,
  clearTyping,
} = chatSlice.actions

export default chatSlice.reducer
