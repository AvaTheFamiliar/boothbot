import type { SessionData } from './types'
import { ConversationState } from './types'

const sessions = new Map<string, SessionData>()
const SESSION_TIMEOUT = 30 * 60 * 1000

function getSessionKey(botId: string, userId: number): string {
  return `${botId}_${userId}`
}

export function getSession(botId: string, userId: number): SessionData {
  const key = getSessionKey(botId, userId)
  const existing = sessions.get(key)

  if (existing) {
    return existing
  }

  const newSession: SessionData = {
    state: ConversationState.IDLE,
    visitorData: {}
  }
  sessions.set(key, newSession)
  return newSession
}

export function setSession(botId: string, userId: number, data: SessionData): void {
  const key = getSessionKey(botId, userId)
  sessions.set(key, data)
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

setInterval(() => {
  sessions.clear()
}, SESSION_TIMEOUT)
