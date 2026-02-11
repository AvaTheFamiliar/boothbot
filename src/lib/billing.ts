import { supabase } from '../db/client'
import type { BillingStatus } from '../db/schema'

const MAX_AGE_DAYS = 7
const MAX_VISITORS = 100

export async function checkBillingLimits(botId: string): Promise<BillingStatus> {
  try {
    const { data, error } = await supabase
      .rpc('check_bot_limits', { bot_uuid: botId })
      .single()

    if (error) throw error

    return {
      is_within_limits: data.is_within_limits,
      age_days: data.age_days,
      visitor_count: data.visitor_count
    }
  } catch (error) {
    throw new Error('Failed to check billing limits')
  }
}

export function getBotAge(createdAt: Date): number {
  const now = new Date()
  const diff = now.getTime() - createdAt.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function isWithinLimits(ageDays: number, visitorCount: number): boolean {
  return ageDays <= MAX_AGE_DAYS && visitorCount < MAX_VISITORS
}

export function getBillingMessage(status: BillingStatus): string {
  if (status.is_within_limits) {
    const daysLeft = MAX_AGE_DAYS - status.age_days
    const visitorsLeft = MAX_VISITORS - status.visitor_count
    return `Free tier: ${daysLeft} days and ${visitorsLeft} contacts remaining`
  }

  if (status.age_days > MAX_AGE_DAYS) {
    return 'Your 7-day trial has expired. Please upgrade to continue.'
  }

  if (status.visitor_count >= MAX_VISITORS) {
    return 'You have reached the 100 contact limit. Please upgrade to continue.'
  }

  return 'Billing limit reached. Please upgrade to continue.'
}
