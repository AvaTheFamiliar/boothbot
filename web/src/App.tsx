import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { api } from './lib/api'

// Moongate color palette
const colors = {
  bg: '#0a0a0a',
  bgCard: '#141414',
  primary: '#FF6B35',
  primaryHover: '#FF8C42',
  accent: '#4ADE80',
  text: '#ffffff',
  textMuted: '#a0a0a0',
  border: '#2a2a2a',
  telegram: '#2AABEE',
}

const BOT_USERNAME = 'MoongateEventBot'

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void
  }
}

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

function useLocalAuth() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<any>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  )

  const login = async (email: string, password: string) => {
    const result = await api.login(email, password)
    if (result.data) {
      localStorage.setItem('token', result.data.token)
      localStorage.setItem('user', JSON.stringify(result.data.tenant))
      setToken(result.data.token)
      setUser(result.data.tenant)
      return { success: true }
    }
    return { success: false, error: result.error }
  }

  const loginWithTelegram = async (tgUser: TelegramUser) => {
    const result = await api.loginWithTelegram(tgUser)
    if (result.data) {
      localStorage.setItem('token', result.data.token)
      localStorage.setItem('user', JSON.stringify(result.data.tenant))
      setToken(result.data.token)
      setUser(result.data.tenant)
      return { success: true }
    }
    return { success: false, error: result.error }
  }

  const register = async (email: string, password: string) => {
    const result = await api.register(email, password)
    if (result.data) {
      localStorage.setItem('token', result.data.token)
      localStorage.setItem('user', JSON.stringify(result.data.tenant))
      setToken(result.data.token)
      setUser(result.data.tenant)
      return { success: true }
    }
    return { success: false, error: result.error }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return { token, user, login, loginWithTelegram, register, logout }
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  fontSize: '14px',
  backgroundColor: colors.bgCard,
  border: `1px solid ${colors.border}`,
  borderRadius: '8px',
  color: colors.text,
  outline: 'none',
}

const buttonStyle: React.CSSProperties = {
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: '600',
  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%)`,
  color: colors.text,
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  width: '100%',
}

function TelegramLoginButton({ onAuth }: { onAuth: (user: TelegramUser) => void }) {
  useEffect(() => {
    window.onTelegramAuth = onAuth
    
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.async = true
    
    const container = document.getElementById('telegram-login-container')
    if (container) {
      container.innerHTML = ''
      container.appendChild(script)
    }
    
    return () => {
      delete window.onTelegramAuth
    }
  }, [onAuth])

  return <div id="telegram-login-container" style={{ display: 'flex', justifyContent: 'center' }} />
}

function LoginPage({ 
  onLogin, 
  onTelegramLogin 
}: { 
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  onTelegramLogin: (user: TelegramUser) => Promise<{ success: boolean; error?: string }>
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await onLogin(email, password)
    setLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error || 'Invalid credentials')
    }
  }

  const handleTelegramAuth = useCallback(async (user: TelegramUser) => {
    setLoading(true)
    setError('')
    const result = await onTelegramLogin(user)
    setLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error || 'Telegram login failed')
    }
  }, [onTelegramLogin, navigate])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ backgroundColor: colors.bgCard, padding: 40, borderRadius: 16, maxWidth: 420, width: '100%', border: `1px solid ${colors.border}` }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: colors.text, marginBottom: 8 }}>
            <span style={{ color: colors.primary }}>Moongate</span> Booths
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 14, lineHeight: 1.5 }}>
            Turn booth visitors into qualified leads with a Telegram bot
          </p>
        </div>

        {/* Telegram Login - Primary */}
        <div style={{ marginBottom: 24 }}>
          <TelegramLoginButton onAuth={handleTelegramAuth} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <span style={{ color: colors.textMuted, fontSize: 12 }}>or with email</span>
          <div style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && <div style={{ padding: 12, backgroundColor: '#3f1f1f', color: '#ff6b6b', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
          
          <div style={{ marginBottom: 16 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: colors.textMuted }}>
          Don't have an account? <Link to="/register" style={{ color: colors.primary, textDecoration: 'none' }}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}

function RegisterPage({ 
  onRegister,
  onTelegramLogin
}: { 
  onRegister: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  onTelegramLogin: (user: TelegramUser) => Promise<{ success: boolean; error?: string }>
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await onRegister(email, password)
    setLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error || 'Registration failed')
    }
  }

  const handleTelegramAuth = useCallback(async (user: TelegramUser) => {
    setLoading(true)
    setError('')
    const result = await onTelegramLogin(user)
    setLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error || 'Telegram login failed')
    }
  }, [onTelegramLogin, navigate])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ backgroundColor: colors.bgCard, padding: 40, borderRadius: 16, maxWidth: 420, width: '100%', border: `1px solid ${colors.border}` }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: colors.text, marginBottom: 8 }}>
            <span style={{ color: colors.primary }}>Moongate</span> Booths
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 14, lineHeight: 1.5 }}>
            Start capturing leads in minutes
          </p>
        </div>

        {/* Telegram Login - Primary */}
        <div style={{ marginBottom: 24 }}>
          <TelegramLoginButton onAuth={handleTelegramAuth} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <span style={{ color: colors.textMuted, fontSize: 12 }}>or with email</span>
          <div style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && <div style={{ padding: 12, backgroundColor: '#3f1f1f', color: '#ff6b6b', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
          
          <div style={{ marginBottom: 16 }}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} minLength={6} required />
          </div>
          <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        
        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: colors.textMuted }}>
          Already have an account? <Link to="/login" style={{ color: colors.primary, textDecoration: 'none' }}>Sign in</Link>
        </p>
        
        <div style={{ marginTop: 24, padding: 16, backgroundColor: colors.bg, borderRadius: 8, textAlign: 'center' }}>
          <p style={{ color: colors.accent, fontSize: 13, fontWeight: 500 }}>🎁 Free for your first 25 leads</p>
          <p style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>Then $100/mo per 1,000 leads captured</p>
        </div>
      </div>
    </div>
  )
}

function DashboardPage({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [bots, setBots] = useState<any[]>([])
  const [newToken, setNewToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadBots()
  }, [])

  const loadBots = async () => {
    const result = await api.getBots()
    if (result.data) setBots(result.data)
    setLoading(false)
  }

  const addBot = async () => {
    if (!newToken) return
    setAdding(true)
    const result = await api.createBot(newToken)
    setAdding(false)
    if (result.data) {
      setBots([...bots, result.data])
      setNewToken('')
    }
  }

  const displayName = user?.username ? `@${user.username}` : user?.first_name || user?.email

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      <nav style={{ backgroundColor: colors.bgCard, borderBottom: `1px solid ${colors.border}`, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text }}>
          <span style={{ color: colors.primary }}>Moongate</span> Booths
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: colors.textMuted, fontSize: 14 }}>{displayName}</span>
          <button onClick={onLogout} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, cursor: 'pointer', fontSize: 14 }}>Logout</button>
        </div>
      </nav>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        {/* Quick Start */}
        <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ color: colors.text, fontSize: 18, marginBottom: 8 }}>Connect Your Bot</h2>
          <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: 16 }}>
            Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener" style={{ color: colors.primary }}>@BotFather</a> and paste the token below
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={newToken}
              onChange={e => setNewToken(e.target.value)}
              style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: 13 }}
            />
            <button onClick={addBot} disabled={adding || !newToken} style={{ ...buttonStyle, width: 'auto', padding: '12px 32px', opacity: adding || !newToken ? 0.6 : 1 }}>
              {adding ? 'Adding...' : 'Add Bot'}
            </button>
          </div>
        </div>

        {/* Bots List */}
        <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24 }}>
          <h2 style={{ color: colors.text, fontSize: 18, marginBottom: 16 }}>Your Bots</h2>
          {loading ? (
            <p style={{ color: colors.textMuted }}>Loading...</p>
          ) : bots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: colors.textMuted, marginBottom: 16 }}>No bots connected yet</p>
              <p style={{ color: colors.textMuted, fontSize: 13 }}>
                Or try our demo: <a href="https://t.me/MoongateEventBot" target="_blank" rel="noopener" style={{ color: colors.primary }}>@MoongateEventBot</a>
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {bots.map(bot => (
                <div key={bot.id} style={{ padding: 16, backgroundColor: colors.bg, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: colors.text, fontWeight: 500 }}>@{bot.username}</div>
                    <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {bot.visitor_count || 0} leads captured
                    </div>
                  </div>
                  <span style={{ padding: '4px 12px', backgroundColor: colors.accent + '20', color: colors.accent, borderRadius: 20, fontSize: 12 }}>Active</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Pricing Note */}
        <div style={{ marginTop: 24, padding: 16, backgroundColor: colors.bg, borderRadius: 8, border: `1px solid ${colors.border}` }}>
          <p style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
            <span style={{ color: colors.accent }}>🎁 Free tier:</span> First 25 leads free • 
            <span style={{ color: colors.text }}> Pro:</span> $100/mo per 1,000 leads
          </p>
        </div>
      </main>
    </div>
  )
}

function AppContent() {
  const { token, user, login, loginWithTelegram, register, logout } = useLocalAuth()

  if (!token) {
    return (
      <Routes>
        <Route path="/register" element={<RegisterPage onRegister={register} onTelegramLogin={loginWithTelegram} />} />
        <Route path="*" element={<LoginPage onLogin={login} onTelegramLogin={loginWithTelegram} />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="*" element={<DashboardPage user={user} onLogout={logout} />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
