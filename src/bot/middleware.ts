import type { BotContext } from './types'
import { getSession, setSession } from './session'
import { checkBillingLimits, getBillingMessage } from '../lib/billing'
import { findEventById } from '../db/repositories/event.repository'
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
    if (ctx.message?.text?.startsWith('/start event_')) {
      const eventId = ctx.message.text.split('event_')[1]?.split(' ')[0]
      if (eventId) {
        const event = await findEventById(eventId)
        if (event) {
          ctx.session.eventId = eventId
          ctx.eventId = eventId
        }
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
    } catch (error) {
      await ctx.reply('An error occurred. Please try again or contact support.')
    }
  }
}
