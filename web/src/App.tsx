import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { api } from './lib/api'

// Moongate color palette
const colors = {
  bg: '#0a0a0a',
  bgCard: '#141414',
  primary: '#FF6B35', // Orange
  primaryHover: '#FF8C42',
  accent: '#4ADE80', // Green
  text: '#ffffff',
  textMuted: '#a0a0a0',
  border: '#2a2a2a',
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
      return true
    }
    return false
  }

  const register = async (email: string, password: string) => {
    const result = await api.register(email, password)
    if (result.data) {
      localStorage.setItem('token', result.data.token)
      localStorage.setItem('user', JSON.stringify(result.data.tenant))
      setToken(result.data.token)
      setUser(result.data.tenant)
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return { token, user, login, register, logout }
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

function LoginPage({ onLogin }: { onLogin: (email: string, password: string) => Promise<boolean> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const success = await onLogin(email, password)
    setLoading(false)
    if (success) {
      navigate('/')
    } else {
      setError('Invalid credentials')
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ backgroundColor: colors.bgCard, padding: 40, borderRadius: 16, maxWidth: 400, width: '100%', border: `1px solid ${colors.border}` }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: colors.text, marginBottom: 8 }}>
            <span style={{ color: colors.primary }}>Booth</span>Bot
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 14 }}>Capture leads at crypto events</p>
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
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: colors.textMuted }}>
          Don't have an account? <Link to="/register" style={{ color: colors.primary, textDecoration: 'none' }}>Sign up</Link>
        </p>
        
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${colors.border}`, textAlign: 'center' }}>
          <p style={{ color: colors.textMuted, fontSize: 12 }}>Or create via Telegram</p>
          <a href="https://t.me/MoongateEventBot" target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 20px', backgroundColor: '#2AABEE', color: 'white', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>
            <span>💬</span> Open in Telegram
          </a>
        </div>
      </div>
    </div>
  )
}

function RegisterPage({ onRegister }: { onRegister: (email: string, password: string) => Promise<boolean> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const success = await onRegister(email, password)
    setLoading(false)
    if (success) {
      navigate('/')
    } else {
      setError('Registration failed')
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ backgroundColor: colors.bgCard, padding: 40, borderRadius: 16, maxWidth: 400, width: '100%', border: `1px solid ${colors.border}` }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: colors.text, marginBottom: 8 }}>
            <span style={{ color: colors.primary }}>Booth</span>Bot
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 14 }}>Create your account</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && <div style={{ padding: 12, backgroundColor: '#3f1f1f', color: '#ff6b6b', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
          
          <div style={{ marginBottom: 16 }}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} required />
          </div>
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        
        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: colors.textMuted }}>
          Already have an account? <Link to="/login" style={{ color: colors.primary, textDecoration: 'none' }}>Sign in</Link>
        </p>
        
        <div style={{ marginTop: 24, padding: 16, backgroundColor: colors.bg, borderRadius: 8, textAlign: 'center' }}>
          <p style={{ color: colors.accent, fontSize: 13, fontWeight: 500 }}>🎁 Free until 25 contacts</p>
          <p style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>Then $100/mo per 1,000 contacts</p>
        </div>
      </div>
    </div>
  )
}

function DashboardPage({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [bots, setBots] = useState<any[]>([])
  const [newToken, setNewToken] = useState('')
  const [loading, setLoading] = useState(true)

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
    const result = await api.createBot(newToken)
    if (result.data) {
      setBots([...bots, result.data])
      setNewToken('')
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      <nav style={{ backgroundColor: colors.bgCard, borderBottom: `1px solid ${colors.border}`, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text }}>
          <span style={{ color: colors.primary }}>Booth</span>Bot
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: colors.textMuted, fontSize: 14 }}>{user?.email}</span>
          <button onClick={onLogout} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, cursor: 'pointer', fontSize: 14 }}>Logout</button>
        </div>
      </nav>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ color: colors.text, fontSize: 18, marginBottom: 16 }}>Add Your Bot</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              placeholder="Paste bot token from @BotFather"
              value={newToken}
              onChange={e => setNewToken(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={addBot} style={{ ...buttonStyle, width: 'auto', padding: '12px 32px' }}>Add Bot</button>
          </div>
        </div>

        <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24 }}>
          <h2 style={{ color: colors.text, fontSize: 18, marginBottom: 16 }}>Your Bots</h2>
          {loading ? (
            <p style={{ color: colors.textMuted }}>Loading...</p>
          ) : bots.length === 0 ? (
            <p style={{ color: colors.textMuted }}>No bots yet. Add one above or use <a href="https://t.me/MoongateEventBot" style={{ color: colors.primary }}>@MoongateEventBot</a> on Telegram.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {bots.map(bot => (
                <div key={bot.id} style={{ padding: 16, backgroundColor: colors.bg, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: colors.text, fontWeight: 500 }}>@{bot.username}</div>
                    <div style={{ color: colors.textMuted, fontSize: 12 }}>ID: {bot.id.slice(0, 8)}...</div>
                  </div>
                  <span style={{ padding: '4px 12px', backgroundColor: colors.accent + '20', color: colors.accent, borderRadius: 20, fontSize: 12 }}>Active</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ marginTop: 24, padding: 16, backgroundColor: colors.bg, borderRadius: 8, border: `1px solid ${colors.border}` }}>
          <p style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
            🎁 <span style={{ color: colors.accent }}>Free tier:</span> Up to 25 contacts • 
            <span style={{ color: colors.text }}> Pro:</span> $100/mo per 1,000 contacts
          </p>
        </div>
      </main>
    </div>
  )
}

function AppContent() {
  const { token, user, login, register, logout } = useLocalAuth()

  if (!token) {
    return (
      <Routes>
        <Route path="/register" element={<RegisterPage onRegister={register} />} />
        <Route path="*" element={<LoginPage onLogin={login} />} />
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
