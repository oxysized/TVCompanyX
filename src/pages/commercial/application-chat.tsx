import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/layout/Layout'
import Chat from '../../components/chat/Chat'
import { toast } from 'react-hot-toast'

const CommercialChatPage: React.FC = () => {
  const router = useRouter()
  const { appId } = router.query as { appId?: string }
  
  const [application, setApplication] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [shows, setShows] = useState<any[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<any>({
    show_id: '',
    scheduled_at: '',
    cost: '',
    duration_seconds: '',
    contact_phone: '',
    description: '',
  })

  // Fetch application details
  useEffect(() => {
    if (!appId) return
    ;(async () => {
      try {
        setLoading(true)
        const resp = await fetch(`/api/applications/${appId}`, { credentials: 'same-origin' })
        if (!resp.ok) throw new Error('Failed to fetch application')
        const data = await resp.json()
        setApplication(data)
        
        // Prefill edit form
        setEditForm({
          show_id: data.show_id || '',
          scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString().slice(0, 16) : '',
          cost: data.cost || '',
          duration_seconds: data.duration_seconds || '',
          contact_phone: data.contact_phone || '',
          description: data.description || '',
        })
      } catch (error) {
        console.error(error)
        toast.error('Ошибка загрузки заявки')
      } finally {
        setLoading(false)
      }
    })()
  }, [appId])

  // Fetch shows for dropdown
  useEffect(() => {
    ;(async () => {
      try {
        const resp = await fetch('/api/shows', { credentials: 'same-origin' })
        if (resp.ok) {
          const data = await resp.json()
          setShows(data || [])
        }
      } catch (e) {
        console.error('Failed to fetch shows', e)
      }
    })()
  }, [])

  const handleSaveEdit = async () => {
    if (!appId) return
    try {
      const payload = {
        show_id: editForm.show_id || undefined,
        scheduled_at: editForm.scheduled_at || undefined,
        cost: editForm.cost ? parseFloat(editForm.cost) : undefined,
        duration_seconds: editForm.duration_seconds ? parseInt(editForm.duration_seconds) : undefined,
        contact_phone: editForm.contact_phone || undefined,
        description: editForm.description || undefined,
      }

      const resp = await fetch(`/api/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      })

      if (!resp.ok) throw new Error('Failed to update')
      const updated = await resp.json()
      setApplication(updated)
      setEditMode(false)
      toast.success('Заявка обновлена')
    } catch (error) {
      console.error(error)
      toast.error('Ошибка обновления заявки')
    }
  }

  const handleApprove = async () => {
    if (!appId) return
    try {
      const resp = await fetch(`/api/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status: 'approved' }),
      })
      if (!resp.ok) throw new Error('Failed to approve')
      const updated = await resp.json()
      setApplication(updated)
      toast.success('Заявка одобрена')
    } catch (error) {
      console.error(error)
      toast.error('Ошибка одобрения заявки')
    }
  }

  const handleReject = async () => {
    if (!appId) return
    try {
      const resp = await fetch(`/api/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status: 'rejected' }),
      })
      if (!resp.ok) throw new Error('Failed to reject')
      const updated = await resp.json()
      setApplication(updated)
      toast.success('Заявка отклонена')
    } catch (error) {
      console.error(error)
      toast.error('Ошибка отклонения заявки')
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает агента'
      case 'approved': return 'Одобрена'
      case 'rejected': return 'Отклонена'
      case 'sent_to_commercial': return 'На рассмотрении'
      default: return 'Неизвестно'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'sent_to_commercial': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Layout role="commercial">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Загрузка...</div>
        </div>
      </Layout>
    )
  }

  if (!application) {
    return (
      <Layout role="commercial">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Заявка не найдена</div>
        </div>
      </Layout>
    )
  }

  // Build room ID for commercial-agent chat
  const agentId = application.agent_id || application.agentId
  const roomId = agentId ? `commercial-agent-${agentId}-app-${appId}` : ''

  return (
    <Layout role="commercial">
      <div className="grid grid-cols-3 gap-6">
        {/* Application Details */}
        <aside className="col-span-1 space-y-4">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Детали заявки</h2>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Редактировать
                </button>
              )}
            </div>

            {/* Status Badge */}
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                {getStatusText(application.status)}
              </span>
            </div>

            {editMode ? (
              /* Edit Form */
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Шоу</label>
                  <select
                    value={editForm.show_id}
                    onChange={(e) => setEditForm({ ...editForm, show_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Выберите шоу</option>
                    {shows.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Дата и время</label>
                  <input
                    type="datetime-local"
                    value={editForm.scheduled_at}
                    onChange={(e) => setEditForm({ ...editForm, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Стоимость (₽)</label>
                  <input
                    type="number"
                    value={editForm.cost}
                    onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Длительность (сек)</label>
                  <input
                    type="number"
                    value={editForm.duration_seconds}
                    onChange={(e) => setEditForm({ ...editForm, duration_seconds: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Телефон</label>
                  <input
                    type="text"
                    value={editForm.contact_phone}
                    onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Описание</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              /* Display Mode */
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-gray-600">ID заявки</div>
                  <div className="text-gray-900">#{application.id.slice(-8)}</div>
                </div>

                <div>
                  <div className="font-medium text-gray-600">Клиент</div>
                  <div className="text-gray-900">{application.customerName || application.customer_name || 'Не указан'}</div>
                </div>

                <div>
                  <div className="font-medium text-gray-600">Агент</div>
                  <div className="text-gray-900">{application.agentName || application.agent_name || 'Не назначен'}</div>
                </div>

                <div>
                  <div className="font-medium text-gray-600">Шоу</div>
                  <div className="text-gray-900">{application.show || 'Не указано'}</div>
                </div>

                <div>
                  <div className="font-medium text-gray-600">Дата и время</div>
                  <div className="text-gray-900">
                    {application.scheduled_at 
                      ? new Date(application.scheduled_at).toLocaleString('ru-RU')
                      : 'Не указано'}
                  </div>
                </div>

                <div>
                  <div className="font-medium text-gray-600">Стоимость</div>
                  <div className="text-gray-900">{application.cost ? `${application.cost}₽` : 'Не указано'}</div>
                </div>

                <div>
                  <div className="font-medium text-gray-600">Длительность</div>
                  <div className="text-gray-900">
                    {application.duration_seconds 
                      ? `${Math.floor(application.duration_seconds / 60)} мин ${application.duration_seconds % 60} сек`
                      : 'Не указано'}
                  </div>
                </div>

                <div>
                  <div className="font-medium text-gray-600">Телефон</div>
                  <div className="text-gray-900">{application.contact_phone || 'Не указан'}</div>
                </div>

                <div>
                  <div className="font-medium text-gray-600">Описание</div>
                  <div className="text-gray-900">{application.description || 'Не указано'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {!editMode && (
            <div className="card">
              <h3 className="font-semibold mb-3">Действия</h3>
              <div className="space-y-2">
                <button
                  onClick={handleApprove}
                  disabled={application.status === 'approved'}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Одобрить
                </button>
                <button
                  onClick={handleReject}
                  disabled={application.status === 'rejected'}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Отклонить
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Chat with Agent */}
        <main className="col-span-2">
          <div className="h-[80vh] card">
            {roomId ? (
              <Chat
                roomId={roomId}
                roomName={`Агент: ${application.agentName || application.agent_name || 'Не назначен'}`}
                subtitle={`#${application.id.slice(-8)} • ${application.show || 'Заявка'}`}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Агент не назначен на эту заявку
              </div>
            )}
          </div>
        </main>
      </div>
    </Layout>
  )
}

export default CommercialChatPage
