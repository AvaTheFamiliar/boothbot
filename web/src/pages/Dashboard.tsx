import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

export default function Dashboard() {
  const { logout, email } = useAuth()
  const navigate = useNavigate()
  const [bots, setBots] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [selectedBot, setSelectedBot] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBotForm, setShowBotForm] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [botToken, setBotToken] = useState('')
  const [botUsername, setBotUsername] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDescription, setEventDescription] = useState('')

  useEffect(() => {
    loadBots()
  }, [])

  useEffect(() => {
    if (selectedBot) {
      loadEvents(selectedBot)
    }
  }, [selectedBot])

  const loadBots = async () => {
    setLoading(true)
    const response = await api.getBots()
    if (response.success && response.data) {
      setBots(response.data)
      if (response.data.length > 0 && !selectedBot) {
        setSelectedBot(response.data[0].id)
      }
    }
    setLoading(false)
  }

  const loadEvents = async (botId: string) => {
    const response = await api.getEvents(botId)
    if (response.success && response.data) {
      setEvents(response.data)
    }
  }

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault()
    const response = await api.createBot(botToken, botUsername)
    if (response.success) {
      setBotToken('')
      setBotUsername('')
      setShowBotForm(false)
      loadBots()
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBot) return

    const response = await api.createEvent(selectedBot, eventName, eventDescription)
    if (response.success) {
      setEventName('')
      setEventDescription('')
      setShowEventForm(false)
      loadEvents(selectedBot)
    }
  }

  const handleDeleteBot = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this bot?')) return

    const response = await api.deleteBot(botId)
    if (response.success) {
      loadBots()
      setSelectedBot(null)
      setEvents([])
    }
  }

  if (loading) {
    return <div style={styles.loading}>Loading...</div>
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>BoothBot Dashboard</h1>
        <div style={styles.headerRight}>
          <span style={styles.email}>{email}</span>
          <button onClick={logout} style={styles.logoutButton}>Logout</button>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <h2 style={styles.sidebarTitle}>Bots</h2>
            <button onClick={() => setShowBotForm(true)} style={styles.addButton}>+ Add</button>
          </div>

          {bots.length === 0 ? (
            <p style={styles.emptyText}>No bots yet. Create one!</p>
          ) : (
            <div style={styles.botList}>
              {bots.map(bot => (
                <div
                  key={bot.id}
                  onClick={() => setSelectedBot(bot.id)}
                  style={{
                    ...styles.botItem,
                    ...(selectedBot === bot.id ? styles.botItemActive : {})
                  }}
                >
                  <div>
                    <div style={styles.botName}>@{bot.username}</div>
                    <div style={styles.botDate}>
                      {new Date(bot.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteBot(bot.id)
                    }}
                    style={styles.deleteButton}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.main}>
          {selectedBot ? (
            <>
              <div style={styles.mainHeader}>
                <h2 style={styles.mainTitle}>Events</h2>
                <button onClick={() => setShowEventForm(true)} style={styles.createButton}>
                  Create Event
                </button>
              </div>

              {events.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No events yet. Create your first event!</p>
                </div>
              ) : (
                <div style={styles.eventGrid}>
                  {events.map(event => (
                    <div
                      key={event.id}
                      onClick={() => navigate(`/events/${event.id}`)}
                      style={styles.eventCard}
                    >
                      <h3 style={styles.eventName}>{event.name}</h3>
                      {event.description && (
                        <p style={styles.eventDescription}>{event.description}</p>
                      )}
                      <div style={styles.eventDate}>
                        {new Date(event.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={styles.emptyState}>
              <p>Select a bot to view events</p>
            </div>
          )}
        </div>
      </div>

      {showBotForm && (
        <div style={styles.modal} onClick={() => setShowBotForm(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Add Bot</h2>
            <form onSubmit={handleCreateBot} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Bot Token</label>
                <input
                  type="text"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="123456:ABC-DEF..."
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Bot Username</label>
                <input
                  type="text"
                  value={botUsername}
                  onChange={(e) => setBotUsername(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="my_booth_bot"
                />
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowBotForm(false)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEventForm && (
        <div style={styles.modal} onClick={() => setShowEventForm(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Create Event</h2>
            <form onSubmit={handleCreateEvent} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Event Name</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="ETH Denver 2025"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  style={styles.textarea}
                  placeholder="Optional description"
                />
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowEventForm(false)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f5f5f5' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: '18px' },
  header: { backgroundColor: 'white', padding: '20px 40px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '24px', fontWeight: 'bold' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  email: { fontSize: '14px', color: '#666' },
  logoutButton: { padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  content: { display: 'flex', height: 'calc(100vh - 80px)' },
  sidebar: { width: '300px', backgroundColor: 'white', borderRight: '1px solid #ddd', padding: '20px' },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  sidebarTitle: { fontSize: '18px', fontWeight: 'bold' },
  addButton: { padding: '6px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  botList: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  botItem: { padding: '12px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  botItemActive: { backgroundColor: '#e7f3ff', borderColor: '#007bff' },
  botName: { fontSize: '14px', fontWeight: '500' },
  botDate: { fontSize: '12px', color: '#666', marginTop: '4px' },
  deleteButton: { background: 'none', border: 'none', fontSize: '24px', color: '#999', cursor: 'pointer', padding: '0', width: '24px', height: '24px' },
  main: { flex: 1, padding: '20px 40px', overflowY: 'auto' as const },
  mainHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  mainTitle: { fontSize: '24px', fontWeight: 'bold' },
  createButton: { padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  emptyState: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', fontSize: '16px', color: '#666' },
  emptyText: { fontSize: '14px', color: '#666', textAlign: 'center' as const },
  eventGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  eventCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'box-shadow 0.2s' },
  eventName: { fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' },
  eventDescription: { fontSize: '14px', color: '#666', marginBottom: '12px' },
  eventDate: { fontSize: '12px', color: '#999' },
  modal: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '500px', width: '100%', margin: '20px' },
  modalTitle: { fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  label: { fontSize: '14px', fontWeight: '500' },
  input: { padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none' },
  textarea: { padding: '12px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none', minHeight: '100px', resize: 'vertical' as const },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' },
  cancelButton: { padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  submitButton: { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
}
