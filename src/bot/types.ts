import type { Context } from 'grammy'

export enum ConversationState {
  IDLE = 'idle',
  COLLECTING_NAME = 'collecting_name',
  COLLECTING_EMAIL = 'collecting_email',
  COLLECTING_PHONE = 'collecting_phone',
  COLLECTING_WALLET = 'collecting_wallet',
  COLLECTING_NOTES = 'collecting_notes',
  CONFIRMING = 'confirming'
}

export interface SessionData {
  state: ConversationState
  eventId?: string
  isAdmin?: boolean
  visitorData: {
    full_name?: string
    email?: string
    phone?: string
    wallet_address?: string
    notes?: string
  }
}

export interface BotContext extends Context {
  session: SessionData
  botId: string
  eventId?: string
}
