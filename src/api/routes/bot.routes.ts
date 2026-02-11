import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.middleware'
import { validateBody } from '../../lib/validation'
import { createBotSchema } from '../../db/schema'
import {
  createBot,
  findBotsByTenant,
  findBotById,
  deleteBot
} from '../../db/repositories/bot.repository'
import type { JWTPayload } from '../../lib/auth'

const bots = new Hono()

bots.use('/*', authMiddleware)

bots.post('/', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const validation = await validateBody(c, createBotSchema)

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400)
  }

  const { token, username, owner_telegram_id } = validation.data

  try {
    const bot = await createBot({
      tenant_id: tenant.tenantId,
      token,
      username,
      owner_telegram_id
    })

    return c.json({
      success: true,
      data: bot
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create bot' }, 500)
  }
})

bots.get('/', async (c) => {
  const tenant = c.get('tenant') as JWTPayload

  try {
    const botsList = await findBotsByTenant(tenant.tenantId)
    return c.json({
      success: true,
      data: botsList
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch bots' }, 500)
  }
})

bots.get('/:id', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const botId = c.req.param('id')

  try {
    const bot = await findBotById(botId)

    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Bot not found' }, 404)
    }

    return c.json({
      success: true,
      data: bot
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch bot' }, 500)
  }
})

bots.delete('/:id', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const botId = c.req.param('id')

  try {
    const bot = await findBotById(botId)

    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Bot not found' }, 404)
    }

    await deleteBot(botId)

    return c.json({
      success: true,
      data: { message: 'Bot deleted successfully' }
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to delete bot' }, 500)
  }
})

export default bots
