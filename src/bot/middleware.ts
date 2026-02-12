import type { BotContext } from './types'
import { getSessionAsync, setSessionAsync } from './session'
import { checkBillingLimits, getBillingMessage } from '../lib/billing'
import { findEventById, findEventBySlug } from '../db/repositories/event.repository'
import { findBotById } from '../db/repositories/bot.repository'

export function sessionMiddleware(botId: string) {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    if (!ctx.from) return

    // Load session from DB
    const session = await getSessionAsync(botId, ctx.from.id)
    ctx.session = session
    ctx.botId = botId
    
    

    await next()

    
    // Save session to DB
    await setSessionAsync(botId, ctx.from.id, ctx.session)
  }
}

// Event context is OPTIONAL - only set if user comes via event deep link
export function eventContextMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const messageText = ctx.message?.text || ''
    
    // Only try to resolve event context if there's an explicit event parameter
    if (messageText.startsWith('/start ')) {
      const param = messageText.replace('/start ', '').trim().split(' ')[0]
      
      // Skip login_ parameters (those are for web auth, not events)
      if (param && !param.startsWith('login_')) {
        let event = null
        
        // Check if it's a legacy event_UUID format
        if (param.startsWith('event_')) {
          const eventId = param.replace('event_', '')
          event = await findEventById(eventId)
        } else {
          // Try slug lookup first
          event = await findEventBySlug(ctx.botId, param)
          
          // If not found by slug, try as UUID
          if (!event) {
            event = await findEventById(param)
          }
        }
        
        if (event) {
          ctx.session.eventId = event.id
          ctx.session.eventSlug = event.slug || undefined
          ctx.session.source = `event:${event.slug || event.id}`
          ctx.eventId = event.id
        }
      }
    } else if (ctx.session.eventId) {
      // Restore event context from session if previously set
      ctx.eventId = ctx.session.eventId
    }
    // If no event parameter and no session event, that's fine - events are optional!

    await next()
  }
}

export function billingMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    if (!ctx.botId) return next()

    try {
      const bot = await findBotById(ctx.botId)
      if (!bot) {
        console.error(`[billing] Bot not found: ${ctx.botId}`)
        return next() // Continue anyway
      }

      // TODO: Get actual contact count from database
      // For now, mock billing always allows
      const contactCount = 0
      const isWithinLimits = checkBillingLimits(contactCount)

      if (!isWithinLimits) {
        const message = getBillingMessage(contactCount)
        if (message) {
          await ctx.reply(message)
        }
        return // Only stop if over billing limit
      }

      await next()
    } catch (error) {
      console.error('Billing middleware error:', error)
      await next()
    }
  }
}

export function errorMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    try {
      await next()
    } catch (error: any) {
      console.error('[errorMiddleware] Caught error:', error?.message || error, error?.stack)
      try {
        await ctx.reply('An error occurred. Please try again or contact support.')
      } catch (replyError) {
        console.error('[errorMiddleware] Failed to send error reply:', replyError)
      }
    }
  }
}
