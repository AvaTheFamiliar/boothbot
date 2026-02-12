import { Bot, Context, session, SessionFlavor } from 'grammy'
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

  // /start command
  bot.command('start', async (ctx) => {
    const telegramId = ctx.from?.id
    if (!telegramId) return

    const existingTenant = await findTenantByTelegramId(telegramId)
    
    if (existingTenant) {
      const bots = await findBotsByTenantId(existingTenant.id)
      await ctx.reply(
        `👋 Welcome back to BoothBot!\n\n` +
        `You have ${bots.length} booth bot(s) set up.\n\n` +
        `Commands:\n` +
        `/newbot - Create a new booth bot\n` +
        `/mybots - List your bots\n` +
        `/help - Show all commands`,
        { parse_mode: 'HTML' }
      )
    } else {
      await ctx.reply(
        `🎪 <b>Welcome to BoothBot!</b>\n\n` +
        `Capture leads at crypto conferences with your own branded Telegram bot.\n\n` +
        `<b>How it works:</b>\n` +
        `1️⃣ Create a bot with @BotFather\n` +
        `2️⃣ Send me the token\n` +
        `3️⃣ Create events & get QR codes\n` +
        `4️⃣ Visitors scan → you capture leads!\n\n` +
        `💰 <b>Pricing:</b>\n` +
        `• Free: Up to 25 contacts\n` +
        `• Pro: $100/mo per 1,000 contacts\n\n` +
        `Ready? Use /newbot to get started!`,
        { parse_mode: 'HTML' }
      )
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
      `📚 <b>BoothBot Commands</b>\n\n` +
      `/start - Welcome message\n` +
      `/newbot - Create a new booth bot\n` +
      `/mybots - List your bots\n` +
      `/bug - Report a bug\n` +
      `/help - Show this message\n\n` +
      `🌐 <b>Web Dashboard:</b>\n` +
      `https://boothbot-dashboard.vercel.app\n\n` +
      `💰 <b>Pricing:</b>\n` +
      `• Free: Up to 25 contacts\n` +
      `• Pro: $100/mo per 1,000 contacts`,
      { parse_mode: 'HTML' }
    )
  })

  // /bug command
  bot.command('bug', async (ctx) => {
    const bugText = ctx.message?.text?.replace('/bug', '').trim()
    
    if (bugText && bugText.length > 5) {
      // Inline bug report
      await submitBugReport(ctx, bugText)
    } else {
      // Ask for bug report
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
          email: `tg_${telegramId}@boothbot.local`,
          password_hash: '',
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
        // Set the "What can this bot do?" description (shown before /start)
        await testBot.api.setMyDescription({
          description: `🎪 Official Event Registration Bot\n\n` +
            `Scan a QR code at our booth to:\n` +
            `✓ Register for the event\n` +
            `✓ Get exclusive updates\n` +
            `✓ Connect with our team\n\n` +
            `Powered by Moongate 🌙`
        })

        // Set short description (shown in search/share)
        await testBot.api.setMyShortDescription({
          short_description: `Event registration & lead capture. Powered by Moongate 🌙`
        })

        // Set available commands
        await testBot.api.setMyCommands([
          { command: 'start', description: 'Start or register for an event' },
          { command: 'help', description: 'Show help and available commands' }
        ])

        // Set admin commands (only visible to admins)
        await testBot.api.setMyCommands([
          { command: 'start', description: 'Start or register for an event' },
          { command: 'admin', description: 'Admin panel' },
          { command: 'newevent', description: 'Create a new event' },
          { command: 'events', description: 'List your events' },
          { command: 'stats', description: 'View event statistics' },
          { command: 'export', description: 'Export visitors to CSV' },
          { command: 'broadcast', description: 'Send message to all visitors' },
          { command: 'help', description: 'Show help and available commands' }
        ], { scope: { type: 'chat', chat_id: telegramId } })

        console.log(`[masterbot] Configured bot @${botInfo.username} with descriptions and commands`)
      } catch (configError) {
        console.error('[masterbot] Failed to configure bot profile:', configError)
        // Non-fatal, continue anyway
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
        `🎁 <b>Free tier:</b> Up to 25 contacts included!`,
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
      `Thank you for helping us improve BoothBot!\n\n` +
      `Your report has been logged and we'll look into it.`,
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    console.error('Failed to submit bug report:', error)
    await ctx.reply('❌ Failed to submit bug report. Please try again later.')
    ctx.session.step = 'idle'
  }
}
