import { Hono } from 'hono'
import { botManager } from '../../bot/manager'

const webhook = new Hono()

webhook.post('/:botId', async (c) => {
  const botId = c.req.param('botId')

  try {
    const update = await c.req.json()
    await botManager.handleWebhook(botId, update)

    return c.json({ ok: true })
  } catch (error) {
    return c.json({ ok: false, error: 'Webhook processing failed' }, 500)
  }
})

export default webhook
