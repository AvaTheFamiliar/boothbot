import { Hono } from 'hono'
import { createHmac, createHash } from 'crypto'
import { validateBody } from '../../lib/validation'
import { hashPassword, verifyPassword, generateJWT } from '../../lib/auth'
import { createTenant, findTenantByEmail, findTenantByTelegramId } from '../../db/repositories/tenant.repository'
import { registerSchema, loginSchema } from '../../db/schema'
import { supabase } from '../../db/client'

const auth = new Hono()

// Telegram auth data validation
interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

function validateTelegramAuth(data: TelegramAuthData, botToken: string): boolean {
  const { hash, ...authData } = data
  
  // Create data-check-string
  const checkString = Object.keys(authData)
    .sort()
    .map(key => `${key}=${authData[key as keyof typeof authData]}`)
    .join('\n')
  
  // Create secret key (SHA256 of bot token)
  const secretKey = createHash('sha256').update(botToken).digest()
  
  // Create HMAC-SHA256 hash
  const hmac = createHmac('sha256', secretKey).update(checkString).digest('hex')
  
  // Validate hash matches
  if (hmac !== hash) return false
  
  // Check auth_date is not too old (allow 1 day)
  const now = Math.floor(Date.now() / 1000)
  if (now - data.auth_date > 86400) return false
  
  return true
}

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

auth.post('/telegram', async (c) => {
  const data = await c.req.json() as TelegramAuthData
  
  // Get bot token from masterbot config or env
  const botToken = process.env.MASTER_BOT_TOKEN
  if (!botToken) {
    return c.json({ success: false, error: 'Server configuration error' }, 500)
  }
  
  // Validate Telegram auth
  if (!validateTelegramAuth(data, botToken)) {
    return c.json({ success: false, error: 'Invalid Telegram authentication' }, 401)
  }
  
  try {
    // Find or create tenant by telegram_id
    let tenant = await findTenantByTelegramId(data.id)
    
    if (!tenant) {
      // Create new tenant with Telegram data
      const { data: newTenant, error } = await supabase
        .from('bb_tenants')
        .insert({
          telegram_id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          username: data.username,
          photo_url: data.photo_url,
        })
        .select()
        .single()
      
      if (error) throw error
      tenant = newTenant
    } else {
      // Update existing tenant's TG info
      await supabase
        .from('bb_tenants')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          username: data.username,
          photo_url: data.photo_url,
        })
        .eq('id', tenant.id)
    }
    
    const token = generateJWT({
      tenantId: tenant.id,
      email: tenant.email || `tg_${data.id}@telegram.user`
    })
    
    return c.json({
      success: true,
      data: {
        token,
        tenant: {
          id: tenant.id,
          email: tenant.email,
          telegram_id: tenant.telegram_id,
          first_name: tenant.first_name,
          username: tenant.username,
        }
      }
    })
  } catch (error) {
    console.error('Telegram auth error:', error)
    return c.json({ success: false, error: 'Telegram login failed' }, 500)
  }
})

export default auth
