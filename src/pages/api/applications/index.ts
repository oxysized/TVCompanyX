import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET': {
        try {
          let { customerId, agentId, status } = req.query as any

          // If client didn't provide customerId, try to infer from authenticated token (cookie or Authorization header)
          // But only set customerId when the token belongs to a customer user — agents/admins should not be treated as customers
          if (!customerId) {
            try {
              const jwt = await import('jsonwebtoken')
              const authHeader = req.headers.authorization || ''
              let token = ''

              if (authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1]
              } else if (req.cookies && req.cookies.token) {
                token = req.cookies.token
              }

              if (token) {
                const secret = process.env.JWT_SECRET || 'your-secret-key'
                try {
                  const decoded: any = jwt.verify(token, secret)
                  // If token belongs to a customer, use it to set customerId for customer-scoped queries
                  if (decoded?.userId) {
                    const maybeUser = await db.getUserById(decoded.userId)
                    if (maybeUser && maybeUser.role === 'customer') {
                      customerId = decoded.userId
                    }
                  }
                } catch (e) {
                  // invalid token — ignore and proceed without customerId
                }
              }
            } catch (e) {
              // ignore import/verify errors
            }
          }

          // Route reads depend on requested status: pending/approved/rejected
          let applications
          const st = (status || '') as string
          
          // getApplications() now reads from all tables via UNION, so we don't need separate calls
          if (!st) {
            // No status provided: return all applications
            applications = await db.getApplications({ customerId: customerId as string, agentId: agentId as string })
          } else {
            // Filter by specific status
            applications = await db.getApplications({ customerId: customerId as string, agentId: agentId as string, status: st })
          }

          // Map DB rows to a normalized shape expected by frontend
          const mapped = (applications || []).map((a: any) => ({
            id: a.id,
            show_name: a.show_name || a.show || null,
            show: a.show_name || a.show || null, // Keep for backward compatibility
            time_slot: a.time_slot || null,
            scheduled_at: a.scheduled_at || null,
            date: a.scheduled_at ?? a.created_at, // Keep for backward compatibility
            duration_seconds: a.duration_seconds || 0,
            duration: a.duration_seconds || 0, // Keep for backward compatibility
            status: a.status || 'pending',
            cost: Number(a.cost || 0),
            created_at: a.created_at,
            createdAt: a.created_at, // Keep for backward compatibility
            updated_at: a.updated_at,
            description: a.description || null,
            contact_phone: a.contact_phone || null,
            contactPhone: a.contact_phone || null, // Keep for backward compatibility
            customer_id: a.customer_id,
            customerId: a.customer_id, // Keep for backward compatibility
            agent_id: a.agent_id || null,
            agentId: a.agent_id || null, // Keep for backward compatibility
            show_id: a.show_id,
            showId: a.show_id, // Keep for backward compatibility
            customer_name: a.customer_name || a.customerName || a.name || null,
            clientName: a.customer_name || a.customerName || a.name || null, // Keep for backward compatibility
            customerName: a.customer_name || a.customerName || a.name || null, // Keep for backward compatibility
            customer_email: a.customer_email || a.customerEmail || a.email || null,
            clientEmail: a.customer_email || a.customerEmail || a.email || null, // Keep for backward compatibility
            customerEmail: a.customer_email || a.customerEmail || a.email || null, // Keep for backward compatibility
            agent_name: a.agent_name || a.agentName || null,
            agentName: a.agent_name || a.agentName || null, // Keep for backward compatibility
          }))

          return res.status(200).json(mapped)
        } catch (err) {
          console.error('Applications GET error:', err)
          return res.status(500).json({ error: 'Failed to load applications' })
        }
      }

      case 'POST': {
        try {
          // Authenticate request
          const jwt = await import('jsonwebtoken')
          const authHeader = req.headers.authorization || ''
          let token = ''

          if (authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1]
          } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token
          }

          if (!token) return res.status(401).json({ error: 'No token provided' })

          const secret = process.env.JWT_SECRET || 'your-secret-key'
          let decoded: any
          try {
            decoded = jwt.verify(token, secret)
          } catch (e) {
            return res.status(401).json({ error: 'Invalid token' })
          }

          const authUserId = decoded?.userId
          if (!authUserId) return res.status(401).json({ error: 'Invalid token payload' })

          // Extract submitted fields
          const { customer_id: submittedCustomerId, agent_id, show_id, scheduled_at, duration_seconds, description, contact_phone } = req.body;

          // Determine the customer_id to use:
          // - If the authenticated user is a customer, always use their id (don't trust client)
          // - If the authenticated user is admin or staff, allow specifying customer_id in the body
          const authUser = await db.getUserById(authUserId)
          if (!authUser) return res.status(401).json({ error: 'Authenticated user not found' })

          let customer_id_to_use = submittedCustomerId
          if (authUser.role === 'customer') {
            customer_id_to_use = authUserId
          } else if (!submittedCustomerId) {
            return res.status(400).json({ error: 'customer_id is required for this user' })
          }

          // Validate required fields
          if (!customer_id_to_use || !show_id || !scheduled_at || !duration_seconds) {
            return res.status(400).json({ error: 'Missing required fields' })
          }

          // Ensure the referenced customer exists to avoid FK violation
          const customerRecord = await db.getUserById(customer_id_to_use)
          if (!customerRecord) {
            return res.status(400).json({ error: 'Referenced customer does not exist' })
          }

          // Ensure the customer has bank details on file — required to submit application
          const hasBank = await db.hasBankDetails(customer_id_to_use)
          if (!hasBank) {
            return res.status(400).json({ error: 'Customer bank details are missing. Please add bank details to your profile before submitting an application.' })
          }

          const newApplication = await db.createApplication({
            customer_id: customer_id_to_use,
            agent_id,
            show_id,
            scheduled_at,
            duration_seconds: parseInt(duration_seconds),
            description,
            contact_phone
          })

          // Create notifications: to customer (confirmation) and to agent (if assigned)
          try {
            await db.createNotification({ user_id: customer_id_to_use, type: 'application', title: 'Заявка отправлена', message: 'Ваша заявка была успешно отправлена на рассмотрение' })
            if (agent_id) {
              await db.createNotification({ user_id: agent_id, type: 'application', title: 'Новая заявка', message: 'Поступила новая заявка для рассмотрения' })
            }
          } catch (e) {
            console.error('Notification creation failed:', e)
          }

          return res.status(201).json(newApplication)
        } catch (err) {
          console.error('Applications POST error:', err)
          return res.status(500).json({ error: 'Failed to create application' })
        }
      }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Applications API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
