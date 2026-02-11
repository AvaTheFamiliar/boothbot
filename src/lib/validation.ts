import { z } from 'zod'
import type { Context } from 'hono'

export async function validateBody<T>(
  c: Context,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await c.req.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: errors }
    }

    return { success: true, data: result.data }
  } catch {
    return { success: false, error: 'Invalid JSON body' }
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-()]{7,}$/
  return phoneRegex.test(phone)
}

export function isValidWalletAddress(address: string): boolean {
  const ethRegex = /^0x[a-fA-F0-9]{40}$/
  const solRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  return ethRegex.test(address) || solRegex.test(address)
}
