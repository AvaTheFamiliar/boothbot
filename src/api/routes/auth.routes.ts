import { Hono } from 'hono'
import { createHmac, createHash, randomBytes } from 'crypto'
import { validateBody } from '../../lib/validation'
import { hashPassword, verifyPassword, generateJWT } from '../../lib/auth'
import { createTenant, findTenantByEmail, findTenantByTelegramId } from '../../db/repositories/tenant.repository'
import { registerSchema, loginSchema } from '../../db/schema'
import { supabase } from '../../db/client'

const auth = new Hono()

const BOT_USERNAME = 'MoongateEventBot'

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

// Generate a random auth code
function generateAuthCode(): string {
  return randomBytes(16).toString('hex')
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

// Legacy Telegram widget auth (keeping for compatibility)
auth.post('/telegram', async (c) => {
  const data = await c.req.json() as TelegramAuthData
  
  const botToken = process.env.MASTER_BOT_TOKEN
  if (!botToken) {
    return c.json({ success: false, error: 'Server configuration error' }, 500)
  }
  
  if (!validateTelegramAuth(data, botToken)) {
    return c.json({ success: false, error: 'Invalid Telegram authentication' }, 401)
  }
  
  try {
    let tenant = await findTenantByTelegramId(data.id)
    
    if (!tenant) {
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

// ============================================
// Deep Link Auth Flow (Native TG Experience)
// ============================================

// Step 1: Initialize auth - generate code and return deep link
auth.post('/telegram-link/init', async (c) => {
  try {
    const code = generateAuthCode()
    
    // Store pending auth code (expires in 5 minutes)
    const { error } = await supabase
      .from('bb_auth_codes')
      .insert({
        code,
        status: 'pending',
      })
    
    if (error) throw error
    
    const deepLink = `https://t.me/${BOT_USERNAME}?start=login_${code}`
    
    return c.json({
      success: true,
      data: {
        code,
        deepLink,
        expiresIn: 300, // 5 minutes
      }
    })
  } catch (error) {
    console.error('Failed to init telegram link auth:', error)
    return c.json({ success: false, error: 'Failed to initialize login' }, 500)
  }
})

// Step 2: Check auth status - poll this until approved
auth.get('/telegram-link/check', async (c) => {
  const code = c.req.query('code')
  
  if (!code) {
    return c.json({ success: false, error: 'Missing code parameter' }, 400)
  }
  
  try {
    // Get auth code record
    const { data: authCode, error } = await supabase
      .from('bb_auth_codes')
      .select('*')
      .eq('code', code)
      .single()
    
    if (error || !authCode) {
      return c.json({ success: false, error: 'Invalid or expired code' }, 404)
    }
    
    // Check if expired
    if (new Date(authCode.expires_at) < new Date()) {
      return c.json({ 
        success: false, 
        status: 'expired',
        error: 'Code has expired' 
      }, 410)
    }
    
    // Check status
    if (authCode.status === 'pending') {
      return c.json({ 
        success: true, 
        status: 'pending',
        message: 'Waiting for Telegram confirmation'
      })
    }
    
    if (authCode.status === 'denied') {
      return c.json({ 
        success: false, 
        status: 'denied',
        error: 'Login was denied' 
      }, 401)
    }
    
    if (authCode.status === 'approved' && authCode.telegram_id) {
      // Find or create tenant
      let tenant = await findTenantByTelegramId(authCode.telegram_id)
      
      if (!tenant) {
        // This shouldn't happen since bot creates tenant on approve,
        // but handle it gracefully
        const { data: newTenant, error: createError } = await supabase
          .from('bb_tenants')
          .insert({ telegram_id: authCode.telegram_id })
          .select()
          .single()
        
        if (createError) throw createError
        tenant = newTenant
      }
      
      // Generate JWT
      const token = generateJWT({
        tenantId: tenant.id,
        email: tenant.email || `tg_${authCode.telegram_id}@telegram.user`
      })
      
      // Delete used code
      await supabase
        .from('bb_auth_codes')
        .delete()
        .eq('code', code)
      
      return c.json({
        success: true,
        status: 'approved',
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
    }
    
    return c.json({ success: false, error: 'Unknown status' }, 500)
  } catch (error) {
    console.error('Failed to check telegram link auth:', error)
    return c.json({ success: false, error: 'Failed to check login status' }, 500)
  }
})

export default auth
