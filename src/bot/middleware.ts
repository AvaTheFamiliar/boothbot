import type { BotContext } from './types'
import { getSession, setSession } from './session'
import { checkBillingLimits, getBillingMessage } from '../lib/billing'
import { findEventById, findEventBySlug, findDefaultEvent } from '../db/repositories/event.repository'
import { findBotById } from '../db/repositories/bot.repository'

export function sessionMiddleware(botId: string) {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    if (!ctx.from) return

    const session = getSession(botId, ctx.from.id)
    ctx.session = session
    ctx.botId = botId

    await next()

    setSession(botId, ctx.from.id, ctx.session)
  }
}

export function eventContextMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const messageText = ctx.message?.text || ''
    
    if (messageText.startsWith('/start ')) {
      const param = messageText.replace('/start ', '').trim().split(' ')[0]
      
      if (param) {
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
          ctx.eventId = event.id
        }
      }
    } else if (messageText === '/start') {
      // No parameter - use default event for this bot
      const defaultEvent = await findDefaultEvent(ctx.botId)
      if (defaultEvent) {
        ctx.session.eventId = defaultEvent.id
        ctx.eventId = defaultEvent.id
      }
    } else if (ctx.session.eventId) {
      ctx.eventId = ctx.session.eventId
    }

    await next()
  }
}

export function billingMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    if (!ctx.botId) return next()

    try {
      const bot = await findBotById(ctx.botId)
      if (!bot) {
        return
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
        return
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
