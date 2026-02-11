const API_URL = 'https://boothbot-api-production.up.railway.app'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
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
      return { error: data.error || 'Request failed' }
    }

    return { data }
  } catch (error) {
    return { error: 'Network error' }
  }
}

export const api = {
  register: (email: string, password: string) =>
    request<{ token: string; tenant: { id: string; email: string } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; tenant: { id: string; email: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

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
