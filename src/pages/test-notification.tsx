import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

export default function TestNotification() {
  const [logs, setLogs] = useState<string[]>([])
  const [userId, setUserId] = useState('daca6413-e0ad-45a5-9e00-ee27bd2dce8d')

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    if (!userId) return

    addLog('Создаю socket подключение...')
    const socket = io('http://localhost:4000')

    socket.on('connect', () => {
      addLog(`✅ Socket подключен! Socket ID: ${socket.id}`)
      addLog(`Отправляю joinNotifications для user: ${userId}`)
      socket.emit('joinNotifications', userId)
    })

    socket.on('disconnect', () => {
      addLog('❌ Socket отключен')
    })

    socket.on('connect_error', (error) => {
      addLog(`❌ Ошибка подключения: ${error.message}`)
    })

    socket.on('notification', (notification: any) => {
      addLog(`📩 Получено уведомление: ${JSON.stringify(notification)}`)
    })

    return () => {
      addLog('Отключаюсь...')
      socket.disconnect()
    }
  }, [userId])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Тест уведомлений Socket.io</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">User ID:</label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Введите ID пользователя"
        />
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">Логи:</h2>
        <div className="space-y-1 font-mono text-sm max-h-96 overflow-y-auto">
          {logs.length === 0 && <p className="text-gray-500">Логи появятся здесь...</p>}
          {logs.map((log, i) => (
            <div key={i} className="text-xs">{log}</div>
          ))}
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Инструкция:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Откройте эту страницу</li>
          <li>Убедитесь, что socket подключен (✅)</li>
          <li>Откройте страницу агента в другой вкладке</li>
          <li>Нажмите "Взять в работу" на заявке</li>
          <li>Здесь должно появиться уведомление 📩</li>
        </ol>
      </div>
    </div>
  )
}
