import { supabase } from '../client'
import type { Visitor } from '../schema'

export interface CreateVisitorData {
  event_id: string
  telegram_id: number
  telegram_username?: string
  full_name?: string
  email?: string
  phone?: string
  wallet_address?: string
  notes?: string
}

export interface UpdateVisitorData {
  full_name?: string
  email?: string
  phone?: string
  wallet_address?: string
  notes?: string
}

export async function createVisitor(data: CreateVisitorData): Promise<Visitor> {
  const { data: visitor, error } = await supabase
    .from('bb_visitors')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(`Failed to create visitor: ${error.message}`)
  return visitor
}

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

  const headers = ['Full Name', 'Email', 'Phone', 'Wallet Address', 'Telegram Username', 'Notes', 'Created At']
  const rows = visitors.map(v => [
    v.full_name || '',
    v.email || '',
    v.phone || '',
    v.wallet_address || '',
    v.telegram_username || '',
    v.notes || '',
    v.created_at
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csvContent
}
