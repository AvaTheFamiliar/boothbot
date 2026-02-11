import { z } from 'zod'

export interface Tenant {
  id: string
  email: string
  password_hash: string
  created_at: string
}

export interface Bot {
  id: string
  tenant_id: string
  token: string
  username: string
  owner_telegram_id: number | null
  created_at: string
}

export interface Event {
  id: string
  bot_id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
}

export interface Visitor {
  id: string
  event_id: string
  telegram_id: number
  telegram_username: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  wallet_address: string | null
  notes: string | null
  created_at: string
}

export interface Broadcast {
  id: string
  event_id: string
  message: string
  sent_count: number
  created_at: string
}

export interface EventStats {
  event_id: string
  event_name: string
  bot_id: string
  total_visitors: number
  visitors_today: number
  visitors_this_week: number
  last_visitor_at: string | null
}

export interface BillingStatus {
  is_within_limits: boolean
  age_days: number
  visitor_count: number
}

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export const createBotSchema = z.object({
  token: z.string().min(1),
  username: z.string().min(1),
  owner_telegram_id: z.number().optional()
})

export const createEventSchema = z.object({
  bot_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional()
})

export const updateEventSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional()
})

export const createVisitorSchema = z.object({
  event_id: z.string().uuid(),
  telegram_id: z.number(),
  telegram_username: z.string().optional(),
  full_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  wallet_address: z.string().optional(),
  notes: z.string().optional()
})

export const broadcastSchema = z.object({
  message: z.string().min(1)
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateBotInput = z.infer<typeof createBotSchema>
export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type CreateVisitorInput = z.infer<typeof createVisitorSchema>
export type BroadcastInput = z.infer<typeof broadcastSchema>
