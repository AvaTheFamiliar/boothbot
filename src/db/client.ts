import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('bb_tenants').select('count').limit(1)
    if (error) throw error
    return true
  } catch (error) {
    throw error
  }
}
