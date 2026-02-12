import { supabase } from '../client'
import type { Visitor } from '../schema'

export interface CreateVisitorData {
  bot_id: string
  event_id?: string | null
  source?: string | null
  telegram_id: number
  telegram_username?: string
  full_name?: string
  company?: string
  title?: string
  email?: string
  phone?: string
  wallet_address?: string
  notes?: string
}

export interface UpdateVisitorData {
  full_name?: string
  company?: string
  title?: string
  email?: string
  phone?: string
  wallet_address?: string
  notes?: string
}

export async function createVisitor(data: CreateVisitorData): Promise<Visitor> {
  // Use upsert to handle unique constraint on (bot_id, telegram_id)
  const { data: visitor, error } = await supabase
    .from('bb_visitors')
    .upsert(data, { 
      onConflict: 'bot_id,telegram_id',
      ignoreDuplicates: false 
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create visitor: ${error.message}`)
  return visitor
}

// Find visitor by bot_id + telegram_id (regardless of event)
export async function findVisitorByBotAndTelegramId(
  botId: string,
  telegramId: number
): Promise<Visitor | null> {
  const { data, error } = await supabase
    .from('bb_visitors')
    .select()
    .eq('bot_id', botId)
    .eq('telegram_id', telegramId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to find visitor: ${error.message}`)
  }
  return data
}

// Legacy: find by event_id + telegram_id
export async function findVisitorByTelegramId(
  eventId: string,
  telegramId: number
): Promise<Visitor | null> {
  const { data, error } = await supabase
    .from('bb_visitors')
    .select()
    .eq('event_id', eventId)
    .eq('telegram_id', telegramId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to find visitor: ${error.message}`)
  }
  return data
}

export async function findVisitorsByBot(botId: string): Promise<Visitor[]> {
  const { data, error } = await supabase
    .from('bb_visitors')
    .select()
    .eq('bot_id', botId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to find visitors: ${error.message}`)
  return data || []
}

export async function findVisitorsByEvent(eventId: string): Promise<Visitor[]> {
  const { data, error } = await supabase
    .from('bb_visitors')
    .select()
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to find visitors: ${error.message}`)
  return data || []
}

export async function updateVisitor(id: string, data: UpdateVisitorData): Promise<Visitor> {
  const { data: visitor, error } = await supabase
    .from('bb_visitors')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update visitor: ${error.message}`)
  return visitor
}

export async function getVisitorCountByBot(botId: string): Promise<number> {
  const { count, error } = await supabase
    .from('bb_visitors')
    .select('*', { count: 'exact', head: true })
    .eq('bot_id', botId)

  if (error) throw new Error(`Failed to get visitor count: ${error.message}`)
  return count || 0
}

export async function getVisitorCount(eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from('bb_visitors')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)

  if (error) throw new Error(`Failed to get visitor count: ${error.message}`)
  return count || 0
}

export async function exportVisitorsCSV(eventId: string): Promise<string> {
  const visitors = await findVisitorsByEvent(eventId)
  return formatVisitorsCSV(visitors)
}

export async function exportAllVisitorsCSV(botId: string): Promise<string> {
  const visitors = await findVisitorsByBot(botId)
  return formatVisitorsCSV(visitors)
}

function formatVisitorsCSV(visitors: Visitor[]): string {
  const headers = ['Full Name', 'Company', 'Title', 'Email', 'Phone', 'Wallet Address', 'Telegram Username', 'Source', 'Notes', 'Created At']
  const rows = visitors.map(v => [
    v.full_name || '',
    v.company || '',
    v.title || '',
    v.email || '',
    v.phone || '',
    v.wallet_address || '',
    v.telegram_username || '',
    v.source || 'direct',
    v.notes || '',
    v.created_at
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  return csvContent
}
