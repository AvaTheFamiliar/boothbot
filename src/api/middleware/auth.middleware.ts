import type { Context, Next } from 'hono'
import { verifyJWT, type JWTPayload } from '../../lib/auth'

export interface AuthContext {
  tenant: JWTPayload
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }

  const token = authHeader.substring(7)
  const payload = verifyJWT(token)

  if (!payload) {
    return c.json({ success: false, error: 'Invalid token' }, 401)
  }

  c.set('tenant', payload)
  await next()
}
