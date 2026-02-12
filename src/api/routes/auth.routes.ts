import { Hono } from 'hono'
import { validateBody } from '../../lib/validation'
import { hashPassword, verifyPassword, generateJWT } from '../../lib/auth'
import { createTenant, findTenantByEmail } from '../../db/repositories/tenant.repository'
import { registerSchema, loginSchema } from '../../db/schema'

const auth = new Hono()

auth.post('/register', async (c) => {
  const validation = await validateBody(c, registerSchema)

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400)
  }

  const { email, password } = validation.data

  try {
    const existingTenant = await findTenantByEmail(email)
    if (existingTenant) {
      return c.json({ success: false, error: 'Email already registered' }, 400)
    }

    const passwordHash = await hashPassword(password)
    const tenant = await createTenant({ email, password_hash: passwordHash })

    const token = generateJWT({
      tenantId: tenant.id,
      email: tenant.email
    })

    return c.json({
      success: true,
      data: {
        token,
        tenant: {
          id: tenant.id,
          email: tenant.email
        }
      }
    })
  } catch (error) {
    return c.json({ success: false, error: 'Registration failed' }, 500)
  }
})

auth.post('/login', async (c) => {
  const validation = await validateBody(c, loginSchema)

  if (!validation.success) {
    return c.json({ success: false, error: validation.error }, 400)
  }

  const { email, password } = validation.data

  try {
    const tenant = await findTenantByEmail(email)
    if (!tenant) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401)
    }

    const isValid = await verifyPassword(password, tenant.password_hash)
    if (!isValid) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401)
    }

    const token = generateJWT({
      tenantId: tenant.id,
      email: tenant.email
    })

    return c.json({
      success: true,
      data: {
        token,
        tenant: {
          id: tenant.id,
          email: tenant.email
        }
      }
    })
  } catch (error) {
    return c.json({ success: false, error: 'Login failed' }, 500)
  }
})

export default auth
