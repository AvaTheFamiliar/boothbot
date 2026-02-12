import type { BotContext } from '../types'
import { ConversationState } from '../types'
import {
  getStartKeyboard,
  getSkipKeyboard,
  getConfirmKeyboard,
  getEditFieldsKeyboard
} from '../keyboards'
import { createVisitor, findVisitorByTelegramId } from '../../db/repositories/visitor.repository'
import { isValidEmail, isValidPhone, isValidWalletAddress } from '../../lib/validation'
import { resetSession } from '../session'

export function handleStartCommand() {
  return async (ctx: BotContext) => {
    // Check if already registered (if we have an event context)
    if (ctx.eventId) {
      const existingVisitor = await findVisitorByTelegramId(ctx.eventId, ctx.from!.id)
      if (existingVisitor) {
        await ctx.reply(
          `✅ <b>You're already registered!</b>\n\n` +
          `Thank you for your interest. We'll keep you updated on event news and announcements.\n\n` +
          `<i>Powered by Moongate 🌙</i>`,
          { parse_mode: 'HTML' }
        )
        return
      }
    }

    // Always start onboarding flow (event context set by middleware or will use default)
    ctx.session.state = ConversationState.COLLECTING_NAME
    ctx.session.visitorData = {}
    
    await ctx.reply(
      `👋 <b>Welcome!</b>\n\n` +
      `Let's get you registered — it only takes a moment.\n\n` +
      `<b>What's your name?</b>`,
      { parse_mode: 'HTML' }
    )
  }
}

export function handleRegisterVisitor() {
  return async (ctx: BotContext) => {
    try { await ctx.answerCallbackQuery() } catch {}

    if (!ctx.eventId) {
      await ctx.reply('Please start from a valid event link.')
      return
    }

    ctx.session.state = ConversationState.COLLECTING_NAME
    await ctx.reply("Let's get started! What's your full name?")
  }
}

export function handleNameInput() {
  return async (ctx: BotContext) => {
    if (ctx.session.state !== ConversationState.COLLECTING_NAME) return

    const name = ctx.message?.text?.trim()
    if (!name || name.length < 2) {
      await ctx.reply('Please provide a valid name (at least 2 characters).')
      return
    }

    ctx.session.visitorData.full_name = name
    ctx.session.state = ConversationState.COLLECTING_COMPANY

    await ctx.reply(
      `Nice to meet you, <b>${name}</b>! 👋\n\n<b>What company or project are you with?</b>`,
      { parse_mode: 'HTML', reply_markup: getSkipKeyboard('company') }
    )
  }
}

export function handleCompanyInput() {
  return async (ctx: BotContext) => {
    if (ctx.session.state !== ConversationState.COLLECTING_COMPANY) return

    const company = ctx.message?.text?.trim()
    if (company) {
      ctx.session.visitorData.company = company
    }

    ctx.session.state = ConversationState.COLLECTING_TITLE
    await ctx.reply(
      `<b>What's your role or title?</b>\n\n<i>e.g., Developer, Founder, Marketing, Investor...</i>`,
      { parse_mode: 'HTML', reply_markup: getSkipKeyboard('title') }
    )
  }
}

export function handleTitleInput() {
  return async (ctx: BotContext) => {
    if (ctx.session.state !== ConversationState.COLLECTING_TITLE) return

    const title = ctx.message?.text?.trim()
    if (title) {
      ctx.session.visitorData.title = title
    }

    ctx.session.state = ConversationState.COLLECTING_EMAIL
    await ctx.reply(
      `<b>What's your email?</b>\n\n<i>We'll use this for follow-ups and important updates.</i>`,
      { parse_mode: 'HTML', reply_markup: getSkipKeyboard('email') }
    )
  }
}

export function handleEmailInput() {
  return async (ctx: BotContext) => {
    if (ctx.session.state !== ConversationState.COLLECTING_EMAIL) return

    const email = ctx.message?.text?.trim()
    if (email && !isValidEmail(email)) {
      await ctx.reply('Please provide a valid email address.')
      return
    }

    if (email) {
      ctx.session.visitorData.email = email
    }

    // Go straight to confirmation (skip phone/wallet/notes for simpler flow)
    ctx.session.state = ConversationState.CONFIRMING
    await showConfirmation(ctx)
  }
}

export function handlePhoneInput() {
  return async (ctx: BotContext) => {
    if (ctx.session.state !== ConversationState.COLLECTING_PHONE) return

    const phone = ctx.message?.text?.trim()
    if (phone && !isValidPhone(phone)) {
      await ctx.reply('Please provide a valid phone number.')
      return
    }

    if (phone) {
      ctx.session.visitorData.phone = phone
    }

    ctx.session.state = ConversationState.COLLECTING_WALLET
    await ctx.reply(
      "What's your wallet address? (Ethereum or Solana)",
      { reply_markup: getSkipKeyboard('wallet') }
    )
  }
}

export function handleWalletInput() {
  return async (ctx: BotContext) => {
    if (ctx.session.state !== ConversationState.COLLECTING_WALLET) return

    const wallet = ctx.message?.text?.trim()
    if (wallet && !isValidWalletAddress(wallet)) {
      await ctx.reply('Please provide a valid Ethereum or Solana wallet address.')
      return
    }

    if (wallet) {
      ctx.session.visitorData.wallet_address = wallet
    }

    ctx.session.state = ConversationState.COLLECTING_NOTES
    await ctx.reply(
      'Any additional notes or interests?',
      { reply_markup: getSkipKeyboard('notes') }
    )
  }
}

export function handleNotesInput() {
  return async (ctx: BotContext) => {
    if (ctx.session.state !== ConversationState.COLLECTING_NOTES) return

    const notes = ctx.message?.text?.trim()
    if (notes) {
      ctx.session.visitorData.notes = notes
    }

    ctx.session.state = ConversationState.CONFIRMING
    await showConfirmation(ctx)
  }
}

export function handleSkip() {
  return async (ctx: BotContext) => {
    switch (ctx.session.state) {
      case ConversationState.COLLECTING_COMPANY:
        ctx.session.state = ConversationState.COLLECTING_TITLE
        await ctx.reply(
          `<b>What's your role or title?</b>\n\n<i>e.g., Developer, Founder, Marketing, Investor...</i>`,
          { parse_mode: 'HTML', reply_markup: getSkipKeyboard('title') }
        )
        break

      case ConversationState.COLLECTING_TITLE:
        ctx.session.state = ConversationState.COLLECTING_EMAIL
        await ctx.reply(
          `<b>What's your email?</b>\n\n<i>We'll use this for follow-ups and important updates.</i>`,
          { parse_mode: 'HTML', reply_markup: getSkipKeyboard('email') }
        )
        break

      case ConversationState.COLLECTING_EMAIL:
        ctx.session.state = ConversationState.CONFIRMING
        await showConfirmation(ctx)
        break

      // Legacy states (keep for backwards compatibility)
      case ConversationState.COLLECTING_PHONE:
        ctx.session.state = ConversationState.COLLECTING_WALLET
        await ctx.reply(
          "What's your wallet address? (Ethereum or Solana)",
          { reply_markup: getSkipKeyboard('wallet') }
        )
        break

      case ConversationState.COLLECTING_WALLET:
        ctx.session.state = ConversationState.COLLECTING_NOTES
        await ctx.reply(
          'Any additional notes or interests?',
          { reply_markup: getSkipKeyboard('notes') }
        )
        break

      case ConversationState.COLLECTING_NOTES:
        ctx.session.state = ConversationState.CONFIRMING
        await showConfirmation(ctx)
        break
    }

    try { await ctx.answerCallbackQuery() } catch {}
  }
}

export function handleConfirm() {
  return async (ctx: BotContext) => {
    // Get event ID from context or session
    let eventId = ctx.eventId || ctx.session.eventId
    
    // If still no event, try to get default event for this bot
    if (!eventId && ctx.botId) {
      const { findDefaultEvent } = await import('../../db/repositories/event.repository')
      const defaultEvent = await findDefaultEvent(ctx.botId)
      if (defaultEvent) {
        eventId = defaultEvent.id
      }
    }

    if (!eventId) {
      await ctx.reply(
        `❌ <b>No event configured yet.</b>\n\n` +
        `Please ask the booth organizer to set up an event first.`,
        { parse_mode: 'HTML' }
      )
      resetSession(ctx.botId, ctx.from!.id)
      try { await ctx.answerCallbackQuery() } catch {}
      return
    }

    try {
      await createVisitor({
        event_id: eventId,
        telegram_id: ctx.from!.id,
        telegram_username: ctx.from!.username,
        ...ctx.session.visitorData
      })

      await ctx.reply(
        `🎉 <b>You're all set!</b>\n\n` +
        `Thank you for stopping by! We'll be in touch with updates and exclusive content.\n\n` +
        `🎁 <b>Don't forget to grab your merch at our booth!</b>\n\n` +
        `See you around! 👋\n\n` +
        `<i>Powered by Moongate 🌙</i>`,
        { parse_mode: 'HTML' }
      )

      resetSession(ctx.botId, ctx.from!.id)
    } catch (error) {
      console.error('Failed to create visitor:', error)
      await ctx.reply('❌ Failed to save your information. Please try again with /start')
    }

    try { await ctx.answerCallbackQuery() } catch {}
  }
}

export function handleEdit() {
  return async (ctx: BotContext) => {
    await ctx.reply(
      'What would you like to edit?',
      { reply_markup: getEditFieldsKeyboard() }
    )
    try { await ctx.answerCallbackQuery() } catch {}
  }
}

export function handleEditField() {
  return async (ctx: BotContext) => {
    const field = ctx.callbackQuery?.data?.split('_')[1]

    switch (field) {
      case 'name':
        ctx.session.state = ConversationState.COLLECTING_NAME
        await ctx.reply("What's your full name?")
        break
      case 'email':
        ctx.session.state = ConversationState.COLLECTING_EMAIL
        await ctx.reply("What's your email address?", { reply_markup: getSkipKeyboard('email') })
        break
      case 'phone':
        ctx.session.state = ConversationState.COLLECTING_PHONE
        await ctx.reply("What's your phone number?", { reply_markup: getSkipKeyboard('phone') })
        break
      case 'wallet':
        ctx.session.state = ConversationState.COLLECTING_WALLET
        await ctx.reply("What's your wallet address?", { reply_markup: getSkipKeyboard('wallet') })
        break
      case 'notes':
        ctx.session.state = ConversationState.COLLECTING_NOTES
        await ctx.reply('Any additional notes?', { reply_markup: getSkipKeyboard('notes') })
        break
    }

    try { await ctx.answerCallbackQuery() } catch {}
  }
}

export function handleBackToConfirm() {
  return async (ctx: BotContext) => {
    ctx.session.state = ConversationState.CONFIRMING
    await showConfirmation(ctx)
    try { await ctx.answerCallbackQuery() } catch {}
  }
}

async function showConfirmation(ctx: BotContext) {
  const { full_name, company, title, email } = ctx.session.visitorData

  const summary = `✅ <b>Please confirm your details:</b>\n\n` +
    `👤 <b>Name:</b> ${full_name || 'Not provided'}\n` +
    `🏢 <b>Company:</b> ${company || 'Not provided'}\n` +
    `💼 <b>Role:</b> ${title || 'Not provided'}\n` +
    `📧 <b>Email:</b> ${email || 'Not provided'}\n\n` +
    `<i>Powered by Moongate 🌙</i>`

  await ctx.reply(summary, { parse_mode: 'HTML', reply_markup: getConfirmKeyboard() })
}
