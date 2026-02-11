import { Hono } from 'hono'
import { botManager } from '../../bot/manager'

const webhook = new Hono()

webhook.post('/:botId', async (c) => {
  const botId = c.req.param('botId')

  try {
    const update = await c.req.json()
    console.log(`[webhook] Received update for bot ${botId}:`, JSON.stringify(update).slice(0, 200))
    await botManager.handleWebhook(botId, update)
    console.log(`[webhook] Successfully processed update for bot ${botId}`)
    return c.json({ ok: true })
  } catch (error: any) {
    console.error(`[webhook] Error processing update for bot ${botId}:`, error?.message || error, error?.stack)
    return c.json({ ok: false, error: error?.message || 'Webhook processing failed' }, 500)
  }
})

export default webhook
