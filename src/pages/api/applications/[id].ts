import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { db } from '../../../lib/database'
import pool from '../../../lib/database'
import { sendNotificationToUser } from '../../../lib/socketServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string }
  
  if (req.method === 'GET') {
    try {
      // authenticate
      const authHeader = req.headers.authorization || ''
      let token = ''
      if (authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1]
      else if (req.cookies && req.cookies.token) token = req.cookies.token
      if (!token) return res.status(401).json({ error: 'Not authenticated' })
      const secret = process.env.JWT_SECRET || 'your-secret-key'
      let decoded: any
      try { decoded = jwt.verify(token, secret) } catch (e) { return res.status(401).json({ error: 'Invalid token' }) }
      const userId = decoded?.userId
      const user = await db.getUserById(userId)
      if (!user) return res.status(401).json({ error: 'User not found' })

      // Get application by ID with JOIN data
      const applications = await db.getApplications()
      const application = applications.find(app => app.id === id)
      
      if (!application) {
        return res.status(404).json({ error: 'Application not found' })
      }

      // Check permissions - allow commercial department to view all
      if (user.role === 'customer' && application.customer_id !== userId) {
        return res.status(403).json({ error: 'Access denied' })
      }
      if (user.role === 'agent') {
        // Agent can view if they're assigned OR if no agent assigned yet
        if (application.agent_id !== null && application.agent_id !== userId) {
          return res.status(403).json({ error: 'Access denied' })
        }
      }

      console.log('[API GET] Returning application:', application.id, 'agent_id:', application.agent_id, 'status:', application.status)
      return res.status(200).json(application)
    } catch (err) {
      console.error('Applications GET error:', err)
      return res.status(500).json({ error: 'Failed to get application' })
    }
  }
  
  if (req.method === 'PUT') {
    try {
      // authenticate
      const authHeader = req.headers.authorization || ''
      let token = ''
      if (authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1]
      else if (req.cookies && req.cookies.token) token = req.cookies.token
      if (!token) return res.status(401).json({ error: 'Not authenticated' })
      const secret = process.env.JWT_SECRET || 'your-secret-key'
      let decoded: any
      try { decoded = jwt.verify(token, secret) } catch (e) { return res.status(401).json({ error: 'Invalid token' }) }
      const userId = decoded?.userId
      const user = await db.getUserById(userId)
      if (!user) return res.status(401).json({ error: 'User not found' })

      const body = req.body || {}

      // If agent requests to take in work: assign agent_id to self
      if (body.take && user.role === 'agent') {
        console.log('[API] Agent', userId, 'taking application', id)
        const updated = await db.assignApplicationToAgent(id, userId)
        if (!updated) return res.status(404).json({ error: 'Application not found' })
        
        console.log('[API] Application assigned. customer_id:', updated.customer_id)
        
        // Create initial chat message when agent takes the application
        try {
          const roomId = `application-${id}`
          const message = await db.createChatMessage(
            roomId,
            userId,
            user.name || user.first_name || 'Агент',
            `Здравствуйте! Я взял вашу заявку в работу. Начинаю ее просмотр.`,
            'customer-agent',
            undefined, // Don't set application_id due to FK constraint issues
            undefined, // fileUrl
            undefined, // fileName
            undefined  // fileSize
          )
          console.log('[API] Created customer-agent chat room:', roomId, 'message id:', message.id)
          
          // Send socket notification to customer about new message and status change
          if (updated.customer_id) {
            console.log('[API] Sending notifications to customer:', updated.customer_id)
            
            const notificationSent = sendNotificationToUser(updated.customer_id, {
              type: 'application:updated',
              applicationId: id,
              status: updated.status,
              agent_id: userId,
              message: 'Агент взял вашу заявку в работу'
            })
            console.log('[API] application:updated notification sent:', notificationSent)
            
            // Also send the new message event
            const messageSent = sendNotificationToUser(updated.customer_id, {
              type: 'message',
              roomId,
              message: {
                id: message.id,
                sender_id: userId,
                sender_name: user.name || user.first_name || 'Агент',
                content: message.content,
                created_at: message.timestamp || Date.now(),
                type: 'text',
                fileUrl: null,
                fileName: null,
                fileSize: null
              }
            })
            console.log('[API] message notification sent:', messageSent)
          } else {
            console.log('[API] No customer_id found, cannot send notification')
          }
        } catch (chatErr) {
          console.error('[API] Failed to create initial chat message:', chatErr)
        }
        
        return res.status(200).json(updated)
      }

      // If commercial requests to take in work: add message to existing chat with agent
      if (body.takeCommercial && user.role === 'commercial') {
        const applications = await db.getApplications()
        const application = applications.find(app => app.id === id)
        
        if (!application) return res.status(404).json({ error: 'Application not found' })
        if (!application.agent_id) return res.status(400).json({ error: 'No agent assigned to this application' })
        
        // Update commercial_id to mark that commercial has taken the application
        // Need to update in all possible tables since we don't know which one has the record
        try {
          await pool.query(
            'UPDATE applications SET commercial_id = $1 WHERE id = $2',
            [userId, id]
          )
          await pool.query(
            'UPDATE pending_applications SET commercial_id = $1 WHERE id = $2',
            [userId, id]
          )
          await pool.query(
            'UPDATE approved_applications SET commercial_id = $1 WHERE id = $2',
            [userId, id]
          )
          await pool.query(
            'UPDATE rejected_applications SET commercial_id = $1 WHERE id = $2',
            [userId, id]
          )
          console.log('[API] Set commercial_id to', userId, 'for application', id, 'in all tables')
        } catch (err) {
          console.error('[API] Failed to update commercial_id:', err)
        }
        
        // Add message to existing chat between commercial and agent
        try {
          const roomId = `commercial-agent-${application.agent_id}-app-${id}`
          
          // Check if chat exists
          const existingMessages = await db.getChatMessages(roomId)
          if (!existingMessages || existingMessages.length === 0) {
            console.log('[API] Commercial chat not found, creating initial message')
            // If chat doesn't exist yet (edge case), create it
            await db.createChatMessage(
              roomId,
              userId,
              user.name || user.first_name || 'Коммерческий отдел',
              `Здравствуйте! Я принял заявку #${id.slice(-8)} в работу. Обсудим детали.`,
              'agent-commercial',
              id
            )
          } else {
            console.log('[API] Commercial joining existing chat')
            // Add message to existing chat
            const message = await db.createChatMessage(
              roomId,
              userId,
              user.name || user.first_name || 'Коммерческий отдел',
              `Здравствуйте! Я принял заявку #${id.slice(-8)} в работу. Обсудим детали.`,
              'agent-commercial',
              id
            )
            console.log('[API] Commercial added message to room:', roomId, message)
          }
          
          // Notify agent via socket
          try {
            const io = require('socket.io-client')
            const socketUrl = process.env.SOCKET_URL || 'http://localhost:4000'
            const socket = io(socketUrl, { 
              reconnection: false,
              timeout: 5000
            })
            
            socket.on('connect', () => {
              console.log('[API] Socket connected, broadcasting commercial message to room:', roomId)
              socket.emit('message', {
                id: Date.now().toString(),
                room_id: roomId,
                sender_id: userId,
                sender_name: user.name || user.first_name || 'Коммерческий отдел',
                text: `Здравствуйте! Я принял заявку #${id.slice(-8)} в работу. Обсудим детали.`,
                created_at: new Date().toISOString(),
                chat_type: 'agent-commercial',
                application_id: id
              })
              setTimeout(() => socket.disconnect(), 500)
            })
            
            socket.on('connect_error', (err: Error) => {
              console.error('[API] Socket connection error:', err.message)
              socket.disconnect()
            })
          } catch (socketErr) {
            console.error('[API] Failed to broadcast via socket:', socketErr)
          }
        } catch (chatErr) {
          console.error('[API] Failed to handle commercial-agent chat:', chatErr)
        }
        
        // Broadcast application update to notify agent that commercial_id is set
        try {
          const io = require('socket.io-client')
          const socketUrl = process.env.SOCKET_URL || 'http://localhost:4000'
          const socket = io(socketUrl, { 
            reconnection: false,
            timeout: 3000
          })
          
          socket.on('connect', () => {
            console.log('[API] Broadcasting application:updated with commercial_id:', userId)
            socket.emit('application:updated', {
              applicationId: id,
              commercial_id: userId,
              status: application.status,
              updatedField: 'commercial_id'
            })
            setTimeout(() => socket.disconnect(), 300)
          })
          
          socket.on('connect_error', (err: Error) => {
            console.error('[API] Socket error for application update:', err.message)
            socket.disconnect()
          })
        } catch (socketErr) {
          console.error('[API] Failed to broadcast application update:', socketErr)
        }
        
        // Get updated application with commercial_id
        const updatedApp = (await db.getApplications()).find(app => app.id === id)
        return res.status(200).json(updatedApp || application)
      }

      // If status change requested, reuse existing helper
      if (body.status) {
        // If agent is sending to commercial but agent_id is not set, set it first
        if (body.status === 'sent_to_commercial' && user.role === 'agent') {
          const currentApp = (await db.getApplications()).find(a => a.id === id)
          if (currentApp && !currentApp.agent_id) {
            console.log('[API] Auto-assigning agent before sending to commercial:', userId)
            await db.assignApplicationToAgent(id, userId)
          }
          
          // Create commercial-agent chat room when agent sends to commercial
          if (body.createCommercialChat) {
            try {
              const roomId = `commercial-agent-${userId}-app-${id}`
              await db.createChatMessage(
                roomId,
                userId,
                user.name || user.first_name || 'Агент',
                `Здравствуйте! Отправляю заявку #${id.slice(-8)} на рассмотрение. Жду обратной связи.`,
                'agent-commercial',
                id
              )
              console.log('[API] Agent created commercial chat room:', roomId)
              
              // Notify via socket
              try {
                const io = require('socket.io-client')
                const socketUrl = process.env.SOCKET_URL || 'http://localhost:4000'
                const socket = io(socketUrl, { 
                  reconnection: false,
                  timeout: 5000
                })
                
                socket.on('connect', () => {
                  console.log('[API] Socket connected, broadcasting agent message to room:', roomId)
                  socket.emit('message', {
                    id: Date.now().toString(),
                    room_id: roomId,
                    sender_id: userId,
                    sender_name: user.name || user.first_name || 'Агент',
                    text: `Здравствуйте! Отправляю заявку #${id.slice(-8)} на рассмотрение. Жду обратной связи.`,
                    created_at: new Date().toISOString(),
                    chat_type: 'agent-commercial',
                    application_id: id
                  })
                  setTimeout(() => socket.disconnect(), 500)
                })
                
                socket.on('connect_error', (err: Error) => {
                  console.error('[API] Socket connection error:', err.message)
                  socket.disconnect()
                })
              } catch (socketErr) {
                console.error('[API] Failed to broadcast via socket:', socketErr)
              }
            } catch (chatErr) {
              console.error('[API] Failed to create commercial-agent chat:', chatErr)
            }
          }
        }
        
        const updated = await db.updateApplicationStatus(id, body.status, userId)
        if (!updated) return res.status(404).json({ error: 'Application not found or status change failed' })
        
        // Broadcast status change to all relevant users via socket
        try {
          const io = require('socket.io-client')
          const socketUrl = process.env.SOCKET_URL || 'http://localhost:4000'
          const socket = io(socketUrl, { 
            reconnection: false,
            timeout: 3000
          })
          
          socket.on('connect', () => {
            console.log('[API] Broadcasting status change:', { applicationId: id, status: body.status })
            socket.emit('application:statusChanged', {
              applicationId: id,
              status: body.status,
              updatedBy: userId
            })
            setTimeout(() => socket.disconnect(), 300)
          })
          
          socket.on('connect_error', (err: Error) => {
            console.error('[API] Socket error for status broadcast:', err.message)
            socket.disconnect()
          })
        } catch (socketErr) {
          console.error('[API] Failed to broadcast status change:', socketErr)
        }
        
        // Create notification for customer about status change
        if (updated.customer_id) {
          const statusTexts: Record<string, string> = {
            pending: 'На рассмотрении',
            approved: 'Одобрена',
            rejected: 'Отклонена',
            sent_to_commercial: 'Отправлена в коммерческий отдел'
          }
          
          const statusText = statusTexts[body.status] || body.status
          const notificationTitle = `Статус заявки изменен`
          const notificationMessage = `Ваша заявка #${id.slice(-8)} теперь: ${statusText}`
          
          try {
            const notification = await db.createNotification({
              user_id: updated.customer_id,
              type: 'status_changed',
              title: notificationTitle,
              message: notificationMessage,
              data: { 
                applicationId: id, 
                newStatus: body.status,
                statusText 
              }
            })
            
            // Send realtime notification via socket
            sendNotificationToUser(updated.customer_id, notification)
            console.log('Notification created and sent:', notification.id)
          } catch (notifErr) {
            console.error('Failed to create notification:', notifErr)
            // Don't fail the request if notification fails
          }
        }
        
        // Note: Chat with commercial is now created only when commercial takes the application
        // See takeCommercial handler above
        
        return res.status(200).json(updated)
      }

      // If agent or commercial wants to update application details
      if ((user.role === 'agent' || user.role === 'commercial') && (body.description !== undefined || body.contact_phone !== undefined || body.duration_seconds !== undefined || body.show_id !== undefined || body.scheduled_at !== undefined || body.cost !== undefined)) {
        const updateData: any = {}
        if (body.description !== undefined) updateData.description = body.description
        if (body.contact_phone !== undefined) updateData.contact_phone = body.contact_phone
        if (body.duration_seconds !== undefined) updateData.duration_seconds = body.duration_seconds
        if (body.show_id !== undefined) updateData.show_id = body.show_id
        if (body.scheduled_at !== undefined) updateData.scheduled_at = body.scheduled_at
        if (body.cost !== undefined) updateData.cost = body.cost
        
        const updated = await db.updateApplicationDetails(id, updateData)
        if (!updated) return res.status(404).json({ error: 'Application not found' })
        return res.status(200).json(updated)
      }

      return res.status(400).json({ error: 'No valid action specified' })
    } catch (err) {
      console.error('Applications PUT error:', err)
      return res.status(500).json({ error: 'Failed to update application' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // authenticate
      const authHeader = req.headers.authorization || ''
      let token = ''
      if (authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1]
      else if (req.cookies && req.cookies.token) token = req.cookies.token
      if (!token) return res.status(401).json({ error: 'Not authenticated' })
      const secret = process.env.JWT_SECRET || 'your-secret-key'
      let decoded: any
      try { decoded = jwt.verify(token, secret) } catch (e) { return res.status(401).json({ error: 'Invalid token' }) }
      const userId = decoded?.userId
      const user = await db.getUserById(userId)
      if (!user) return res.status(401).json({ error: 'User not found' })

      // Get application to check permissions and status
      const applications = await db.getApplications()
      const application = applications.find(app => app.id === id)
      
      if (!application) {
        return res.status(404).json({ error: 'Application not found' })
      }

      // Only customer who created the application can delete it
      if (user.role !== 'customer' || application.customer_id !== userId) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Only allow deletion if status is pending, in_progress or sent_to_commercial
      if (application.status !== 'pending' && application.status !== 'in_progress' && application.status !== 'sent_to_commercial') {
        return res.status(400).json({ 
          error: 'Невозможно отменить заявку',
          message: 'Можно отменить только заявки со статусом "Ожидает агента", "В работе у агента" или "В коммерческом отделе"'
        })
      }

      await db.deleteApplication(id)
      
      // Create notification for agent if assigned
      if (application.agent_id) {
        try {
          const notification = await db.createNotification({
            user_id: application.agent_id,
            type: 'application_cancelled',
            title: 'Заявка отменена клиентом',
            message: `Заявка #${id.slice(-8)} (${application.show_name}) была отменена клиентом`,
            data: { 
              applicationId: id, 
              showName: application.show_name
            }
          })
          
          sendNotificationToUser(application.agent_id, notification)
          console.log('Cancellation notification sent to agent:', application.agent_id)
        } catch (notifErr) {
          console.error('Failed to create cancellation notification:', notifErr)
        }
      }
      
      return res.status(200).json({ success: true, message: 'Заявка успешно отменена' })
    } catch (err) {
      console.error('Applications DELETE error:', err)
      return res.status(500).json({ error: 'Failed to delete application' })
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
  return res.status(405).json({ error: 'Method not allowed' })
}
