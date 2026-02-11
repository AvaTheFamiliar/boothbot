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

async function start() {
  try {
    await testConnection()
    console.log('Database connected')
  } catch (error) {
    console.error('Database connection failed:', error)
    // Continue anyway for now
  }

  const server = Bun.serve({
    port: PORT,
    hostname: '0.0.0.0',
    fetch: app.fetch
  })

  console.log(`Server running on http://0.0.0.0:${PORT}`)
  return server
}

start()

export default app
