const API_BASE = '/api'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

class ApiClient {
  private token: string | null = null

  constructor() {
    this.token = localStorage.getItem('token')
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem('token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('token')
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    return response.json()
  }

  async register(email: string, password: string) {
    return this.request<{ token: string; tenant: { id: string; email: string } }>(
      'POST',
      '/auth/register',
      { email, password }
    )
  }

  async login(email: string, password: string) {
    return this.request<{ token: string; tenant: { id: string; email: string } }>(
      'POST',
      '/auth/login',
      { email, password }
    )
  }

  async getBots() {
    return this.request<any[]>('GET', '/bots')
  }

  async createBot(token: string, username: string, ownerTelegramId?: number) {
    return this.request<any>('POST', '/bots', {
      token,
      username,
      owner_telegram_id: ownerTelegramId
    })
  }

  async deleteBot(botId: string) {
    return this.request('DELETE', `/bots/${botId}`)
  }

  async getEvents(botId: string) {
    return this.request<any[]>('GET', `/events?botId=${botId}`)
  }

  async createEvent(botId: string, name: string, description?: string) {
    return this.request<any>('POST', '/events', {
      bot_id: botId,
      name,
      description
    })
  }

  async deleteEvent(eventId: string) {
    return this.request('DELETE', `/events/${eventId}`)
  }

  async getVisitors(eventId: string) {
    return this.request<any[]>('GET', `/events/${eventId}/visitors`)
  }

  async getEventStats(eventId: string) {
    return this.request<any>('GET', `/events/${eventId}/stats`)
  }

  async broadcast(eventId: string, message: string) {
    return this.request<any>('POST', `/events/${eventId}/broadcast`, { message })
  }

  getQRUrl(eventId: string): string {
    return `${API_BASE}/events/${eventId}/qr`
  }

  getExportUrl(eventId: string): string {
    return `${API_BASE}/events/${eventId}/export`
  }
}

export const api = new ApiClient()
