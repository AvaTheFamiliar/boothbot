import { cors } from 'hono/cors'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

export const corsMiddleware = cors({
  origin: [FRONTEND_URL],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
})
