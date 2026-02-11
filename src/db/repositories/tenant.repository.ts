import { supabase } from '../client'

export interface Tenant {
  id: string
  email: string
  password_hash: string
  telegram_id?: number
  created_at: string
}

export async function createTenant(data: {
  email: string
  password_hash: string
  telegram_id?: number
}): Promise<Tenant> {
  const { data: tenant, error } = await supabase
    .from('bb_tenants')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return tenant
}

export async function findTenantByEmail(email: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('bb_tenants')
    .select('*')
    .eq('email', email)
    .single()

  if (error) return null
  return data
}

export async function findTenantById(id: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('bb_tenants')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function findTenantByTelegramId(telegramId: number): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('bb_tenants')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()

  if (error) return null
  return data
}
