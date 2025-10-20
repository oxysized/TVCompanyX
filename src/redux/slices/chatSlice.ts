import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: number
  type: 'text' | 'file' | 'system'
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
  typing: { [roomId: string]: string[] }
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
      const room = state.rooms.find(r => r.id === action.payload.roomId)
      if (room) {
        room.messages.push(action.payload.message)
        room.lastMessage = action.payload.message
        
        // Increment unread count if not active room
        if (state.activeRoom !== action.payload.roomId) {
          room.unreadCount += 1
        }
      }
    },
    markRoomAsRead: (state, action: PayloadAction<string>) => {
      const room = state.rooms.find(r => r.id === action.payload)
      if (room) {
        room.unreadCount = 0
      }
    },
    setTyping: (state, action: PayloadAction<{ roomId: string; userId: string; isTyping: boolean }>) => {
      const { roomId, userId, isTyping } = action.payload
      
      if (!state.typing[roomId]) {
        state.typing[roomId] = []
      }
      
      if (isTyping && !state.typing[roomId].includes(userId)) {
        state.typing[roomId].push(userId)
      } else if (!isTyping) {
        state.typing[roomId] = state.typing[roomId].filter(id => id !== userId)
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
