// Mock billing logic
// Free tier: Up to 25 contacts
// Pro: $100/month per 1,000 contacts

export interface BillingStatus {
  tier: 'free' | 'pro'
  contactCount: number
  contactLimit: number
  overLimit: boolean
  message: string
}

const FREE_LIMIT = 25

export function checkBilling(contactCount: number): BillingStatus {
  if (contactCount <= FREE_LIMIT) {
    return {
      tier: 'free',
      contactCount,
      contactLimit: FREE_LIMIT,
      overLimit: false,
      message: `Free tier: ${contactCount}/${FREE_LIMIT} contacts used`
    }
  }
  
  return {
    tier: 'free',
    contactCount,
    contactLimit: FREE_LIMIT,
    overLimit: true,
    message: `You've exceeded the free tier (${contactCount}/${FREE_LIMIT}). Upgrade to Pro for $100/mo per 1,000 contacts.`
  }
}

export function checkBillingLimits(contactCount: number): boolean {
  // For now, always allow (mock billing)
  // In production, this would check actual subscription status
  return true
}

export function getBillingMessage(contactCount: number): string | null {
  if (contactCount > FREE_LIMIT) {
    return `⚠️ You've exceeded the free tier (${contactCount}/${FREE_LIMIT} contacts). Consider upgrading to Pro!`
  }
  if (contactCount > FREE_LIMIT - 5) {
    return `📊 You're approaching the free tier limit (${contactCount}/${FREE_LIMIT} contacts).`
  }
  return null
}

export function calculateProCost(contactCount: number): number {
  return Math.ceil(contactCount / 1000) * 100
}
