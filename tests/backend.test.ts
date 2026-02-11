import { describe, test, expect, beforeAll } from 'bun:test'

const API_URL = process.env.API_URL || 'https://boothbot-api-production.up.railway.app'
const BOT_ID = '6b196a88-abfd-43c7-b5f1-6c5e29b5b16f'
const BOT_TOKEN = '8310981156:AAHU_0dxXSsIP6fOvVVc5KV6P9fBeqVkAjQ'

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

describe('Webhook Processing', () => {
  test('POST /webhook/:botId processes /start command', async () => {
    const result = await sendWebhook(createUpdate('/start'))
    expect(result.ok).toBe(true)
  })

  test('POST /webhook/:botId processes /admin command', async () => {
    const result = await sendWebhook(createUpdate('/admin'))
    expect(result.ok).toBe(true)
  })

  test('POST /webhook/:botId processes /stats command', async () => {
    const result = await sendWebhook(createUpdate('/stats'))
    expect(result.ok).toBe(true)
  })

  test('POST /webhook/:botId processes /export command', async () => {
    const result = await sendWebhook(createUpdate('/export'))
    expect(result.ok).toBe(true)
  })

  test('POST /webhook/:botId processes /broadcast command', async () => {
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

  test('POST /webhook/:botId handles callback query (may fail on answerCallbackQuery)', async () => {
    // Note: This test uses a fake callback_query id, so answerCallbackQuery will fail
    // We just verify the webhook doesn't crash completely
    const res = await fetch(`${API_URL}/webhook/${BOT_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createCallbackUpdate('register_visitor'))
    })
    // Accept either success or handled error (not 502/503)
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
