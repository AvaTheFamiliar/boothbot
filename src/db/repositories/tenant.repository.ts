import { supabase } from '../client'
import type { Tenant } from '../schema'

export async function createTenant(email: string, passwordHash: string): Promise<Tenant> {
  const { data, error } = await supabase
    .from('bb_tenants')
    .insert({ email, password_hash: passwordHash })
    .select()
    .single()

  if (error) throw new Error(`Failed to create tenant: ${error.message}`)
  return data
}

export async function findTenantByEmail(email: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('bb_tenants')
    .select()
    .eq('email', email)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to find tenant: ${error.message}`)
  }
  return data
}

export async function findTenantById(id: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('bb_tenants')
    .select()
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to find tenant: ${error.message}`)
  }
  return data
}
