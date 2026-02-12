import { supabase } from '../client'

export interface Bot {
  id: string
  tenant_id: string
  token: string
  username: string
  owner_telegram_id?: number
  archived?: boolean
  created_at: string
}

export interface BotWithStats extends Bot {
  visitor_count: number
}

export interface BotAdmin {
  id: string
  bot_id: string
  telegram_id: number
  telegram_username?: string
  role: string
  added_at: string
}

export async function createBot(data: {
  tenant_id: string
  token: string
  username: string
  owner_telegram_id?: number
}): Promise<Bot> {
  const { data: bot, error } = await supabase
    .from('bb_bots')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return bot
}

export async function findBotById(id: string): Promise<Bot | null> {
  const { data, error } = await supabase
    .from('bb_bots')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function findBotsByTenantId(tenantId: string): Promise<Bot[]> {
  const { data, error } = await supabase
    .from('bb_bots')
    .select('*')
    .eq('tenant_id', tenantId)

  if (error) return []
  return data || []
}

// Get bots with visitor counts
export async function findBotsWithStatsByTenantId(tenantId: string): Promise<BotWithStats[]> {
  const { data: bots, error } = await supabase
    .from('bb_bots')
    .select('*')
    .eq('tenant_id', tenantId)

  if (error || !bots) return []

  // Get visitor counts for each bot
  const botsWithStats: BotWithStats[] = await Promise.all(
    bots.map(async (bot) => {
      const { count } = await supabase
        .from('bb_visitors')
        .select('*', { count: 'exact', head: true })
        .eq('bot_id', bot.id)
      
      return {
        ...bot,
        visitor_count: count || 0
      }
    })
  )

  return botsWithStats
}

export async function findBotByToken(token: string): Promise<Bot | null> {
  const { data, error } = await supabase
    .from('bb_bots')
    .select('*')
    .eq('token', token)
    .single()

  if (error) return null
  return data
}

export async function deleteBot(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('bb_bots')
    .delete()
    .eq('id', id)

  return !error
}

export async function updateBot(id: string, data: Partial<Bot>): Promise<Bot | null> {
  const { data: bot, error } = await supabase
    .from('bb_bots')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) return null
  return bot
}

// Archive/unarchive bot
export async function archiveBot(id: string, archived: boolean): Promise<Bot | null> {
  return updateBot(id, { archived })
}

// Bot admins
export async function getBotAdmins(botId: string): Promise<BotAdmin[]> {
  const { data, error } = await supabase
    .from('bb_bot_admins')
    .select('*')
    .eq('bot_id', botId)
    .order('added_at', { ascending: true })

  if (error) return []
  return data || []
}

export async function addBotAdmin(botId: string, telegramId: number, telegramUsername?: string): Promise<BotAdmin | null> {
  const { data, error } = await supabase
    .from('bb_bot_admins')
    .upsert({ 
      bot_id: botId, 
      telegram_id: telegramId,
      telegram_username: telegramUsername 
    }, { onConflict: 'bot_id,telegram_id' })
    .select()
    .single()

  if (error) return null
  return data
}

export async function removeBotAdmin(botId: string, telegramId: number): Promise<boolean> {
  const { error } = await supabase
    .from('bb_bot_admins')
    .delete()
    .eq('bot_id', botId)
    .eq('telegram_id', telegramId)

  return !error
}

export async function isBotAdmin(botId: string, telegramId: number): Promise<boolean> {
  // Check if user is owner or in admins table
  const { data: bot } = await supabase
    .from('bb_bots')
    .select('owner_telegram_id')
    .eq('id', botId)
    .single()

  if (bot?.owner_telegram_id === telegramId) return true

  const { count } = await supabase
    .from('bb_bot_admins')
    .select('*', { count: 'exact', head: true })
    .eq('bot_id', botId)
    .eq('telegram_id', telegramId)

  return (count || 0) > 0
}
