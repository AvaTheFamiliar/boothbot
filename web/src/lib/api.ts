const API_URL = 'https://boothbot-api-production.up.railway.app'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  status?: string
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('token')
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Request failed', status: data.status }
    }

    return { data: data.data, status: data.status }
  } catch (error) {
    return { error: 'Network error' }
  }
}

interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export const api = {
  register: (email: string, password: string) =>
    request<{ token: string; tenant: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; tenant: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Legacy widget auth (keeping for compatibility)
  loginWithTelegram: (data: TelegramAuthData) =>
    request<{ token: string; tenant: any }>('/api/auth/telegram', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Deep link auth - step 1: init
  initTelegramLogin: () =>
    request<{ code: string; deepLink: string; expiresIn: number }>('/api/auth/telegram-link/init', {
      method: 'POST',
    }),

  // Deep link auth - step 2: check status
  checkTelegramLogin: (code: string) =>
    request<{ token: string; tenant: any } | null>(`/api/auth/telegram-link/check?code=${code}`),

  getBots: () => request<any[]>('/api/bots'),
  
  createBot: (token: string) =>
    request<any>('/api/bots', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  getEvents: (botId: string) => request<any[]>(`/api/events?botId=${botId}`),
  
  createEvent: (botId: string, name: string, slug: string) =>
    request<any>('/api/events', {
      method: 'POST',
      body: JSON.stringify({ botId, name, slug }),
    }),

  getVisitors: (eventId: string) => request<any[]>(`/api/events/${eventId}/visitors`),
}
