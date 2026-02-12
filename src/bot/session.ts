import type { SessionData } from './types'
import { ConversationState } from './types'

interface SessionEntry {
  data: SessionData
  lastAccess: number
}

const sessions = new Map<string, SessionEntry>()
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes per session

function getSessionKey(botId: string, userId: number): string {
  return `${botId}_${userId}`
}

export function getSession(botId: string, userId: number): SessionData {
  const key = getSessionKey(botId, userId)
  const existing = sessions.get(key)

  if (existing) {
    existing.lastAccess = Date.now()
    return existing.data
  }

  const newSession: SessionData = {
    state: ConversationState.IDLE,
    visitorData: {}
  }
  sessions.set(key, { data: newSession, lastAccess: Date.now() })
  return newSession
}

export function setSession(botId: string, userId: number, data: SessionData): void {
  const key = getSessionKey(botId, userId)
  sessions.set(key, { data, lastAccess: Date.now() })
}

export function clearSession(botId: string, userId: number): void {
  const key = getSessionKey(botId, userId)
  sessions.delete(key)
}

export function resetSession(botId: string, userId: number): void {
  const session = getSession(botId, userId)
  session.state = ConversationState.IDLE
  session.visitorData = {}
  setSession(botId, userId, session)
}

// Clean up only expired sessions (not all of them!)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of sessions) {
    if (now - entry.lastAccess > SESSION_TIMEOUT) {
      sessions.delete(key)
    }
  }
}, 60 * 1000) // Check every minute
