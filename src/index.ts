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

app.route('/api/auth', authRoutes)
app.route('/api/bots', botRoutes)
app.route('/api/events', eventRoutes)
app.route('/api', visitorRoutes)
app.route('/api', broadcastRoutes)
app.route('/webhook', webhookRoutes)

const PORT = process.env.PORT || 3000

async function start() {
  try {
    await testConnection()

    const server = Bun.serve({
      port: PORT,
      fetch: app.fetch
    })

    return server
  } catch (error) {
    process.exit(1)
  }
}

start()

export default app
