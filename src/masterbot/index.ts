import { Bot, Context, session, SessionFlavor, InlineKeyboard } from 'grammy'
import { supabase } from '../db/client'
import { createTenant, findTenantByTelegramId } from '../db/repositories/tenant.repository'
import { createBot, findBotsByTenantId } from '../db/repositories/bot.repository'

interface SessionData {
  step: 'idle' | 'awaiting_token' | 'awaiting_bug_report'
}

type MasterContext = Context & SessionFlavor<SessionData>

const MASTER_BOT_TOKEN = process.env.MASTER_BOT_TOKEN

export function createMasterBot() {
  if (!MASTER_BOT_TOKEN) {
    console.log('MASTER_BOT_TOKEN not set, master bot disabled')
    return null
  }

  const bot = new Bot<MasterContext>(MASTER_BOT_TOKEN)

  bot.use(session({
    initial: (): SessionData => ({ step: 'idle' })
  }))

  // /start command - handles both normal start and login deep links
  bot.command('start', async (ctx) => {
    const telegramId = ctx.from?.id
    if (!telegramId) return

    const payload = ctx.match?.toString().trim()
    
    // Handle login deep link: /start login_<code>
    if (payload && payload.startsWith('login_')) {
      const code = payload.replace('login_', '')
      await handleLoginRequest(ctx, code, telegramId)
      return
    }

    // Normal /start flow
    const existingTenant = await findTenantByTelegramId(telegramId)
    
    if (existingTenant) {
      const bots = await findBotsByTenantId(existingTenant.id)
      await ctx.reply(
        `👋 Welcome back to Moongate Booths!\n\n` +
        `You have ${bots.length} booth bot(s) set up.\n\n` +
        `Commands:\n` +
        `/newbot - Create a new booth bot\n` +
        `/mybots - List your bots\n` +
        `/help - Show all commands`,
        { parse_mode: 'HTML' }
      )
    } else {
      await ctx.reply(
        `🌙 <b>Welcome to Moongate Booths!</b>\n\n` +
        `Turn booth visitors into qualified leads with your own Telegram bot.\n\n` +
        `<b>How it works:</b>\n` +
        `1️⃣ Create a bot with @BotFather\n` +
        `2️⃣ Send me the token\n` +
        `3️⃣ Create events & get QR codes\n` +
        `4️⃣ Visitors scan → you capture leads!\n\n` +
        `💰 <b>Pricing:</b>\n` +
        `• Free: First 25 leads\n` +
        `• Pro: $100/mo per 1,000 leads\n\n` +
        `Ready? Use /newbot to get started!`,
        { parse_mode: 'HTML' }
      )
    }
  })

  // Handle login confirmation/denial callbacks
  bot.callbackQuery(/^login_(approve|deny)_(.+)$/, async (ctx) => {
    const match = ctx.callbackQuery.data.match(/^login_(approve|deny)_(.+)$/)
    if (!match) return
    
    const action = match[1]
    const code = match[2]
    const telegramId = ctx.from?.id
    
    if (!telegramId) {
      await ctx.answerCallbackQuery({ text: 'Error: Could not identify user' })
      return
    }
    
    try {
      // Get auth code
      const { data: authCode, error } = await supabase
        .from('bb_auth_codes')
        .select('*')
        .eq('code', code)
        .single()
      
      if (error || !authCode) {
        await ctx.answerCallbackQuery({ text: 'This login request has expired' })
        await ctx.editMessageText('❌ This login request has expired or was already used.')
        return
      }
      
      if (new Date(authCode.expires_at) < new Date()) {
        await ctx.answerCallbackQuery({ text: 'This login request has expired' })
        await ctx.editMessageText('❌ This login request has expired.')
        return
      }
      
      if (action === 'approve') {
        // Find or create tenant
        let tenant = await findTenantByTelegramId(telegramId)
        if (!tenant) {
          tenant = await createTenant({
            telegram_id: telegramId,
            first_name: ctx.from.first_name,
            last_name: ctx.from.last_name,
            username: ctx.from.username,
          })
        }
        
        // Update auth code to approved
        await supabase
          .from('bb_auth_codes')
          .update({ 
            status: 'approved', 
            telegram_id: telegramId 
          })
          .eq('code', code)
        
        await ctx.answerCallbackQuery({ text: '✅ Login approved!' })
        await ctx.editMessageText(
          `✅ <b>Login Approved</b>\n\n` +
          `You're now logged into Moongate Booths dashboard.\n\n` +
          `You can close this chat and return to the web app.`,
          { parse_mode: 'HTML' }
        )
      } else {
        // Deny login
        await supabase
          .from('bb_auth_codes')
          .update({ status: 'denied' })
          .eq('code', code)
        
        await ctx.answerCallbackQuery({ text: 'Login denied' })
        await ctx.editMessageText(
          `❌ <b>Login Denied</b>\n\n` +
          `The login request was denied. If you didn't initiate this, your account is safe.`,
          { parse_mode: 'HTML' }
        )
      }
    } catch (err) {
      console.error('Login callback error:', err)
      await ctx.answerCallbackQuery({ text: 'An error occurred' })
    }
  })

  // /newbot command
  bot.command('newbot', async (ctx) => {
    ctx.session.step = 'awaiting_token'
    await ctx.reply(
      `🤖 <b>Let's set up your booth bot!</b>\n\n` +
      `<b>Step 1:</b> Open @BotFather\n` +
      `<b>Step 2:</b> Send /newbot\n` +
      `<b>Step 3:</b> Choose a name (e.g., "ETH Denver Booth")\n` +
      `<b>Step 4:</b> Choose a username (e.g., ethdenver_booth_bot)\n` +
      `<b>Step 5:</b> Copy the token and send it here\n\n` +
      `⏳ Waiting for your bot token...`,
      { parse_mode: 'HTML' }
    )
  })

  // /mybots command
  bot.command('mybots', async (ctx) => {
    const telegramId = ctx.from?.id
    if (!telegramId) return

    const tenant = await findTenantByTelegramId(telegramId)
    if (!tenant) {
      await ctx.reply('You don\'t have any bots yet. Use /newbot to create one!')
      return
    }

    const bots = await findBotsByTenantId(tenant.id)
    if (bots.length === 0) {
      await ctx.reply('You don\'t have any bots yet. Use /newbot to create one!')
      return
    }

    const botList = bots.map((b, i) => `${i + 1}. @${b.username}`).join('\n')
    await ctx.reply(
      `📋 <b>Your Booth Bots:</b>\n\n${botList}\n\n` +
      `To manage a bot, message it directly and use /admin`,
      { parse_mode: 'HTML' }
    )
  })

  // /help command
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `📚 <b>Moongate Booths Commands</b>\n\n` +
      `/start - Welcome message\n` +
      `/newbot - Create a new booth bot\n` +
      `/mybots - List your bots\n` +
      `/bug - Report a bug\n` +
      `/help - Show this message\n\n` +
      `🌐 <b>Web Dashboard:</b>\n` +
      `https://boothbot-dashboard.vercel.app\n\n` +
      `💰 <b>Pricing:</b>\n` +
      `• Free: First 25 leads\n` +
      `• Pro: $100/mo per 1,000 leads`,
      { parse_mode: 'HTML' }
    )
  })

  // /bug command
  bot.command('bug', async (ctx) => {
    const bugText = ctx.message?.text?.replace('/bug', '').trim()
    
    if (bugText && bugText.length > 5) {
      await submitBugReport(ctx, bugText)
    } else {
      ctx.session.step = 'awaiting_bug_report'
      await ctx.reply(
        `🐛 <b>Report a Bug</b>\n\n` +
        `Please describe the issue you encountered:\n\n` +
        `<i>Include what you were doing, what you expected, and what happened instead.</i>`,
        { parse_mode: 'HTML' }
      )
    }
  })

  // Handle text messages based on session state
  bot.on('message:text', async (ctx) => {
    // Handle bug report submission
    if (ctx.session.step === 'awaiting_bug_report') {
      const bugText = ctx.message.text.trim()
      if (bugText.length < 5) {
        await ctx.reply('Please provide a more detailed description (at least 5 characters).')
        return
      }
      await submitBugReport(ctx, bugText)
      return
    }

    if (ctx.session.step !== 'awaiting_token') return
    
    const token = ctx.message.text.trim()
    const telegramId = ctx.from?.id
    
    if (!telegramId) return

    // Validate token format
    if (!token.match(/^\d+:[A-Za-z0-9_-]{35}$/)) {
      await ctx.reply(
        '❌ That doesn\'t look like a valid bot token.\n\n' +
        'Bot tokens look like:\n<code>123456789:ABCdefGHIjklMNOpqrsTUVwxyz123456789</code>\n\n' +
        'Get your token from @BotFather and try again.',
        { parse_mode: 'HTML' }
      )
      return
    }

    await ctx.reply('⏳ Setting up your bot...')

    try {
      // Test the token
      const testBot = new Bot(token)
      const botInfo = await testBot.api.getMe()

      // Find or create tenant
      let tenant = await findTenantByTelegramId(telegramId)
      
      if (!tenant) {
        tenant = await createTenant({
          telegram_id: telegramId,
        })
      }

      // Create the bot record
      const baseUrl = process.env.BASE_URL || 'https://boothbot-api-production.up.railway.app'
      const newBot = await createBot({
        tenant_id: tenant.id,
        token: token,
        username: botInfo.username || 'unknown',
        owner_telegram_id: telegramId,
      })

      // Set up webhook
      const webhookUrl = `${baseUrl}/webhook/${newBot.id}`
      await testBot.api.setWebhook(webhookUrl)

      // Configure bot profile and descriptions
      try {
        const description = `🌙 Official Event Registration Bot

Scan a QR code at our booth to:
✓ Register for the event
✓ Get exclusive updates
✓ Connect with our team

Powered by Moongate Booths`

        await testBot.api.raw.setMyDescription({ description })
        await testBot.api.raw.setMyShortDescription({ 
          short_description: `Event registration & lead capture. Powered by Moongate 🌙`
        })

        await testBot.api.raw.setMyCommands({
          commands: [
            { command: 'start', description: 'Start or register for an event' },
            { command: 'help', description: 'Show help and available commands' }
          ]
        })

        await testBot.api.raw.setMyCommands({
          commands: [
            { command: 'start', description: 'Start or register for an event' },
            { command: 'admin', description: 'Admin panel' },
            { command: 'newevent', description: 'Create a new event' },
            { command: 'events', description: 'List your events' },
            { command: 'stats', description: 'View event statistics' },
            { command: 'export', description: 'Export visitors to CSV' },
            { command: 'broadcast', description: 'Send message to all visitors' },
            { command: 'help', description: 'Show help and available commands' }
          ],
          scope: { type: 'chat', chat_id: telegramId }
        })

        console.log(`[masterbot] Configured bot @${botInfo.username} with descriptions and commands`)
      } catch (configError) {
        console.error('[masterbot] Failed to configure bot profile:', configError)
      }

      ctx.session.step = 'idle'

      await ctx.reply(
        `✅ <b>Success!</b>\n\n` +
        `Your booth bot @${botInfo.username} is ready!\n\n` +
        `<b>What's configured:</b>\n` +
        `• Welcome screen with Moongate branding\n` +
        `• Bot description & commands\n` +
        `• Webhook for real-time updates\n\n` +
        `<b>Next steps:</b>\n` +
        `1️⃣ Open @${botInfo.username}\n` +
        `2️⃣ Send /admin to access admin commands\n` +
        `3️⃣ Create your first event with /newevent\n\n` +
        `🎁 <b>Free tier:</b> First 25 leads included!`,
        { parse_mode: 'HTML' }
      )
    } catch (error: any) {
      console.error('Bot setup error:', error)
      await ctx.reply(
        `❌ <b>Setup failed</b>\n\n` +
        `Error: ${error.message || 'Unknown error'}\n\n` +
        `Make sure:\n` +
        `• The token is correct\n` +
        `• You're the owner of the bot\n` +
        `• The bot hasn't been deleted\n\n` +
        `Try again with /newbot`,
        { parse_mode: 'HTML' }
      )
      ctx.session.step = 'idle'
    }
  })

  return bot
}

// Handle login request from deep link
async function handleLoginRequest(ctx: MasterContext, code: string, telegramId: number): Promise<void> {
  try {
    // Validate the auth code exists and is pending
    const { data: authCode, error } = await supabase
      .from('bb_auth_codes')
      .select('*')
      .eq('code', code)
      .eq('status', 'pending')
      .single()
    
    if (error || !authCode) {
      await ctx.reply(
        `❌ <b>Invalid Login Request</b>\n\n` +
        `This login link is invalid or has expired.\n\n` +
        `Please try again from the web dashboard.`,
        { parse_mode: 'HTML' }
      )
      return
    }
    
    // Check if expired
    if (new Date(authCode.expires_at) < new Date()) {
      await ctx.reply(
        `❌ <b>Login Request Expired</b>\n\n` +
        `This login link has expired.\n\n` +
        `Please try again from the web dashboard.`,
        { parse_mode: 'HTML' }
      )
      return
    }
    
    // Show confirmation prompt with inline keyboard
    const keyboard = new InlineKeyboard()
      .text('✅ Approve Login', `login_approve_${code}`)
      .text('❌ Deny', `login_deny_${code}`)
    
    await ctx.reply(
      `🔐 <b>Login Request</b>\n\n` +
      `Someone is trying to log into <b>Moongate Booths</b> dashboard with your Telegram account.\n\n` +
      `If this was you, tap <b>Approve</b> below.\n` +
      `If not, tap <b>Deny</b> to block this request.`,
      { 
        parse_mode: 'HTML',
        reply_markup: keyboard 
      }
    )
  } catch (err) {
    console.error('Login request error:', err)
    await ctx.reply('An error occurred. Please try again.')
  }
}

async function submitBugReport(ctx: MasterContext, report: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('bb_bugs')
      .insert({
        telegram_id: ctx.from?.id,
        username: ctx.from?.username || null,
        report
      })

    if (error) throw error

    ctx.session.step = 'idle'
    await ctx.reply(
      `✅ <b>Bug Report Submitted</b>\n\n` +
      `Thank you for helping us improve Moongate Booths!\n\n` +
      `Your report has been logged and we'll look into it.`,
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    console.error('Failed to submit bug report:', error)
    await ctx.reply('❌ Failed to submit bug report. Please try again later.')
    ctx.session.step = 'idle'
  }
}
