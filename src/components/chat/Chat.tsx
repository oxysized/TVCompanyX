import React, { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import { addMessage, setActiveRoom, markRoomAsRead } from '../../redux/slices/chatSlice'
import { setTyping } from '../../redux/slices/chatSlice'
import socketService from '../../utils/socket'
import { PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/24/outline'

interface ChatProps {
  roomId: string
  roomName: string
}

const Chat: React.FC<ChatProps> = ({ roomId, roomName }) => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { rooms, activeRoom, typing } = useSelector((state: RootState) => state.chat)
  
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const currentRoom = rooms.find(room => room.id === roomId)
  const currentTyping = typing[roomId] || []

  useEffect(() => {
    if (roomId) {
      dispatch(setActiveRoom(roomId))
      socketService.joinRoom(roomId)
      dispatch(markRoomAsRead(roomId))
    }

    return () => {
      if (roomId) {
        socketService.leaveRoom(roomId)
      }
    }
  }, [roomId, dispatch])

  useEffect(() => {
    scrollToBottom()
  }, [currentRoom?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !user) return

    socketService.sendMessage(roomId, message.trim())
    setMessage('')
    socketService.stopTyping(roomId)
    setIsTyping(false)
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)

    if (!isTyping && user) {
      setIsTyping(true)
      socketService.startTyping(roomId)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      socketService.stopTyping(roomId)
    }, 1000)
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера'
    } else {
      return date.toLocaleDateString('ru-RU')
    }
  }

  const groupMessagesByDate = (messages: any[]) => {
    const groups: { [key: string]: any[] } = {}
    
    messages.forEach(message => {
      const date = formatDate(message.timestamp)
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })

    return groups
  }

  if (!currentRoom) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-secondary-500 mb-2">Загрузка чата...</div>
        </div>
      </div>
    )
  }

  const messageGroups = groupMessagesByDate(currentRoom.messages)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-200">
        <div>
          <h3 className="text-lg font-semibold text-secondary-900">{roomName}</h3>
          <p className="text-sm text-secondary-600">
            {currentRoom.participants.length} участников
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-md">
            <PaperClipIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(messageGroups).map(([date, messages]) => (
          <div key={date}>
            <div className="flex items-center justify-center my-4">
              <div className="bg-secondary-100 px-3 py-1 rounded-full text-sm text-secondary-600">
                {date}
              </div>
            </div>
            
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.senderId === user?.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-secondary-100 text-secondary-900'
                  }`}
                >
                  {msg.senderId !== user?.id && (
                    <div className="text-xs font-medium mb-1 opacity-75">
                      {msg.senderName}
                    </div>
                  )}
                  <div className="text-sm">{msg.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      msg.senderId === user?.id ? 'text-primary-100' : 'text-secondary-500'
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Typing Indicator */}
        {currentTyping.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-secondary-100 px-4 py-2 rounded-lg">
              <div className="text-sm text-secondary-600">
                {currentTyping.length === 1
                  ? `${currentTyping[0]} печатает...`
                  : `${currentTyping.length} участников печатают...`}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-secondary-200 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={handleTyping}
            placeholder="Введите сообщение..."
            className="flex-1 px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  )
}

export default Chat
