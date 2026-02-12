import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
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

function useLocalAuth() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<any>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  )

  const loginWithToken = (data: { token: string; tenant: any }) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.tenant))
    setToken(data.token)
    setUser(data.tenant)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return { token, user, loginWithToken, logout }
}

// Telegram Deep Link Login Button
function TelegramLoginButton({ onSuccess }: { onSuccess: (data: { token: string; tenant: any }) => void }) {
  const [status, setStatus] = useState<'idle' | 'waiting' | 'error'>('idle')
  const [error, setError] = useState('')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startLogin = async () => {
    setStatus('waiting')
    setError('')
    
    try {
      const result = await api.initTelegramLogin()
      
      if (!result.data) {
        setError(result.error || 'Failed to initialize login')
        setStatus('error')
        return
      }
      
      const { code, deepLink } = result.data
      
      // Open Telegram deep link
      window.open(deepLink, '_blank')
      
      // Start polling for approval
      let attempts = 0
      const maxAttempts = 60
      
      pollingRef.current = setInterval(async () => {
        attempts++
        
        if (attempts > maxAttempts) {
          clearInterval(pollingRef.current!)
          setError('Login request expired')
          setStatus('error')
          return
        }
        
        const checkResult = await api.checkTelegramLogin(code)
        
        if (checkResult.status === 'approved' && checkResult.data) {
          clearInterval(pollingRef.current!)
          onSuccess(checkResult.data)
        } else if (checkResult.status === 'denied') {
          clearInterval(pollingRef.current!)
          setError('Login was denied')
          setStatus('error')
        } else if (checkResult.status === 'expired') {
          clearInterval(pollingRef.current!)
          setError('Login request expired')
          setStatus('error')
        }
      }, 2000)
      
    } catch (err) {
      setError('Failed to start login')
      setStatus('error')
    }
  }

  const cancelLogin = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
    setStatus('idle')
    setError('')
  }

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  if (status === 'waiting') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          padding: '20px 24px', 
          backgroundColor: colors.telegram + '15', 
          borderRadius: 12,
          border: `1px solid ${colors.telegram}30`,
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 20,
              height: 20,
              border: `3px solid ${colors.telegram}40`,
              borderTopColor: colors.telegram,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ color: colors.telegram, fontWeight: 600, fontSize: 16 }}>Waiting for Telegram...</span>
          </div>
          <p style={{ color: colors.textMuted, fontSize: 14, margin: 0 }}>
            Tap <b>Approve</b> in the Telegram app to continue
          </p>
        </div>
        <button 
          onClick={cancelLogin}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: 'transparent', 
            border: `1px solid ${colors.border}`, 
            borderRadius: 8, 
            color: colors.textMuted, 
            cursor: 'pointer', 
            fontSize: 14 
          }}
        >
          Cancel
        </button>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div style={{ 
          padding: 12, 
          backgroundColor: '#3f1f1f', 
          color: '#ff6b6b', 
          borderRadius: 8, 
          marginBottom: 16, 
          fontSize: 14,
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
      <button
        onClick={startLogin}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          width: '100%',
          padding: '16px 24px',
          backgroundColor: colors.telegram,
          color: 'white',
          border: 'none',
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.094.034.31.019.478z"/>
        </svg>
        Continue with Telegram
      </button>
    </div>
  )
}

function LoginPage({ onLoginWithToken }: { onLoginWithToken: (data: { token: string; tenant: any }) => void }) {
  const navigate = useNavigate()

  const handleTelegramSuccess = (data: { token: string; tenant: any }) => {
    onLoginWithToken(data)
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ backgroundColor: colors.bgCard, padding: 48, borderRadius: 20, maxWidth: 440, width: '100%', border: `1px solid ${colors.border}` }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: colors.text, marginBottom: 12 }}>
            <span style={{ color: colors.primary }}>Moongate</span> Booths
          </h1>
          <p style={{ color: colors.textMuted, fontSize: 15, lineHeight: 1.6 }}>
            Turn booth visitors into qualified leads<br />with your own Telegram bot
          </p>
        </div>

        <TelegramLoginButton onSuccess={handleTelegramSuccess} />
        
        <div style={{ marginTop: 32, padding: 16, backgroundColor: colors.bg, borderRadius: 10, textAlign: 'center' }}>
          <p style={{ color: colors.accent, fontSize: 14, fontWeight: 500, marginBottom: 4 }}>🎁 Free for your first 25 leads</p>
          <p style={{ color: colors.textMuted, fontSize: 13 }}>Then $100/mo per 1,000 leads captured</p>
        </div>
      </div>
    </div>
  )
}

interface Lead {
  id: string
  telegram_id: number
  telegram_username: string | null
  full_name: string | null
  company: string | null
  title: string | null
  email: string | null
  source: string | null
  created_at: string
}

function LeadsTable({ botId, botUsername, onBack }: { botId: string; botUsername: string; onBack: () => void }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeads()
  }, [botId])

  const loadLeads = async () => {
    setLoading(true)
    const result = await api.getLeads(botId)
    if (result.data) setLeads(result.data)
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button 
          onClick={onBack}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: 'transparent', 
            border: `1px solid ${colors.border}`, 
            borderRadius: 6, 
            color: colors.text, 
            cursor: 'pointer', 
            fontSize: 14 
          }}
        >
          ← Back
        </button>
        <h2 style={{ color: colors.text, fontSize: 20, margin: 0 }}>
          Leads for @{botUsername}
        </h2>
        <span style={{ color: colors.textMuted, fontSize: 14 }}>({leads.length} total)</span>
      </div>

      {loading ? (
        <p style={{ color: colors.textMuted }}>Loading leads...</p>
      ) : leads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, backgroundColor: colors.bgCard, borderRadius: 12, border: `1px solid ${colors.border}` }}>
          <p style={{ color: colors.textMuted, fontSize: 16 }}>No leads yet</p>
          <p style={{ color: colors.textMuted, fontSize: 14, marginTop: 8 }}>
            Share your bot link or QR code to start capturing leads
          </p>
        </div>
      ) : (
        <div style={{ backgroundColor: colors.bgCard, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: colors.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: colors.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Telegram</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: colors.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Company</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: colors.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Title</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: colors.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: colors.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Source</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: colors.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={lead.id} style={{ borderBottom: i < leads.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: 14 }}>{lead.full_name || '—'}</td>
                    <td style={{ padding: '14px 16px', color: colors.primary, fontSize: 14 }}>
                      {lead.telegram_username ? (
                        <a href={`https://t.me/${lead.telegram_username}`} target="_blank" rel="noopener" style={{ color: colors.primary, textDecoration: 'none' }}>
                          @{lead.telegram_username}
                        </a>
                      ) : (
                        <span style={{ color: colors.textMuted }}>ID: {lead.telegram_id}</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: 14 }}>{lead.company || '—'}</td>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: 14 }}>{lead.title || '—'}</td>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: 14 }}>{lead.email || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 14 }}>
                      <span style={{ 
                        padding: '3px 8px', 
                        backgroundColor: lead.source?.startsWith('event:') ? colors.primary + '20' : colors.accent + '20',
                        color: lead.source?.startsWith('event:') ? colors.primary : colors.accent,
                        borderRadius: 12, 
                        fontSize: 12 
                      }}>
                        {lead.source || 'direct'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: colors.textMuted, fontSize: 13 }}>
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardPage({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [bots, setBots] = useState<any[]>([])
  const [newToken, setNewToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedBot, setSelectedBot] = useState<any | null>(null)

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

  // Show leads table if a bot is selected
  if (selectedBot) {
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
        <main style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
          <LeadsTable 
            botId={selectedBot.id} 
            botUsername={selectedBot.username} 
            onBack={() => setSelectedBot(null)} 
          />
        </main>
      </div>
    )
  }

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
                <div 
                  key={bot.id} 
                  onClick={() => setSelectedBot(bot)}
                  style={{ 
                    padding: 16, 
                    backgroundColor: colors.bg, 
                    borderRadius: 8, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    border: `1px solid transparent`,
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = colors.border}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div>
                    <div style={{ color: colors.text, fontWeight: 500 }}>@{bot.username}</div>
                    <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                      {bot.visitor_count || 0} leads captured
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ padding: '4px 12px', backgroundColor: colors.accent + '20', color: colors.accent, borderRadius: 20, fontSize: 12 }}>Active</span>
                    <span style={{ color: colors.textMuted, fontSize: 18 }}>→</span>
                  </div>
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
  const { token, user, loginWithToken, logout } = useLocalAuth()

  if (!token) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage onLoginWithToken={loginWithToken} />} />
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
