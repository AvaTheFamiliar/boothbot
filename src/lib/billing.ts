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

export function checkBilling(contactCount: number): BillingStatus {
  const FREE_LIMIT = 25
  
  if (contactCount <= FREE_LIMIT) {
    return {
      tier: 'free',
      contactCount,
      contactLimit: FREE_LIMIT,
      overLimit: false,
      message: `Free tier: ${contactCount}/${FREE_LIMIT} contacts used`
    }
  }
  
  // Over free limit - would need to upgrade
  // For now, we allow but flag it
  return {
    tier: 'free',
    contactCount,
    contactLimit: FREE_LIMIT,
    overLimit: true,
    message: `You've exceeded the free tier (${contactCount}/${FREE_LIMIT}). Upgrade to Pro for $100/mo per 1,000 contacts.`
  }
}

export function calculateProCost(contactCount: number): number {
  // $100 per 1,000 contacts, rounded up
  return Math.ceil(contactCount / 1000) * 100
}
