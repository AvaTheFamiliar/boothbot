import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { corsMiddleware } from './api/middleware/cors.middleware'
import authRoutes from './api/routes/auth.routes'
import botRoutes from './api/routes/bot.routes'
import eventRoutes from './api/routes/event.routes'
import visitorRoutes from './api/routes/visitor.routes'
import broadcastRoutes from './api/routes/broadcast.routes'
import webhookRoutes from './api/routes/webhook.routes'
import { testConnection } from './db/client'
import { createMasterBot } from './masterbot'

const app = new Hono()

app.use('*', logger())
app.use('*', corsMiddleware)

app.get('/', (c) => {
  return c.json({
    name: 'BoothBot API',
    version: '0.1.0',
    status: 'running'
  })
})

app.get('/health', (c) => {
  return c.json({ ok: true })
})

app.route('/api/auth', authRoutes)
app.route('/api/bots', botRoutes)
app.route('/api/events', eventRoutes)
app.route('/api', visitorRoutes)
app.route('/api', broadcastRoutes)
app.route('/webhook', webhookRoutes)

const PORT = Number(process.env.PORT) || 3000

// Initialize
async function init() {
  // Test DB connection
  try {
    await testConnection()
    console.log('Database connected')
  } catch (err) {
    console.error('Database connection failed:', err)
  }

  // Start master bot if token is set
  const masterBot = createMasterBot()
  if (masterBot) {
    // Use long polling for master bot (simpler than webhook for this)
    masterBot.start({
      onStart: (info) => console.log(`Master bot @${info.username} started`)
    })
  }
}

init()

console.log(`Starting server on port ${PORT}...`)

export default {
  port: PORT,
  hostname: '0.0.0.0',
  fetch: app.fetch,
}
