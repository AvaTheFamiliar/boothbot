import { supabase } from '../client'
import type { Event, EventStats } from '../schema'

export interface CreateEventData {
  bot_id: string
  name: string
  slug?: string
  description?: string
  start_date?: string
  end_date?: string
  swag_image_url?: string
  config?: Record<string, any>
}

export interface UpdateEventData {
  name?: string
  description?: string
  start_date?: string
  end_date?: string
}

export async function createEvent(data: CreateEventData): Promise<Event> {
  const { data: event, error } = await supabase
    .from('bb_events')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(`Failed to create event: ${error.message}`)
  return event
}

export async function findEventById(id: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('bb_events')
    .select()
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to find event: ${error.message}`)
  }
  return data
}

export async function findEventBySlug(botId: string, slug: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('bb_events')
    .select()
    .eq('bot_id', botId)
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to find event by slug: ${error.message}`)
  }
  return data
}

export async function findDefaultEvent(botId: string): Promise<Event | null> {
  // Get the most recent event for this bot as the default
  const { data, error } = await supabase
    .from('bb_events')
    .select()
    .eq('bot_id', botId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    return null
  }
  return data
}

export async function findEventsByBot(botId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('bb_events')
    .select()
    .eq('bot_id', botId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to find events: ${error.message}`)
  return data || []
}

export async function findEventsByTenant(tenantId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('bb_events')
    .select(`
      *,
      bb_bots!inner(tenant_id)
    `)
    .eq('bb_bots.tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to find events: ${error.message}`)
  return data || []
}

export async function updateEvent(id: string, data: UpdateEventData): Promise<Event> {
  const { data: event, error } = await supabase
    .from('bb_events')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update event: ${error.message}`)
  return event
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('bb_events')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete event: ${error.message}`)
}

export async function getEventStats(eventId: string): Promise<EventStats | null> {
  const { data, error } = await supabase
    .from('bb_event_stats')
    .select()
    .eq('event_id', eventId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to get event stats: ${error.message}`)
  }
  return data
}
