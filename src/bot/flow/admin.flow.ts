import type { BotContext } from '../types'
import { ConversationState } from '../types'
import { getEventStats, createEvent, findEventsByBot } from '../../db/repositories/event.repository'
import { exportVisitorsCSV, findVisitorsByEvent } from '../../db/repositories/visitor.repository'
import { createBroadcast } from '../../db/repositories/broadcast.repository'
import { findBotById } from '../../db/repositories/bot.repository'
import { InputFile } from 'grammy'

export function handleAdminCommand() {
  return async (ctx: BotContext) => {
    if (!(await isAdmin(ctx))) {
      await ctx.reply('⛔ This command is only available to bot admins.')
      return
    }

    await ctx.reply(
      `🔧 <b>Admin Commands</b>\n\n` +
      `/newevent - Create a new event\n` +
      `/events - List your events\n` +
      `/stats - View event statistics\n` +
      `/export - Export visitors to CSV\n` +
      `/broadcast &lt;message&gt; - Message all visitors\n\n` +
      `💡 <i>Use /newevent to create your first event and get a QR code!</i>`,
      { parse_mode: 'HTML' }
    )
  }
}

export function handleHelpCommand() {
  return async (ctx: BotContext) => {
    const isAdminUser = await isAdmin(ctx)
    
    let helpText = `📚 <b>BoothBot Help</b>\n\n`
    
    if (isAdminUser) {
      helpText += `<b>Admin Commands:</b>\n` +
        `/admin - Show admin commands\n` +
        `/newevent - Create a new event\n` +
        `/events - List your events\n` +
        `/stats - View event statistics\n` +
        `/export - Export visitors to CSV\n` +
        `/broadcast - Message all visitors\n\n`
    }
    
    helpText += `<b>Visitor Commands:</b>\n` +
      `/start - Start registration\n` +
      `/help - Show this message\n\n` +
      `🌐 <b>Web Dashboard:</b>\n` +
      `https://boothbot-dashboard.vercel.app`

    await ctx.reply(helpText, { parse_mode: 'HTML' })
  }
}

export function handleNewEventCommand() {
  return async (ctx: BotContext) => {
    if (!(await isAdmin(ctx))) {
      await ctx.reply('⛔ This command is only available to bot admins.')
      return
    }

    ctx.session.state = ConversationState.CREATING_EVENT
    ctx.session.eventData = {}
    
    await ctx.reply(
      `🎪 <b>Create New Event</b>\n\n` +
      `What's the name of your event?\n\n` +
      `<i>Example: ETH Denver 2026</i>`,
      { parse_mode: 'HTML' }
    )
  }
}

export function handleEventNameInput() {
  return async (ctx: BotContext) => {
    const name = ctx.message?.text?.trim()
    if (!name || name.length < 2) {
      await ctx.reply('Please provide a valid event name (at least 2 characters).')
      return
    }

    ctx.session.eventData = { name }
    ctx.session.state = ConversationState.CREATING_EVENT_SLUG

    await ctx.reply(
      `Great! Now enter a short slug for the event URL.\n\n` +
      `<i>Example: ethdenver2026 (lowercase, no spaces)</i>`,
      { parse_mode: 'HTML' }
    )
  }
}

export function handleEventSlugInput() {
  return async (ctx: BotContext) => {
    const slug = ctx.message?.text?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!slug || slug.length < 2) {
      await ctx.reply('Please provide a valid slug (letters, numbers, dashes only).')
      return
    }

    try {
      const event = await createEvent({
        bot_id: ctx.botId,
        name: ctx.session.eventData?.name || 'Unnamed Event',
        slug
      })

      ctx.session.state = ConversationState.IDLE
      ctx.session.eventData = undefined

      const botInfo = await ctx.api.getMe()
      const eventLink = `https://t.me/${botInfo.username}?start=event_${event.id}`

      await ctx.reply(
        `✅ <b>Event Created!</b>\n\n` +
        `<b>Name:</b> ${event.name}\n` +
        `<b>Slug:</b> ${slug}\n\n` +
        `<b>Registration Link:</b>\n<code>${eventLink}</code>\n\n` +
        `Share this link or generate a QR code from the dashboard!`,
        { parse_mode: 'HTML' }
      )
    } catch (error: any) {
      await ctx.reply(`Failed to create event: ${error?.message || 'Unknown error'}`)
      ctx.session.state = ConversationState.IDLE
    }
  }
}

export function handleEventsCommand() {
  return async (ctx: BotContext) => {
    if (!(await isAdmin(ctx))) {
      await ctx.reply('⛔ This command is only available to bot admins.')
      return
    }

    try {
      const events = await findEventsByBot(ctx.botId)

      if (!events || events.length === 0) {
        await ctx.reply(
          `📭 <b>No events yet!</b>\n\n` +
          `Use /newevent to create your first event.`,
          { parse_mode: 'HTML' }
        )
        return
      }

      const botInfo = await ctx.api.getMe()
      const eventList = events.map((e, i) => {
        const link = `https://t.me/${botInfo.username}?start=event_${e.id}`
        return `${i + 1}. <b>${e.name}</b>\n   <code>${link}</code>`
      }).join('\n\n')

      await ctx.reply(
        `📋 <b>Your Events</b>\n\n${eventList}`,
        { parse_mode: 'HTML' }
      )
    } catch (error) {
      await ctx.reply('Failed to fetch events.')
    }
  }
}

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
