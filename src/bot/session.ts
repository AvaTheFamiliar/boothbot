import type { SessionData } from './types'
import { ConversationState } from './types'
import { supabase } from '../db/client'

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

// In-memory cache for faster access, synced with DB
const sessionCache = new Map<string, { data: SessionData; lastSync: number }>()

function getSessionKey(botId: string, userId: number): string {
  return `${botId}_${userId}`
}

function defaultSession(): SessionData {
  return {
    state: ConversationState.IDLE,
    visitorData: {}
  }
}

export async function getSessionAsync(botId: string, userId: number): Promise<SessionData> {
  const key = getSessionKey(botId, userId)
  
  // Check cache first
  const cached = sessionCache.get(key)
  if (cached && Date.now() - cached.lastSync < 5000) {
    return cached.data
  }

  // Fetch from DB
  try {
    const { data, error } = await supabase
      .from('bb_sessions')
      .select('data')
      .eq('id', key)
      .single()

    if (error || !data) {
      const newSession = defaultSession()
      sessionCache.set(key, { data: newSession, lastSync: Date.now() })
      return newSession
    }

    const session = data.data as SessionData
    sessionCache.set(key, { data: session, lastSync: Date.now() })
    return session
  } catch (e) {
    console.error('[session] Failed to fetch session:', e)
    return defaultSession()
  }
}

export async function setSessionAsync(botId: string, userId: number, data: SessionData): Promise<void> {
  const key = getSessionKey(botId, userId)
  
  // Update cache
  sessionCache.set(key, { data, lastSync: Date.now() })

  // Persist to DB
  try {
    await supabase
      .from('bb_sessions')
      .upsert({ id: key, data, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  } catch (e) {
    console.error('[session] Failed to save session:', e)
  }
}

export async function clearSessionAsync(botId: string, userId: number): Promise<void> {
  const key = getSessionKey(botId, userId)
  sessionCache.delete(key)
  
  try {
    await supabase.from('bb_sessions').delete().eq('id', key)
  } catch (e) {
    console.error('[session] Failed to clear session:', e)
  }
}

export async function resetSessionAsync(botId: string, userId: number): Promise<void> {
  await setSessionAsync(botId, userId, defaultSession())
}

// Synchronous wrappers for backwards compatibility (use cache only)
export function getSession(botId: string, userId: number): SessionData {
  const key = getSessionKey(botId, userId)
  const cached = sessionCache.get(key)
  if (cached) return cached.data
  
  const newSession = defaultSession()
  sessionCache.set(key, { data: newSession, lastSync: 0 }) // Mark as needing sync
  return newSession
}

export function setSession(botId: string, userId: number, data: SessionData): void {
  const key = getSessionKey(botId, userId)
  sessionCache.set(key, { data, lastSync: Date.now() })
  // Fire and forget DB save
  setSessionAsync(botId, userId, data).catch(e => console.error('[session] Async save failed:', e))
}

export function clearSession(botId: string, userId: number): void {
  clearSessionAsync(botId, userId).catch(e => console.error('[session] Async clear failed:', e))
}

export function resetSession(botId: string, userId: number): void {
  resetSessionAsync(botId, userId).catch(e => console.error('[session] Async reset failed:', e))
}

// Cleanup old sessions periodically
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - SESSION_TIMEOUT).toISOString()
    await supabase.from('bb_sessions').delete().lt('updated_at', cutoff)
  } catch (e) {
    console.error('[session] Cleanup failed:', e)
  }
}, 60 * 1000)
