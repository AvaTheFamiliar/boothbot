import type { BotContext } from '../types'
import { ConversationState } from '../types'
import { getEventStats, createEvent, findEventsByBot } from '../../db/repositories/event.repository'
import { exportVisitorsCSV, exportAllVisitorsCSV, findVisitorsByBot, findVisitorsByEvent, getVisitorCountByBot } from '../../db/repositories/visitor.repository'
import { createBroadcast } from '../../db/repositories/broadcast.repository'
import { findBotById } from '../../db/repositories/bot.repository'
import { InputFile } from 'grammy'
import { generateQRCode } from '../../lib/qr'

export function handleAdminCommand() {
  return async (ctx: BotContext) => {
    if (!(await isAdmin(ctx))) {
      await ctx.reply('⛔ This command is only available to bot admins.')
      return
    }

    await ctx.reply(
      `🔧 <b>Admin Commands</b>\n\n` +
      `/stats - View lead statistics\n` +
      `/export - Export all leads to CSV\n` +
      `/broadcast &lt;message&gt; - Message all leads\n\n` +
      `<b>Events (optional):</b>\n` +
      `/newevent - Create a new event\n` +
      `/events - List your events\n\n` +
      `💡 <i>Events are optional! Leads are captured even without events.</i>`,
      { parse_mode: 'HTML' }
    )
  }
}

export function handleHelpCommand() {
  return async (ctx: BotContext) => {
    const isAdminUser = await isAdmin(ctx)
    
    let helpText = `📚 <b>Moongate Booths Help</b>\n\n`
    
    if (isAdminUser) {
      helpText += `<b>Admin Commands:</b>\n` +
        `/admin - Show admin panel\n` +
        `/stats - View lead statistics\n` +
        `/export - Export leads to CSV\n` +
        `/broadcast - Message all leads\n` +
        `/newevent - Create event (optional)\n` +
        `/events - List events\n\n`
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
      `Events help you track which leads came from where.\n\n` +
      `What's the name of your event?\n\n` +
      `<i>Example: ETH Denver 2026</i>`,
      { parse_mode: 'HTML' }
    )
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

export function handleEventNameInput() {
  return async (ctx: BotContext) => {
    const name = ctx.message?.text?.trim()
    if (!name || name.length < 2) {
      await ctx.reply('Please provide a valid event name (at least 2 characters).')
      return
    }

    const slug = generateSlug(name)

    try {
      const event = await createEvent({
        bot_id: ctx.botId,
        name,
        slug
      })

      ctx.session.state = ConversationState.IDLE
      ctx.session.eventData = undefined

      const botInfo = await ctx.api.getMe()
      const eventLink = `https://t.me/${botInfo.username}?start=${slug}`

      // Generate and send QR code
      const qrBuffer = await generateQRCode(eventLink)

      await ctx.replyWithPhoto(
        new InputFile(qrBuffer, `${slug}-qr.png`),
        {
          caption: `✅ <b>Event Created!</b>\n\n` +
            `<b>Name:</b> ${name}\n` +
            `<b>Slug:</b> ${slug}\n\n` +
            `<b>Registration Link:</b>\n<code>${eventLink}</code>\n\n` +
            `Leads who scan this will be tagged with source: <code>event:${slug}</code>`,
          parse_mode: 'HTML'
        }
      )
    } catch (error: any) {
      await ctx.reply(`Failed to create event: ${error?.message || 'Unknown error'}`)
      ctx.session.state = ConversationState.IDLE
    }
  }
}

// Keep for backwards compatibility but no longer used in flow
export function handleEventSlugInput() {
  return async (ctx: BotContext) => {
    return handleEventNameInput()(ctx)
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
          `📭 <b>No events yet</b>\n\n` +
          `Events are optional — leads are captured with or without them.\n\n` +
          `Use /newevent to create one if you want to track sources.`,
          { parse_mode: 'HTML' }
        )
        return
      }

      const botInfo = await ctx.api.getMe()
      const eventList = events.map((e, i) => {
        const link = `https://t.me/${botInfo.username}?start=${e.slug || e.id}`
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
    if (!(await isAdmin(ctx))) {
      await ctx.reply('⛔ This command is only available to bot admins.')
      return
    }

    try {
      // Get bot-level stats (all leads regardless of event)
      const totalLeads = await getVisitorCountByBot(ctx.botId)
      const events = await findEventsByBot(ctx.botId)
      
      let message = `📊 <b>Lead Statistics</b>\n\n` +
        `<b>Total Leads:</b> ${totalLeads}\n` +
        `<b>Events:</b> ${events.length}\n`

      // If there are events, show per-event breakdown
      if (events.length > 0) {
        message += `\n<b>By Event:</b>\n`
        for (const event of events) {
          const stats = await getEventStats(event.id)
          message += `• ${event.name}: ${stats?.total_visitors || 0} leads\n`
        }
      }

      // Show direct (non-event) leads
      const visitors = await findVisitorsByBot(ctx.botId)
      const directLeads = visitors.filter(v => !v.event_id || v.source === 'direct').length
      if (directLeads > 0) {
        message += `• Direct (no event): ${directLeads} leads\n`
      }

      await ctx.reply(message, { parse_mode: 'HTML' })
    } catch (error) {
      console.error('Stats error:', error)
      await ctx.reply('Failed to fetch statistics.')
    }
  }
}

export function handleExportCommand() {
  return async (ctx: BotContext) => {
    if (!(await isAdmin(ctx))) {
      await ctx.reply('⛔ This command is only available to bot admins.')
      return
    }

    try {
      // Export ALL leads for this bot (not just one event)
      const csv = await exportAllVisitorsCSV(ctx.botId)
      const fileName = `leads_${ctx.botId.slice(0, 8)}_${Date.now()}.csv`

      await ctx.replyWithDocument(
        new InputFile(Buffer.from(csv), fileName),
        { caption: '📥 <b>All Leads Exported</b>\n\nThis includes leads from all sources (direct + events).', parse_mode: 'HTML' }
      )
    } catch (error) {
      console.error('Export error:', error)
      await ctx.reply('Failed to export leads.')
    }
  }
}

export function handleBroadcastCommand() {
  return async (ctx: BotContext) => {
    if (!(await isAdmin(ctx))) {
      await ctx.reply('⛔ This command is only available to bot admins.')
      return
    }

    const message = ctx.message?.text?.replace('/broadcast', '').trim()

    if (!message) {
      await ctx.reply(
        `📢 <b>Broadcast Message</b>\n\n` +
        `Usage: /broadcast &lt;message&gt;\n\n` +
        `This will send a message to ALL registered leads.`,
        { parse_mode: 'HTML' }
      )
      return
    }

    try {
      // Get ALL visitors for this bot (not just one event)
      const visitors = await findVisitorsByBot(ctx.botId)
      
      if (visitors.length === 0) {
        await ctx.reply('No leads to broadcast to yet.')
        return
      }

      let sentCount = 0
      let failedCount = 0

      for (const visitor of visitors) {
        try {
          await ctx.api.sendMessage(visitor.telegram_id, message)
          sentCount++
        } catch {
          failedCount++
          continue
        }
      }

      // Log broadcast (use bot_id context, event_id is optional)
      try {
        await createBroadcast({
          event_id: ctx.eventId || ctx.botId, // Fallback to bot_id for logging
          message,
          sent_count: sentCount
        })
      } catch (e) {
        // Non-fatal, just log
        console.error('Failed to log broadcast:', e)
      }

      await ctx.reply(
        `📢 <b>Broadcast Complete</b>\n\n` +
        `✅ Sent: ${sentCount}\n` +
        `❌ Failed: ${failedCount}\n` +
        `📊 Total: ${visitors.length}`,
        { parse_mode: 'HTML' }
      )
    } catch (error) {
      console.error('Broadcast error:', error)
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
