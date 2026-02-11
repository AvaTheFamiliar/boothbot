import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.middleware'
import { validateBody } from '../../lib/validation'
import { createEventSchema, updateEventSchema } from '../../db/schema'
import {
  createEvent,
  findEventById,
  findEventsByBot,
  updateEvent,
  deleteEvent
} from '../../db/repositories/event.repository'
import { findBotById } from '../../db/repositories/bot.repository'
import { generateEventQR } from '../../lib/qr'
import type { JWTPayload } from '../../lib/auth'

const events = new Hono()

events.use('/*', authMiddleware)

events.post('/', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const validation = await validateBody(c, createEventSchema)

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400)
  }

  const { bot_id, name, description, start_date, end_date } = validation.data

  try {
    const bot = await findBotById(bot_id)
    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Bot not found' }, 404)
    }

    const event = await createEvent({
      bot_id,
      name,
      description,
      start_date,
      end_date
    })

    return c.json({
      success: true,
      data: event
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create event' }, 500)
  }
})

events.get('/', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const botId = c.req.query('botId')

  try {
    if (botId) {
      const bot = await findBotById(botId)
      if (!bot || bot.tenant_id !== tenant.tenantId) {
        return c.json({ success: false, error: 'Bot not found' }, 404)
      }

      const eventsList = await findEventsByBot(botId)
      return c.json({
        success: true,
        data: eventsList
      })
    }

    return c.json({ success: false, error: 'botId query parameter required' }, 400)
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch events' }, 500)
  }
})

events.get('/:id', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const eventId = c.req.param('id')

  try {
    const event = await findEventById(eventId)

    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const bot = await findBotById(event.bot_id)
    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    return c.json({
      success: true,
      data: event
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch event' }, 500)
  }
})

events.get('/:id/qr', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const eventId = c.req.param('id')

  try {
    const event = await findEventById(eventId)

    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const bot = await findBotById(event.bot_id)
    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const qrBuffer = await generateEventQR(eventId, bot.username)

    c.header('Content-Type', 'image/png')
    c.header('Content-Disposition', `attachment; filename="event_${eventId}_qr.png"`)
    return c.body(qrBuffer)
  } catch (error) {
    return c.json({ success: false, error: 'Failed to generate QR code' }, 500)
  }
})

events.put('/:id', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const eventId = c.req.param('id')
  const validation = await validateBody(c, updateEventSchema)

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400)
  }

  try {
    const event = await findEventById(eventId)

    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const bot = await findBotById(event.bot_id)
    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const updatedEvent = await updateEvent(eventId, validation.data)

    return c.json({
      success: true,
      data: updatedEvent
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update event' }, 500)
  }
})

events.delete('/:id', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const eventId = c.req.param('id')

  try {
    const event = await findEventById(eventId)

    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const bot = await findBotById(event.bot_id)
    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    await deleteEvent(eventId)

    return c.json({
      success: true,
      data: { message: 'Event deleted successfully' }
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to delete event' }, 500)
  }
})

export default events
