import { supabase } from '../client'
import type { Broadcast } from '../schema'

export interface CreateBroadcastData {
  event_id: string
  message: string
  sent_count: number
}

export async function createBroadcast(data: CreateBroadcastData): Promise<Broadcast> {
  const { data: broadcast, error } = await supabase
    .from('bb_broadcasts')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(`Failed to create broadcast: ${error.message}`)
  return broadcast
}

export async function findBroadcastsByEvent(eventId: string): Promise<Broadcast[]> {
  const { data, error } = await supabase
    .from('bb_broadcasts')
    .select()
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to find broadcasts: ${error.message}`)
  return data || []
}
