import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.middleware'
import { validateBody } from '../../lib/validation'
import { broadcastSchema } from '../../db/schema'
import { findEventById } from '../../db/repositories/event.repository'
import { findBotById } from '../../db/repositories/bot.repository'
import { findVisitorsByEvent } from '../../db/repositories/visitor.repository'
import { createBroadcast } from '../../db/repositories/broadcast.repository'
import { botManager } from '../../bot/manager'
import type { JWTPayload } from '../../lib/auth'

const broadcasts = new Hono()

broadcasts.use('/*', authMiddleware)

broadcasts.post('/events/:eventId/broadcast', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const eventId = c.req.param('eventId')
  const validation = await validateBody(c, broadcastSchema)

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400)
  }

  const { message } = validation.data

  try {
    const event = await findEventById(eventId)

    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const bot = await findBotById(event.bot_id)
    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const visitors = await findVisitorsByEvent(eventId)
    const botInstance = await botManager.getBotInstance(event.bot_id)

    if (!botInstance) {
      return c.json({ success: false, error: 'Bot instance not available' }, 500)
    }

    let sentCount = 0

    for (const visitor of visitors) {
      try {
        await botInstance.api.sendMessage(visitor.telegram_id, message)
        sentCount++
      } catch {
        continue
      }
    }

    await createBroadcast({
      event_id: eventId,
      message,
      sent_count: sentCount
    })

    return c.json({
      success: true,
      data: {
        message: `Broadcast sent to ${sentCount} out of ${visitors.length} visitors`,
        sent_count: sentCount,
        total_visitors: visitors.length
      }
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to send broadcast' }, 500)
  }
})

export default broadcasts
