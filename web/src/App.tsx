import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { api } from './lib/api'

// Simple state management instead of context
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
      setError('Login failed')
    }
  }

  return (
    <div style={{ padding: 40, maxWidth: 400, margin: '0 auto' }}>
      <h1>BoothBot Login</h1>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={{ marginBottom: 16 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        <Link to="/register">Register instead</Link>
      </p>
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
    <div style={{ padding: 40, maxWidth: 400, margin: '0 auto' }}>
      <h1>BoothBot Register</h1>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={{ marginBottom: 16 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
          {loading ? 'Loading...' : 'Register'}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        <Link to="/login">Login instead</Link>
      </p>
    </div>
  )
}

function DashboardPage({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [bots, setBots] = useState<any[]>([])
  const [newToken, setNewToken] = useState('')

  const loadBots = async () => {
    const result = await api.getBots()
    if (result.data) setBots(result.data)
  }

  const addBot = async () => {
    if (!newToken) return
    const result = await api.createBot(newToken)
    if (result.data) {
      setBots([...bots, result.data])
      setNewToken('')
    }
  }

  useState(() => { loadBots() })

  return (
    <div style={{ padding: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>BoothBot Dashboard</h1>
        <div>
          <span>{user?.email}</span>
          <button onClick={onLogout} style={{ marginLeft: 16 }}>Logout</button>
        </div>
      </div>
      
      <div style={{ marginBottom: 20 }}>
        <h2>Add Bot</h2>
        <input
          type="text"
          placeholder="Bot token from @BotFather"
          value={newToken}
          onChange={e => setNewToken(e.target.value)}
          style={{ width: 300, padding: 8, marginRight: 8 }}
        />
        <button onClick={addBot}>Add</button>
      </div>

      <div>
        <h2>Your Bots ({bots.length})</h2>
        {bots.map(bot => (
          <div key={bot.id} style={{ padding: 10, border: '1px solid #ccc', marginBottom: 8 }}>
            @{bot.username} - {bot.id}
          </div>
        ))}
      </div>
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
