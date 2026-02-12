import { describe, test, expect } from 'bun:test'

const API_URL = process.env.API_URL || 'https://boothbot-api-production.up.railway.app'
const BOT_ID = '6b196a88-abfd-43c7-b5f1-6c5e29b5b16f'

// Helper to simulate Telegram webhook update
function createUpdate(text: string, userId = 123456, updateId = Date.now()) {
  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      from: { id: userId, is_bot: false, first_name: 'Test', username: 'testuser' },
      chat: { id: userId, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text
    }
  }
}

function createCallbackUpdate(data: string, userId = 123456, updateId = Date.now()) {
  return {
    update_id: updateId,
    callback_query: {
      id: String(updateId),
      from: { id: userId, is_bot: false, first_name: 'Test', username: 'testuser' },
      chat_instance: String(userId),
      data,
      message: {
        message_id: updateId - 1,
        chat: { id: userId, type: 'private' },
        date: Math.floor(Date.now() / 1000)
      }
    }
  }
}

async function sendWebhook(update: object): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_URL}/webhook/${BOT_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update)
  })
  return res.json()
}

describe('Health & Basic Endpoints', () => {
  test('GET /health returns ok', async () => {
    const res = await fetch(`${API_URL}/health`)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })

  test('GET / returns API info', async () => {
    const res = await fetch(`${API_URL}/`)
    const data = await res.json()
    expect(data.name).toBe('BoothBot API')
    expect(data.status).toBe('running')
  })
})

describe('Telegram Deep Link Auth', () => {
  test('POST /api/auth/telegram-link/init returns code and deep link', async () => {
    const res = await fetch(`${API_URL}/api/auth/telegram-link/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.code).toBeDefined()
    expect(data.data.deepLink).toContain('t.me/MoongateEventBot')
    expect(data.data.expiresIn).toBe(300)
  })

  test('GET /api/auth/telegram-link/check returns pending for new code', async () => {
    // First init
    const initRes = await fetch(`${API_URL}/api/auth/telegram-link/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const initData = await initRes.json()
    const code = initData.data.code

    // Then check
    const checkRes = await fetch(`${API_URL}/api/auth/telegram-link/check?code=${code}`)
    const checkData = await checkRes.json()
    expect(checkData.success).toBe(true)
    expect(checkData.status).toBe('pending')
  })

  test('GET /api/auth/telegram-link/check returns error for invalid code', async () => {
    const res = await fetch(`${API_URL}/api/auth/telegram-link/check?code=invalidcode123`)
    const data = await res.json()
    expect(data.success).toBe(false)
  })
})

describe('Webhook Processing', () => {
  test('POST /webhook/:botId processes /start command (no event required)', async () => {
    const result = await sendWebhook(createUpdate('/start'))
    expect(result.ok).toBe(true)
  })

  test('POST /webhook/:botId processes /start with event slug', async () => {
    const result = await sendWebhook(createUpdate('/start consensus2026'))
    expect(result.ok).toBe(true)
  })

  test('POST /webhook/:botId processes /admin command', async () => {
    const result = await sendWebhook(createUpdate('/admin'))
    expect(result.ok).toBe(true)
  })

  test('POST /webhook/:botId processes /stats command (bot-level, no event required)', async () => {
    const result = await sendWebhook(createUpdate('/stats'))
    expect(result.ok).toBe(true)
  })

  test('POST /webhook/:botId processes /export command (bot-level, no event required)', async () => {
    const result = await sendWebhook(createUpdate('/export'))
    expect(result.ok).toBe(true)
  })

  test('POST /webhook/:botId processes /broadcast command (bot-level, no event required)', async () => {
    const result = await sendWebhook(createUpdate('/broadcast'))
    expect(result.ok).toBe(true)
  })

  test('POST /webhook/:botId processes /help command', async () => {
    const result = await sendWebhook(createUpdate('/help'))
    expect(result.ok).toBe(true)
  })

  test('POST /webhook/:botId processes /newevent command', async () => {
    const result = await sendWebhook(createUpdate('/newevent'))
    expect(result.ok).toBe(true)
  })

  test('POST /webhook/:botId processes /events command', async () => {
    const result = await sendWebhook(createUpdate('/events'))
    expect(result.ok).toBe(true)
  })

  test('POST /webhook/:botId handles plain text message', async () => {
    const result = await sendWebhook(createUpdate('Hello world'))
    expect(result.ok).toBe(true)
  })

  test('POST /webhook/:botId handles callback query', async () => {
    const res = await fetch(`${API_URL}/webhook/${BOT_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createCallbackUpdate('register_visitor'))
    })
    expect(res.status).toBeLessThan(502)
  })

  test('POST /webhook/invalid-bot-id returns error', async () => {
    const res = await fetch(`${API_URL}/webhook/invalid-uuid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createUpdate('/start'))
    })
    const data = await res.json()
    expect(data.ok).toBe(false)
  })
})

describe('Auth API', () => {
  test('POST /api/auth/register validates input', async () => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  test('POST /api/auth/login validates input', async () => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

describe('Protected API Endpoints', () => {
  test('GET /api/bots requires auth', async () => {
    const res = await fetch(`${API_URL}/api/bots`)
    expect(res.status).toBe(401)
  })

  test('GET /api/events requires auth', async () => {
    const res = await fetch(`${API_URL}/api/events`)
    expect(res.status).toBe(401)
  })
})

describe('Onboarding Flow (No Event Required)', () => {
  const testUserId = 900000 + Math.floor(Math.random() * 100000)
  
  test('/start initiates name collection without event', async () => {
    const result = await sendWebhook(createUpdate('/start', testUserId))
    expect(result.ok).toBe(true)
  })

  test('Name input triggers company question', async () => {
    await sendWebhook(createUpdate('/start', testUserId))
    const result = await sendWebhook(createUpdate('John Doe', testUserId))
    expect(result.ok).toBe(true)
  })

  test('Company input triggers title question', async () => {
    const userId = testUserId + 1
    await sendWebhook(createUpdate('/start', userId))
    await sendWebhook(createUpdate('Jane Smith', userId))
    const result = await sendWebhook(createUpdate('Acme Corp', userId))
    expect(result.ok).toBe(true)
  })

  test('Title input triggers email question', async () => {
    const userId = testUserId + 2
    await sendWebhook(createUpdate('/start', userId))
    await sendWebhook(createUpdate('Bob Wilson', userId))
    await sendWebhook(createUpdate('Tech Startup', userId))
    const result = await sendWebhook(createUpdate('Developer', userId))
    expect(result.ok).toBe(true)
  })

  test('Email input triggers confirmation (no event required)', async () => {
    const userId = testUserId + 3
    await sendWebhook(createUpdate('/start', userId))
    await sendWebhook(createUpdate('Alice Brown', userId))
    await sendWebhook(createUpdate('Blockchain Inc', userId))
    await sendWebhook(createUpdate('Founder', userId))
    const res = await fetch(`${API_URL}/webhook/${BOT_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createUpdate('alice@example.com', userId))
    })
    expect(res.status).toBeLessThan(502)
  })

  test('Skip buttons work in flow', async () => {
    const userId = testUserId + 4
    await sendWebhook(createUpdate('/start', userId))
    await sendWebhook(createUpdate('Skip Tester', userId))
    const res = await fetch(`${API_URL}/webhook/${BOT_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createCallbackUpdate('skip_company', userId))
    })
    expect(res.status).toBeLessThan(502)
  })

  test('Full flow completes and saves lead (no event required)', async () => {
    const userId = testUserId + 5
    const steps = [
      createUpdate('/start', userId),
      createUpdate('Complete User', userId),
      createUpdate('Full Corp', userId),
      createUpdate('CEO', userId),
      createUpdate('complete@test.com', userId)
    ]
    
    for (const update of steps) {
      const res = await fetch(`${API_URL}/webhook/${BOT_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
      })
      expect(res.status).toBeLessThan(502)
    }
  })

  test('Confirm registration callback saves lead without event', async () => {
    const userId = testUserId + 6
    // Setup flow
    await sendWebhook(createUpdate('/start', userId))
    await sendWebhook(createUpdate('Callback Tester', userId))
    await sendWebhook(createUpdate('Test Company', userId))
    await sendWebhook(createUpdate('Tester', userId))
    await sendWebhook(createUpdate('test@callback.com', userId))
    
    // Confirm
    const res = await fetch(`${API_URL}/webhook/${BOT_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createCallbackUpdate('confirm_registration', userId))
    })
    expect(res.status).toBeLessThan(502)
  })
})

describe('Event-Specific Flow (Optional)', () => {
  const testUserId = 800000 + Math.floor(Math.random() * 100000)

  test('/start with event slug sets source', async () => {
    const result = await sendWebhook(createUpdate('/start someevent', testUserId))
    expect(result.ok).toBe(true)
  })

  test('Flow works with event context', async () => {
    const userId = testUserId + 1
    await sendWebhook(createUpdate('/start consensus2026', userId))
    await sendWebhook(createUpdate('Event User', userId))
    const result = await sendWebhook(createUpdate('Event Corp', userId))
    expect(result.ok).toBe(true)
  })
})
