import type { BotContext } from '../types'
import { getEventStats } from '../../db/repositories/event.repository'
import { exportVisitorsCSV, findVisitorsByEvent } from '../../db/repositories/visitor.repository'
import { createBroadcast } from '../../db/repositories/broadcast.repository'
import { findBotById } from '../../db/repositories/bot.repository'
import { InputFile } from 'grammy'

export function handleStatsCommand() {
  return async (ctx: BotContext) => {
    if (!ctx.eventId) {
      await ctx.reply('Please use this command within an event context.')
      return
    }

    if (!(await isAdmin(ctx))) {
      await ctx.reply('This command is only available to admins.')
      return
    }

    try {
      const stats = await getEventStats(ctx.eventId)

      if (!stats) {
        await ctx.reply('No stats available for this event.')
        return
      }

      const message = `
📊 Event Statistics

Event: ${stats.event_name}
Total Visitors: ${stats.total_visitors}
Today: ${stats.visitors_today}
This Week: ${stats.visitors_this_week}
Last Registration: ${stats.last_visitor_at ? new Date(stats.last_visitor_at).toLocaleString() : 'Never'}
      `.trim()

      await ctx.reply(message)
    } catch (error) {
      await ctx.reply('Failed to fetch statistics.')
    }
  }
}

export function handleExportCommand() {
  return async (ctx: BotContext) => {
    if (!ctx.eventId) {
      await ctx.reply('Please use this command within an event context.')
      return
    }

    if (!(await isAdmin(ctx))) {
      await ctx.reply('This command is only available to admins.')
      return
    }

    try {
      const csv = await exportVisitorsCSV(ctx.eventId)
      const fileName = `visitors_${ctx.eventId}_${Date.now()}.csv`

      await ctx.replyWithDocument(
        new InputFile(Buffer.from(csv), fileName),
        { caption: 'Here is your visitor export' }
      )
    } catch (error) {
      await ctx.reply('Failed to export visitors.')
    }
  }
}

export function handleBroadcastCommand() {
  return async (ctx: BotContext) => {
    if (!ctx.eventId) {
      await ctx.reply('Please use this command within an event context.')
      return
    }

    if (!(await isAdmin(ctx))) {
      await ctx.reply('This command is only available to admins.')
      return
    }

    const message = ctx.message?.text?.replace('/broadcast', '').trim()

    if (!message) {
      await ctx.reply('Usage: /broadcast <message>\n\nThis will send a message to all registered visitors.')
      return
    }

    try {
      const visitors = await findVisitorsByEvent(ctx.eventId)
      let sentCount = 0

      for (const visitor of visitors) {
        try {
          await ctx.api.sendMessage(visitor.telegram_id, message)
          sentCount++
        } catch {
          continue
        }
      }

      await createBroadcast({
        event_id: ctx.eventId,
        message,
        sent_count: sentCount
      })

      await ctx.reply(`Broadcast sent to ${sentCount} out of ${visitors.length} visitors.`)
    } catch (error) {
      await ctx.reply('Failed to send broadcast.')
    }
  }
}

async function isAdmin(ctx: BotContext): Promise<boolean> {
  if (!ctx.from || !ctx.botId) return false

  try {
    const bot = await findBotById(ctx.botId)
    if (!bot || !bot.owner_telegram_id) return false

    return ctx.from.id === bot.owner_telegram_id
  } catch {
    return false
  }
}
