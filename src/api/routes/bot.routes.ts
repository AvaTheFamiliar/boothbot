import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.middleware'
import { validateBody } from '../../lib/validation'
import { createBotSchema } from '../../db/schema'
import {
  createBot,
  findBotsWithStatsByTenantId,
  findBotById,
  deleteBot,
  archiveBot,
  getBotAdmins,
  addBotAdmin,
  removeBotAdmin
} from '../../db/repositories/bot.repository'
import { findVisitorsByBot } from '../../db/repositories/visitor.repository'
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
      data: { ...bot, visitor_count: 0 }
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create bot' }, 500)
  }
})

// Get all bots with visitor counts
bots.get('/', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const includeArchived = c.req.query('includeArchived') === 'true'

  try {
    let botsList = await findBotsWithStatsByTenantId(tenant.tenantId)
    
    // Filter archived unless requested
    if (!includeArchived) {
      botsList = botsList.filter(b => !b.archived)
    }
    
    return c.json({
      success: true,
      data: botsList
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch bots' }, 500)
  }
})

// Get single bot
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

// Archive/unarchive bot
bots.patch('/:id/archive', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const botId = c.req.param('id')
  const body = await c.req.json()

  try {
    const bot = await findBotById(botId)

    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Bot not found' }, 404)
    }

    const updated = await archiveBot(botId, body.archived ?? true)

    return c.json({
      success: true,
      data: updated
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update bot' }, 500)
  }
})

// Get leads for a bot
bots.get('/:id/leads', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const botId = c.req.param('id')

  try {
    const bot = await findBotById(botId)

    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Bot not found' }, 404)
    }

    const leads = await findVisitorsByBot(botId)

    return c.json({
      success: true,
      data: leads
    })
  } catch (error) {
    console.error('Failed to fetch leads:', error)
    return c.json({ success: false, error: 'Failed to fetch leads' }, 500)
  }
})

// Get bot admins
bots.get('/:id/admins', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const botId = c.req.param('id')

  try {
    const bot = await findBotById(botId)

    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Bot not found' }, 404)
    }

    const admins = await getBotAdmins(botId)
    
    // Include owner as first admin
    const allAdmins = [
      {
        id: 'owner',
        bot_id: botId,
        telegram_id: bot.owner_telegram_id,
        telegram_username: null,
        role: 'owner',
        added_at: bot.created_at
      },
      ...admins
    ].filter(a => a.telegram_id) // Filter out if owner has no telegram_id

    return c.json({
      success: true,
      data: allAdmins
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch admins' }, 500)
  }
})

// Add admin to bot
bots.post('/:id/admins', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const botId = c.req.param('id')
  const body = await c.req.json()

  if (!body.telegram_id && !body.telegram_username) {
    return c.json({ success: false, error: 'telegram_id or telegram_username required' }, 400)
  }

  try {
    const bot = await findBotById(botId)

    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Bot not found' }, 404)
    }

    const admin = await addBotAdmin(
      botId, 
      body.telegram_id, 
      body.telegram_username
    )

    return c.json({
      success: true,
      data: admin
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to add admin' }, 500)
  }
})

// Remove admin from bot
bots.delete('/:id/admins/:telegramId', async (c) => {
  const tenant = c.get('tenant') as JWTPayload
  const botId = c.req.param('id')
  const telegramId = parseInt(c.req.param('telegramId'))

  try {
    const bot = await findBotById(botId)

    if (!bot || bot.tenant_id !== tenant.tenantId) {
      return c.json({ success: false, error: 'Bot not found' }, 404)
    }

    // Can't remove owner
    if (bot.owner_telegram_id === telegramId) {
      return c.json({ success: false, error: 'Cannot remove owner' }, 400)
    }

    await removeBotAdmin(botId, telegramId)

    return c.json({
      success: true,
      data: { message: 'Admin removed' }
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to remove admin' }, 500)
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
