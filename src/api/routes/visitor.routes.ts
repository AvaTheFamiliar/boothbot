import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.middleware'
import {
  findVisitorsByEvent,
  exportVisitorsCSV
} from '../../db/repositories/visitor.repository'
import { findEventById, getEventStats } from '../../db/repositories/event.repository'
import { findBotById } from '../../db/repositories/bot.repository'
import type { JWTPayload } from '../../lib/auth'

const visitors = new Hono()

visitors.use('/*', authMiddleware)

visitors.get('/events/:eventId/visitors', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const eventId = c.req.param('eventId')

  try {
    const event = await findEventById(eventId)

    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const bot = await findBotById(event.bot_id)
    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const visitorsList = await findVisitorsByEvent(eventId)

    return c.json({
      success: true,
      data: visitorsList
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch visitors' }, 500)
  }
})

visitors.get('/events/:eventId/stats', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const eventId = c.req.param('eventId')

  try {
    const event = await findEventById(eventId)

    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const bot = await findBotById(event.bot_id)
    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const stats = await getEventStats(eventId)

    return c.json({
      success: true,
      data: stats
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch stats' }, 500)
  }
})

visitors.get('/events/:eventId/export', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const eventId = c.req.param('eventId')

  try {
    const event = await findEventById(eventId)

    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const bot = await findBotById(event.bot_id)
    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Event not found' }, 404)
    }

    const csv = await exportVisitorsCSV(eventId)

    c.header('Content-Type', 'text/csv')
    c.header('Content-Disposition', `attachment; filename="visitors_${eventId}.csv"`)
    return c.text(csv)
  } catch (error) {
    return c.json({ success: false, error: 'Failed to export visitors' }, 500)
  }
})

export default visitors
