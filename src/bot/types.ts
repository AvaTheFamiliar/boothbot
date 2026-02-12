import type { Context } from 'grammy'

export enum ConversationState {
  IDLE = 'idle',
  COLLECTING_NAME = 'collecting_name',
  COLLECTING_COMPANY = 'collecting_company',
  COLLECTING_TITLE = 'collecting_title',
  COLLECTING_EMAIL = 'collecting_email',
  COLLECTING_PHONE = 'collecting_phone',
  COLLECTING_WALLET = 'collecting_wallet',
  COLLECTING_NOTES = 'collecting_notes',
  CONFIRMING = 'confirming',
  CREATING_EVENT = 'creating_event',
  CREATING_EVENT_SLUG = 'creating_event_slug'
}

export interface SessionData {
  state: ConversationState
  eventId?: string
  isAdmin?: boolean
  visitorData: {
    full_name?: string
    company?: string
    title?: string
    email?: string
    phone?: string
    wallet_address?: string
    notes?: string
  }
  eventData?: {
    name?: string
    slug?: string
  }
}

export interface BotContext extends Context {
  session: SessionData
  botId: string
  eventId?: string
}
