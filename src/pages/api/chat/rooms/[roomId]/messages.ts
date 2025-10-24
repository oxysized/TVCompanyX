import { NextApiRequest, NextApiResponse } from 'next'
import pool, { db } from '../../../../../lib/database'
import { sendNotificationToUser } from '../../../../../lib/socketServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { roomId } = req.query as { roomId?: string }
  if (!roomId) return res.status(400).json({ error: 'Missing roomId' })

  try {
    if (req.method === 'GET') {
      try {
        const rows = await db.getChatMessages(roomId as string, 500)
        // Normalize to include camelCase fields for frontend
        const normalized = rows.map((r: any) => {
          let ts = Number(r.timestamp || 0)
          if (ts && ts < 1e12) ts = ts * 1000
          if (!ts) ts = Date.now()
          return {
            id: r.id,
            room_id: r.room_id,
            roomId: r.room_id,
            sender_id: r.sender_id,
            senderId: r.sender_id,
            sender_name: r.sender_name,
            senderName: r.sender_name,
            content: r.content,
            timestamp: ts,
            file_url: r.file_url,
            fileUrl: r.file_url,
            file_name: r.file_name,
            fileName: r.file_name,
            file_size: r.file_size,
            fileSize: r.file_size,
            type: r.file_url ? 'file' : 'text'
          }
        })
        return res.status(200).json(normalized)
      } catch (err: any) {
        // If chat_messages table does not exist, create it and retry once
        if (err && err.code === '42P01') {
          try {
            await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
            await pool.query(`
              CREATE TABLE IF NOT EXISTS chat_messages (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                room_id TEXT NOT NULL,
                sender_id UUID,
                sender_name TEXT,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
              )
            `)
            const rows = await db.getChatMessages(roomId as string, 500)
            const normalized = rows.map((r: any) => {
              let ts = Number(r.timestamp || 0)
              if (ts && ts < 1e12) ts = ts * 1000
              if (!ts) ts = Date.now()
              return {
                id: r.id,
                room_id: r.room_id,
                roomId: r.room_id,
                sender_id: r.sender_id,
                senderId: r.sender_id,
                sender_name: r.sender_name,
                senderName: r.sender_name,
                content: r.content,
                timestamp: ts
              }
            })
            return res.status(200).json(normalized)
          } catch (innerErr) {
            console.error('Failed to auto-create chat_messages table:', innerErr)
            return res.status(500).json({ error: 'Failed to prepare chat storage' })
          }
        }
        throw err
      }
    }

    if (req.method === 'POST') {
      const { senderId, senderName, content, fileUrl, fileName, fileSize, chatType, applicationId } = req.body || {}
      if (!content) return res.status(400).json({ error: 'Content required' })
      try {
        const row = await db.createChatMessage(
          roomId as string, 
          senderId || null, 
          senderName || null, 
          content,
          chatType || 'customer-agent',
          applicationId || null,
          fileUrl || null,
          fileName || null,
          fileSize || null
        )
        let ts = Number(row.timestamp || 0)
        if (ts && ts < 1e12) ts = ts * 1000
        if (!ts) ts = Date.now()
        const normalized = {
          id: row.id,
          room_id: row.room_id,
          roomId: row.room_id,
          sender_id: row.sender_id,
          senderId: row.sender_id,
          sender_name: row.sender_name,
          senderName: row.sender_name,
          content: row.content,
          timestamp: ts,
          file_url: row.file_url,
          fileUrl: row.file_url,
          file_name: row.file_name,
          fileName: row.file_name,
          file_size: row.file_size,
          fileSize: row.file_size,
          type: row.file_url ? 'file' : 'text'
        }
        
        // Create notification for chat participants (except sender)
        try {
          // Parse room_id to determine participants
          // Format examples: "application-{applicationId}", "commercial-agent-{agentId}-app-{appId}"
          const roomIdStr = roomId as string
          let recipientId: string | null = null
          
          if (roomIdStr.startsWith('application-')) {
            // Extract application ID and get customer/agent from it
            const appId = roomIdStr.replace('application-', '')
            
            // Get application to find customer and agent
            const applications = await db.getApplications()
            const app = applications.find(a => a.id === appId)
            
            if (app) {
              // Notify the other party (not sender)
              recipientId = senderId === app.customer_id ? app.agent_id : app.customer_id
            }
          } else if (roomIdStr.startsWith('commercial-agent-')) {
            // Extract agent ID and application ID using regex
            // Format: commercial-agent-{agentId}-app-{appId}
            const match = roomIdStr.match(/^commercial-agent-([0-9a-f-]+)-app-([0-9a-f-]+)$/i)
            if (match) {
              const agentId = match[1]
              const appId = match[2]
              
              // Get application to find customer and commercial users
              // For simplicity, notify based on sender role
              if (senderId !== agentId) {
                recipientId = agentId // Notify agent if commercial sent message
              } else {
                // Agent sent message - would need to get commercial users from application
                // For now, skip or implement lookup
                recipientId = null
              }
            }
          }
          
          if (recipientId) {
            const notification = await db.createNotification({
              user_id: recipientId,
              type: 'new_message',
              title: 'Новое сообщение',
              message: `${senderName || 'Пользователь'}: ${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`,
              data: {
                roomId: roomId as string,
                messageId: row.id,
                senderId: senderId,
                senderName: senderName
              }
            })
            
            // Send realtime notification
            sendNotificationToUser(recipientId, notification)
          }
        } catch (notifErr) {
          console.error('Failed to create chat notification:', notifErr)
          // Don't fail the request
        }
        
        // Note: real-time broadcast should be done by socket server; this API only persists and returns the message
        return res.status(201).json(normalized)
      } catch (err: any) {
        if (err && err.code === '42P01') {
          try {
            await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
            await pool.query(`
              CREATE TABLE IF NOT EXISTS chat_messages (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                room_id TEXT NOT NULL,
                sender_id UUID,
                sender_name TEXT,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
              )
            `)
            const row = await db.createChatMessage(roomId as string, senderId || null, senderName || null, content)
            let ts = Number(row.timestamp || 0)
            if (ts && ts < 1e12) ts = ts * 1000
            if (!ts) ts = Date.now()
            const normalized = {
              id: row.id,
              room_id: row.room_id,
              roomId: row.room_id,
              sender_id: row.sender_id,
              senderId: row.sender_id,
              sender_name: row.sender_name,
              senderName: row.sender_name,
              content: row.content,
              timestamp: ts
            }
            return res.status(201).json(normalized)
          } catch (innerErr) {
            console.error('Failed to auto-create chat_messages table (POST):', innerErr)
            return res.status(500).json({ error: 'Failed to prepare chat storage' })
          }
        }
        throw err
      }
    }

    res.setHeader('Allow', ['GET','POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Chat messages API error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
