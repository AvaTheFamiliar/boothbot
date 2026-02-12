import type { BotContext } from '../types'
import { ConversationState } from '../types'
import {
  getSkipKeyboard,
  getConfirmKeyboard,
  getEditFieldsKeyboard
} from '../keyboards'
import { createVisitor, findVisitorByBotAndTelegramId } from '../../db/repositories/visitor.repository'
import { isValidEmail, isValidPhone, isValidWalletAddress } from '../../lib/validation'
import { resetSessionAsync } from '../session'

export function handleStartCommand() {
  return async (ctx: BotContext) => {
    // Check for event deep link parameter
    const payload = ctx.match?.toString().trim()
    if (payload && payload.startsWith('event_')) {
      ctx.session.eventSlug = payload.replace('event_', '')
      ctx.session.source = `event:${ctx.session.eventSlug}`
    }

    // Check if already registered for this bot
    if (ctx.botId) {
      const existingVisitor = await findVisitorByBotAndTelegramId(ctx.botId, ctx.from!.id)
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

    // Start onboarding flow
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

    ctx.session.state = ConversationState.COLLECTING_NAME
    ctx.session.visitorData = {}
    await ctx.reply(
      `👋 <b>Let's get you registered!</b>\n\n<b>What's your name?</b>`,
      { parse_mode: 'HTML' }
    )
  }
}

export function handleNameInput() {
  return async (ctx: BotContext) => {
    if (ctx.session.state !== ConversationState.COLLECTING_NAME) return

    const name = ctx.message?.text?.trim()
    if (!name || name.length < 1) {
      await ctx.reply(
        `Please enter your name.\n\n<b>What's your name?</b>`,
        { parse_mode: 'HTML' }
      )
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
    console.log(`[titleInput] User ${ctx.from?.id} state: ${ctx.session.state}`)
    if (ctx.session.state !== ConversationState.COLLECTING_TITLE) return

    const title = ctx.message?.text?.trim()
    if (title) {
      ctx.session.visitorData.title = title
    }

    ctx.session.state = ConversationState.COLLECTING_EMAIL
    console.log(`[titleInput] Set state to COLLECTING_EMAIL`)
    await ctx.reply(
      `<b>What's your email?</b>\n\n<i>We'll use this for follow-ups and important updates.</i>`,
      { parse_mode: 'HTML', reply_markup: getSkipKeyboard('email') }
    )
  }
}

export function handleEmailInput() {
  return async (ctx: BotContext) => {
    console.log(`[emailInput] User ${ctx.from?.id} state: ${ctx.session.state}, expected: ${ConversationState.COLLECTING_EMAIL}`)
    if (ctx.session.state !== ConversationState.COLLECTING_EMAIL) {
      console.log(`[emailInput] Skipping - wrong state`)
      return
    }

    const email = ctx.message?.text?.trim()
    if (email && !isValidEmail(email)) {
      await ctx.reply(
        `That doesn't look like a valid email. Try again or skip.\n\n<b>What's your email?</b>`,
        { parse_mode: 'HTML', reply_markup: getSkipKeyboard('email') }
      )
      return
    }

    if (email) {
      ctx.session.visitorData.email = email
    }

    // Save immediately and show thank you
    await saveVisitorAndThankYou(ctx)
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
        // Save immediately when skipping email
        await saveVisitorAndThankYou(ctx)
        break

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

// Save visitor immediately and show thank you - no confirmation needed
async function saveVisitorAndThankYou(ctx: BotContext) {
  console.log(`[save] User ${ctx.from?.id} saving. visitorData:`, JSON.stringify(ctx.session.visitorData))
  
  try {
    if (!ctx.botId) {
      console.error('No botId in context - cannot save visitor')
    } else if (!ctx.session.visitorData?.full_name) {
      console.error(`[save] No visitorData for user ${ctx.from?.id} - session was lost!`)
      await ctx.reply('⚠️ Your session expired. Please start over with /start')
      return
    } else {
      // Look up event_id if we have an event slug
      let eventId: string | null = null
      if (ctx.session.eventSlug || ctx.eventId) {
        eventId = ctx.eventId || null
        if (!eventId && ctx.session.eventSlug) {
          const { findEventBySlug } = await import('../../db/repositories/event.repository')
          const event = await findEventBySlug(ctx.botId, ctx.session.eventSlug)
          if (event) eventId = event.id
        }
      }

      await createVisitor({
        bot_id: ctx.botId,
        event_id: eventId,
        source: ctx.session.source || 'direct',
        telegram_id: ctx.from!.id,
        telegram_username: ctx.from!.username,
        ...ctx.session.visitorData
      })
      
      console.log(`[visitor] Saved visitor ${ctx.from!.id} for bot ${ctx.botId}${eventId ? ` (event: ${eventId})` : ' (no event)'}`)
    }
  } catch (error) {
    console.error('Failed to save visitor:', error)
  }

  // Show thank you message
  await ctx.reply(
    `🎉 <b>You're all set!</b>\n\n` +
    `Thank you for stopping by! We'll be in touch with updates and exclusive content.\n\n` +
    `🎁 <b>Don't forget to grab your merch at our booth!</b>\n\n` +
    `See you around! 👋\n\n` +
    `<i>Powered by Moongate 🌙</i>`,
    { parse_mode: 'HTML' }
  )

  await resetSessionAsync(ctx.botId, ctx.from!.id)
}

// Legacy confirm handler - just calls saveVisitorAndThankYou
export function handleConfirm() {
  return async (ctx: BotContext) => {
    await saveVisitorAndThankYou(ctx)
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
        await ctx.reply("<b>What's your name?</b>", { parse_mode: 'HTML' })
        break
      case 'company':
        ctx.session.state = ConversationState.COLLECTING_COMPANY
        await ctx.reply("<b>What company or project are you with?</b>", { parse_mode: 'HTML', reply_markup: getSkipKeyboard('company') })
        break
      case 'title':
        ctx.session.state = ConversationState.COLLECTING_TITLE
        await ctx.reply("<b>What's your role or title?</b>", { parse_mode: 'HTML', reply_markup: getSkipKeyboard('title') })
        break
      case 'email':
        ctx.session.state = ConversationState.COLLECTING_EMAIL
        await ctx.reply("<b>What's your email?</b>", { parse_mode: 'HTML', reply_markup: getSkipKeyboard('email') })
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
