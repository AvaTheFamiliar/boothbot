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
  blue: '#60A5FA',
  purple: '#A78BFA',
  yellow: '#FBBF24',
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

// Simple bar chart component
function BarChart({ data, height = 120 }: { data: { date: string; count: number }[]; height?: number }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const barWidth = 100 / data.length

  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      <svg width="100%" height={height} style={{ overflow: 'visible' }}>
        {data.map((d, i) => {
          const barHeight = (d.count / maxCount) * (height - 20)
          return (
            <g key={d.date}>
              <rect
                x={`${i * barWidth + barWidth * 0.1}%`}
                y={height - 20 - barHeight}
                width={`${barWidth * 0.8}%`}
                height={barHeight}
                fill={d.count > 0 ? colors.primary : colors.border}
                rx="2"
              />
              {i % 7 === 0 && (
                <text x={`${i * barWidth + barWidth * 0.5}%`} y={height - 4} textAnchor="middle" fill={colors.textMuted} fontSize="10">
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
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
      window.open(deepLink, '_blank')
      
      let attempts = 0
      pollingRef.current = setInterval(async () => {
        attempts++
        if (attempts > 60) {
          clearInterval(pollingRef.current!)
          setError('Login request expired')
          setStatus('error')
          return
        }
        
        const checkResult = await api.checkTelegramLogin(code)
        if (checkResult.status === 'approved' && checkResult.data) {
          clearInterval(pollingRef.current!)
          onSuccess(checkResult.data)
        } else if (checkResult.status === 'denied' || checkResult.status === 'expired') {
          clearInterval(pollingRef.current!)
          setError(checkResult.status === 'denied' ? 'Login was denied' : 'Login request expired')
          setStatus('error')
        }
      }, 2000)
    } catch {
      setError('Failed to start login')
      setStatus('error')
    }
  }

  const cancelLogin = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    setStatus('idle')
    setError('')
  }

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current) }, [])

  if (status === 'waiting') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ padding: '20px 24px', backgroundColor: colors.telegram + '15', borderRadius: 12, border: `1px solid ${colors.telegram}30`, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 20, height: 20, border: `3px solid ${colors.telegram}40`, borderTopColor: colors.telegram, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: colors.telegram, fontWeight: 600, fontSize: 16 }}>Waiting for Telegram...</span>
          </div>
          <p style={{ color: colors.textMuted, fontSize: 14, margin: 0 }}>Tap <b>Approve</b> in the Telegram app to continue</p>
        </div>
        <button onClick={cancelLogin} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.textMuted, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div>
      {error && <div style={{ padding: 12, backgroundColor: '#3f1f1f', color: '#ff6b6b', borderRadius: 8, marginBottom: 16, fontSize: 14, textAlign: 'center' }}>{error}</div>}
      <button onClick={startLogin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '16px 24px', backgroundColor: colors.telegram, color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.094.034.31.019.478z"/></svg>
        Continue with Telegram
      </button>
    </div>
  )
}

function LoginPage({ onLoginWithToken }: { onLoginWithToken: (data: { token: string; tenant: any }) => void }) {
  const navigate = useNavigate()
  const handleTelegramSuccess = (data: { token: string; tenant: any }) => { onLoginWithToken(data); navigate('/') }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ backgroundColor: colors.bgCard, padding: 48, borderRadius: 20, maxWidth: 440, width: '100%', border: `1px solid ${colors.border}` }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: colors.text, marginBottom: 12 }}><span style={{ color: colors.primary }}>Moongate</span> Booths</h1>
          <p style={{ color: colors.textMuted, fontSize: 15, lineHeight: 1.6 }}>Turn booth visitors into qualified leads<br />with your own Telegram bot</p>
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

interface Lead { id: string; telegram_id: number; telegram_username: string | null; full_name: string | null; company: string | null; title: string | null; email: string | null; source: string | null; created_at: string }

function LeadsTable({ botId, botUsername, onBack }: { botId: string; botUsername: string; onBack: () => void }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadLeads() }, [botId])
  const loadLeads = async () => { setLoading(true); const r = await api.getLeads(botId); if (r.data) setLeads(r.data); setLoading(false) }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={onBack} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, cursor: 'pointer', fontSize: 14 }}>← Back</button>
        <h2 style={{ color: colors.text, fontSize: 20, margin: 0 }}>Leads for @{botUsername}</h2>
        <span style={{ color: colors.textMuted, fontSize: 14 }}>({leads.length} total)</span>
      </div>

      {loading ? <p style={{ color: colors.textMuted }}>Loading leads...</p> : leads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, backgroundColor: colors.bgCard, borderRadius: 12, border: `1px solid ${colors.border}` }}>
          <p style={{ color: colors.textMuted, fontSize: 16 }}>No leads yet</p>
          <p style={{ color: colors.textMuted, fontSize: 14, marginTop: 8 }}>Share your bot link or QR code to start capturing leads</p>
        </div>
      ) : (
        <div style={{ backgroundColor: colors.bgCard, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead><tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                {['Name', 'Telegram', 'Company', 'Title', 'Email', 'Source', 'Date'].map(h => <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: colors.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={lead.id} style={{ borderBottom: i < leads.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: 14 }}>{lead.full_name || '—'}</td>
                    <td style={{ padding: '14px 16px', color: colors.primary, fontSize: 14 }}>
                      {lead.telegram_username ? <a href={`https://t.me/${lead.telegram_username}`} target="_blank" rel="noopener" style={{ color: colors.primary, textDecoration: 'none' }}>@{lead.telegram_username}</a> : <span style={{ color: colors.textMuted }}>ID: {lead.telegram_id}</span>}
                    </td>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: 14 }}>{lead.company || '—'}</td>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: 14 }}>{lead.title || '—'}</td>
                    <td style={{ padding: '14px 16px', color: colors.text, fontSize: 14 }}>{lead.email || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 14 }}><span style={{ padding: '3px 8px', backgroundColor: lead.source?.startsWith('event:') ? colors.primary + '20' : colors.accent + '20', color: lead.source?.startsWith('event:') ? colors.primary : colors.accent, borderRadius: 12, fontSize: 12 }}>{lead.source || 'direct'}</span></td>
                    <td style={{ padding: '14px 16px', color: colors.textMuted, fontSize: 13 }}>{new Date(lead.created_at).toLocaleDateString()}</td>
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

// Bot settings panel (admins management)
function BotSettings({ bot, onBack, onUpdate }: { bot: any; onBack: () => void; onUpdate: () => void }) {
  const [admins, setAdmins] = useState<any[]>([])
  const [newAdminId, setNewAdminId] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => { loadAdmins() }, [bot.id])
  
  const loadAdmins = async () => {
    setLoading(true)
    const r = await api.getBotAdmins(bot.id)
    if (r.data) setAdmins(r.data)
    setLoading(false)
  }

  const addAdmin = async () => {
    if (!newAdminId) return
    setAdding(true)
    const telegramId = parseInt(newAdminId)
    if (!isNaN(telegramId)) {
      await api.addBotAdmin(bot.id, telegramId)
      setNewAdminId('')
      loadAdmins()
    }
    setAdding(false)
  }

  const removeAdmin = async (telegramId: number) => {
    if (confirm('Remove this admin?')) {
      await api.removeBotAdmin(bot.id, telegramId)
      loadAdmins()
    }
  }

  const toggleArchive = async () => {
    await api.archiveBot(bot.id, !bot.archived)
    onUpdate()
    onBack()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={onBack} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, cursor: 'pointer', fontSize: 14 }}>← Back</button>
        <h2 style={{ color: colors.text, fontSize: 20, margin: 0 }}>Settings for @{bot.username}</h2>
      </div>

      {/* Admins */}
      <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h3 style={{ color: colors.text, fontSize: 16, marginBottom: 16 }}>👥 Bot Admins</h3>
        <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>Admins can use /stats, /export, /broadcast commands in Telegram</p>
        
        {loading ? <p style={{ color: colors.textMuted }}>Loading...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {admins.map(admin => (
              <div key={admin.telegram_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: colors.bg, borderRadius: 8 }}>
                <div>
                  <span style={{ color: colors.text }}>{admin.telegram_username ? `@${admin.telegram_username}` : `ID: ${admin.telegram_id}`}</span>
                  <span style={{ marginLeft: 8, padding: '2px 8px', backgroundColor: admin.role === 'owner' ? colors.primary + '30' : colors.blue + '30', color: admin.role === 'owner' ? colors.primary : colors.blue, borderRadius: 10, fontSize: 11 }}>{admin.role}</span>
                </div>
                {admin.role !== 'owner' && (
                  <button onClick={() => removeAdmin(admin.telegram_id)} style={{ padding: '4px 12px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 4, color: colors.textMuted, cursor: 'pointer', fontSize: 12 }}>Remove</button>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <input type="text" placeholder="Telegram ID (e.g. 123456789)" value={newAdminId} onChange={e => setNewAdminId(e.target.value)} style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: 13 }} />
          <button onClick={addAdmin} disabled={adding || !newAdminId} style={{ ...buttonStyle, width: 'auto', padding: '12px 24px', opacity: adding || !newAdminId ? 0.6 : 1 }}>
            {adding ? 'Adding...' : 'Add Admin'}
          </button>
        </div>
      </div>

      {/* Archive */}
      <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: colors.text, fontSize: 16, marginBottom: 8 }}>📦 Archive Bot</h3>
        <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16 }}>
          {bot.archived ? 'This bot is archived and hidden from the main list.' : 'Archiving hides the bot from your dashboard but keeps all data.'}
        </p>
        <button onClick={toggleArchive} style={{ padding: '10px 20px', backgroundColor: bot.archived ? colors.accent + '20' : colors.yellow + '20', border: `1px solid ${bot.archived ? colors.accent : colors.yellow}`, borderRadius: 8, color: bot.archived ? colors.accent : colors.yellow, cursor: 'pointer', fontSize: 14 }}>
          {bot.archived ? '📂 Unarchive Bot' : '📦 Archive Bot'}
        </button>
      </div>
    </div>
  )
}

interface Stats { totalLeads: number; leadsByDay: { date: string; count: number }[]; leadsBySource: { source: string; count: number }[]; leadsByBot: { botId: string; username: string; count: number }[]; recentLeads: any[] }

function StatCard({ label, value, color = colors.text, icon }: { label: string; value: string | number; color?: string; icon?: string }) {
  return (
    <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20, flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>{icon} {label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function DashboardPage({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [view, setView] = useState<'overview' | 'bots'>('overview')
  const [bots, setBots] = useState<any[]>([])
  const [allBots, setAllBots] = useState<any[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [newToken, setNewToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedBot, setSelectedBot] = useState<any | null>(null)
  const [settingsBot, setSettingsBot] = useState<any | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [botsResult, allBotsResult, statsResult] = await Promise.all([
      api.getBots(),
      fetch(`https://boothbot-api-production.up.railway.app/api/bots?includeArchived=true`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(r => r.json()),
      api.getStats()
    ])
    if (botsResult.data) setBots(botsResult.data)
    if (allBotsResult.data) setAllBots(allBotsResult.data)
    if (statsResult.data) setStats(statsResult.data)
    setLoading(false)
  }

  const addBot = async () => {
    if (!newToken) return
    setAdding(true)
    const result = await api.createBot(newToken)
    setAdding(false)
    if (result.data) {
      setBots([...bots, result.data])
      setAllBots([...allBots, result.data])
      setNewToken('')
      loadData()
    }
  }

  const displayName = user?.username ? `@${user.username}` : user?.first_name || user?.email
  const displayBots = showArchived ? allBots : bots
  const archivedCount = allBots.filter(b => b.archived).length

  // Leads table view
  if (selectedBot) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
        <nav style={{ backgroundColor: colors.bgCard, borderBottom: `1px solid ${colors.border}`, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text }}><span style={{ color: colors.primary }}>Moongate</span> Booths</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: colors.textMuted, fontSize: 14 }}>{displayName}</span>
            <button onClick={onLogout} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, cursor: 'pointer', fontSize: 14 }}>Logout</button>
          </div>
        </nav>
        <main style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
          <LeadsTable botId={selectedBot.id} botUsername={selectedBot.username} onBack={() => setSelectedBot(null)} />
        </main>
      </div>
    )
  }

  // Bot settings view
  if (settingsBot) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
        <nav style={{ backgroundColor: colors.bgCard, borderBottom: `1px solid ${colors.border}`, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text }}><span style={{ color: colors.primary }}>Moongate</span> Booths</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: colors.textMuted, fontSize: 14 }}>{displayName}</span>
            <button onClick={onLogout} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, cursor: 'pointer', fontSize: 14 }}>Logout</button>
          </div>
        </nav>
        <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
          <BotSettings bot={settingsBot} onBack={() => setSettingsBot(null)} onUpdate={loadData} />
        </main>
      </div>
    )
  }

  const thisWeekLeads = stats?.leadsByDay.slice(-7).reduce((sum, d) => sum + d.count, 0) || 0
  const directLeads = stats?.leadsBySource.find(s => s.source === 'direct')?.count || 0
  const eventLeads = stats?.leadsBySource.find(s => s.source === 'event')?.count || 0

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      <nav style={{ backgroundColor: colors.bgCard, borderBottom: `1px solid ${colors.border}`, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text }}><span style={{ color: colors.primary }}>Moongate</span> Booths</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: colors.textMuted, fontSize: 14 }}>{displayName}</span>
          <button onClick={onLogout} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.text, cursor: 'pointer', fontSize: 14 }}>Logout</button>
        </div>
      </nav>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(['overview', 'bots'] as const).map(tab => (
            <button key={tab} onClick={() => setView(tab)} style={{ padding: '10px 20px', backgroundColor: view === tab ? colors.primary : 'transparent', border: `1px solid ${view === tab ? colors.primary : colors.border}`, borderRadius: 8, color: colors.text, cursor: 'pointer', fontSize: 14, fontWeight: view === tab ? 600 : 400 }}>
              {tab === 'overview' ? '📊 Overview' : '🤖 Bots'}
            </button>
          ))}
        </div>

        {loading ? <p style={{ color: colors.textMuted }}>Loading...</p> : view === 'overview' ? (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
              <StatCard label="Total Leads" value={stats?.totalLeads || 0} color={colors.primary} icon="👥" />
              <StatCard label="This Week" value={thisWeekLeads} color={colors.accent} icon="📈" />
              <StatCard label="Direct" value={directLeads} color={colors.blue} icon="🔗" />
              <StatCard label="From Events" value={eventLeads} color={colors.purple} icon="🎪" />
            </div>

            <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <h3 style={{ color: colors.text, fontSize: 16, marginBottom: 16, fontWeight: 600 }}>📊 Leads (Last 30 Days)</h3>
              {stats && stats.leadsByDay.length > 0 ? <BarChart data={stats.leadsByDay} height={140} /> : <p style={{ color: colors.textMuted, textAlign: 'center', padding: 20 }}>No data yet</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24 }}>
                <h3 style={{ color: colors.text, fontSize: 16, marginBottom: 16, fontWeight: 600 }}>🤖 Leads by Bot</h3>
                {stats?.leadsByBot.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {stats.leadsByBot.map(bot => <div key={bot.botId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: colors.text }}>@{bot.username}</span><span style={{ color: colors.primary, fontWeight: 600 }}>{bot.count}</span></div>)}
                  </div>
                ) : <p style={{ color: colors.textMuted }}>No bots connected</p>}
              </div>

              <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24 }}>
                <h3 style={{ color: colors.text, fontSize: 16, marginBottom: 16, fontWeight: 600 }}>🕐 Recent Leads</h3>
                {stats?.recentLeads.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {stats.recentLeads.slice(0, 5).map(lead => <div key={lead.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div style={{ color: colors.text, fontSize: 14 }}>{lead.full_name || lead.telegram_username || 'Anonymous'}</div><div style={{ color: colors.textMuted, fontSize: 12 }}>@{lead.bot_username}</div></div><span style={{ color: colors.textMuted, fontSize: 12 }}>{new Date(lead.created_at).toLocaleDateString()}</span></div>)}
                  </div>
                ) : <p style={{ color: colors.textMuted }}>No leads yet</p>}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <h2 style={{ color: colors.text, fontSize: 18, marginBottom: 8 }}>Connect Your Bot</h2>
              <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: 16 }}>Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener" style={{ color: colors.primary }}>@BotFather</a> and paste the token below</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <input type="text" placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz" value={newToken} onChange={e => setNewToken(e.target.value)} style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: 13 }} />
                <button onClick={addBot} disabled={adding || !newToken} style={{ ...buttonStyle, width: 'auto', padding: '12px 32px', opacity: adding || !newToken ? 0.6 : 1 }}>{adding ? 'Adding...' : 'Add Bot'}</button>
              </div>
            </div>

            <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ color: colors.text, fontSize: 18, margin: 0 }}>Your Bots</h2>
                {archivedCount > 0 && (
                  <button onClick={() => setShowArchived(!showArchived)} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.textMuted, cursor: 'pointer', fontSize: 12 }}>
                    {showArchived ? 'Hide Archived' : `Show Archived (${archivedCount})`}
                  </button>
                )}
              </div>
              {displayBots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p style={{ color: colors.textMuted, marginBottom: 16 }}>No bots connected yet</p>
                  <p style={{ color: colors.textMuted, fontSize: 13 }}>Or try our demo: <a href="https://t.me/MoongateEventBot" target="_blank" rel="noopener" style={{ color: colors.primary }}>@MoongateEventBot</a></p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {displayBots.map(bot => (
                    <div key={bot.id} style={{ padding: 16, backgroundColor: colors.bg, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: bot.archived ? 0.6 : 1 }}>
                      <div onClick={() => setSelectedBot(bot)} style={{ cursor: 'pointer', flex: 1 }}>
                        <div style={{ color: colors.text, fontWeight: 500 }}>@{bot.username} {bot.archived && <span style={{ color: colors.yellow, fontSize: 12 }}>(archived)</span>}</div>
                        <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{bot.visitor_count || 0} leads captured</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => setSettingsBot(bot)} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 6, color: colors.textMuted, cursor: 'pointer', fontSize: 12 }}>⚙️ Settings</button>
                        <span style={{ padding: '4px 12px', backgroundColor: bot.archived ? colors.yellow + '20' : colors.accent + '20', color: bot.archived ? colors.yellow : colors.accent, borderRadius: 20, fontSize: 12 }}>{bot.archived ? 'Archived' : 'Active'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div style={{ marginTop: 24, padding: 16, backgroundColor: colors.bg, borderRadius: 8, border: `1px solid ${colors.border}` }}>
          <p style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}><span style={{ color: colors.accent }}>🎁 Free tier:</span> First 25 leads free • <span style={{ color: colors.text }}> Pro:</span> $100/mo per 1,000 leads</p>
        </div>
      </main>
    </div>
  )
}

function AppContent() {
  const { token, user, loginWithToken, logout } = useLocalAuth()
  if (!token) return <Routes><Route path="*" element={<LoginPage onLoginWithToken={loginWithToken} />} /></Routes>
  return <Routes><Route path="*" element={<DashboardPage user={user} onLogout={logout} />} /></Routes>
}

function App() { return <BrowserRouter><AppContent /></BrowserRouter> }

export default App
