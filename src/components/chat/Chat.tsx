import React, { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../redux/store'
import { addMessage, setActiveRoom, markRoomAsRead } from '../../redux/slices/chatSlice'
import { setTyping } from '../../redux/slices/chatSlice'
import socketService from '../../utils/socket'
import { PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface ChatProps {
  roomId: string
  roomName: string
  subtitle?: string
}

const Chat: React.FC<ChatProps> = ({ roomId, roomName, subtitle }) => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { rooms, activeRoom, typing } = useSelector((state: RootState) => state.chat)
  
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (!message.trim() && !selectedFile) return
    if (!user) return

    // If there's a file, upload it first
    if (selectedFile) {
      handleFileUpload()
    } else {
      // Just send text message
      socketService.sendMessage(roomId, message.trim())
      setMessage('')
      socketService.stopTyping(roomId)
      setIsTyping(false)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile || !user) return

    setUploadingFile(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('roomId', roomId)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      
      // Send file message with optional text
      const fileMessage = message.trim() || `[Файл: ${selectedFile.name}]`
      socketService.sendMessage(roomId, fileMessage, {
        type: 'file',
        fileName: selectedFile.name,
        fileUrl: data.url,
        fileSize: selectedFile.size
      })

      toast.success('Файл отправлен')
      
      // Reset
      setMessage('')
      setSelectedFile(null)
      socketService.stopTyping(roomId)
      setIsTyping(false)
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('File upload error:', error)
      toast.error('Ошибка загрузки файла')
    } finally {
      setUploadingFile(false)
    }
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

  const handleFileAttach = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    toast.success(`Файл "${file.name}" прикреплен`)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    toast.success('Файл удален')
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
          {subtitle ? (
            <p className="text-sm text-secondary-600">{subtitle}</p>
          ) : (
            <p className="text-sm text-secondary-600">
              {currentRoom.participants.length} участников
            </p>
          )}
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
                  
                  {/* File attachment if exists */}
                  {msg.fileUrl && (
                    <div className="mb-2">
                      <a
                        href={msg.fileUrl}
                        download={msg.fileName}
                        className={`flex items-center space-x-2 p-2 rounded ${
                          msg.senderId === user?.id
                            ? 'bg-primary-700 hover:bg-primary-800'
                            : 'bg-white hover:bg-gray-50'
                        } transition-colors`}
                      >
                        <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{msg.fileName || 'Файл'}</div>
                          {msg.fileSize && (
                            <div className={`text-xs ${msg.senderId === user?.id ? 'text-primary-200' : 'text-gray-500'}`}>
                              {(msg.fileSize / 1024).toFixed(1)} КБ
                            </div>
                          )}
                        </div>
                        <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    </div>
                  )}
                  
                  {/* Text message */}
                  {msg.content && (
                    <div className="text-sm">{msg.content}</div>
                  )}
                  
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
        {/* Attached File Preview */}
        {selectedFile && (
          <div className="mb-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md p-2">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <PaperClipIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm text-blue-900 truncate">{selectedFile.name}</span>
              <span className="text-xs text-blue-600 flex-shrink-0">
                ({(selectedFile.size / 1024).toFixed(1)} КБ)
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="ml-2 text-blue-600 hover:text-blue-800 flex-shrink-0"
              title="Удалить файл"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
          />
          <button
            type="button"
            onClick={handleFileAttach}
            disabled={uploadingFile}
            className="p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={uploadingFile ? "Загрузка..." : "Прикрепить файл"}
          >
            {uploadingFile ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-secondary-600"></div>
            ) : (
              <PaperClipIcon className="h-5 w-5" />
            )}
          </button>
          <input
            type="text"
            value={message}
            onChange={handleTyping}
            placeholder={selectedFile ? "Добавьте описание к файлу (необязательно)..." : "Введите сообщение..."}
            className="flex-1 px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            type="submit"
            disabled={(!message.trim() && !selectedFile) || uploadingFile}
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
