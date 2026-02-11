import { supabase } from '../client'
import type { Bot } from '../schema'

export interface CreateBotData {
  tenant_id: string
  token: string
  username: string
  owner_telegram_id?: number
}

export async function createBot(data: CreateBotData): Promise<Bot> {
  const { data: bot, error } = await supabase
    .from('bb_bots')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(`Failed to create bot: ${error.message}`)
  return bot
}

export async function findBotById(id: string): Promise<Bot | null> {
  const { data, error } = await supabase
    .from('bb_bots')
    .select()
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to find bot: ${error.message}`)
  }
  return data
}

export async function findBotsByTenant(tenantId: string): Promise<Bot[]> {
  const { data, error } = await supabase
    .from('bb_bots')
    .select()
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to find bots: ${error.message}`)
  return data || []
}

export async function deleteBot(id: string): Promise<void> {
  const { error } = await supabase
    .from('bb_bots')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete bot: ${error.message}`)
}
