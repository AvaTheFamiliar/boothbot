import { Bot, Context, session, SessionFlavor } from 'grammy'
import { supabase } from '../db/client'
import { createTenant, findTenantByTelegramId } from '../db/repositories/tenant.repository'
import { createBot, findBotsByTenantId } from '../db/repositories/bot.repository'
import { setupBotWebhook } from '../bot/manager'

interface SessionData {
  step: 'idle' | 'awaiting_token' | 'awaiting_event_name' | 'awaiting_event_slug'
  pendingBotId?: string
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

    // Check if already registered
    const existingTenant = await findTenantByTelegramId(telegramId)
    
    if (existingTenant) {
      const bots = await findBotsByTenantId(existingTenant.id)
      await ctx.reply(
        `👋 Welcome back!\n\n` +
        `You have ${bots.length} bot(s) set up.\n\n` +
        `Commands:\n` +
        `/newbot - Create a new booth bot\n` +
        `/mybots - List your bots\n` +
        `/help - Show all commands`
      )
    } else {
      await ctx.reply(
        `🎪 Welcome to BoothBot!\n\n` +
        `I help you capture leads at crypto conferences with your own Telegram bot.\n\n` +
        `Here's how it works:\n` +
        `1. Create a bot with @BotFather\n` +
        `2. Send me the token\n` +
        `3. I'll set everything up for you\n` +
        `4. Create events and get QR codes\n` +
        `5. Visitors scan → you capture leads!\n\n` +
        `🎁 Free trial: 7 days or 100 contacts\n\n` +
        `Ready? Use /newbot to get started!`
      )
    }
  })

  // /newbot command
  bot.command('newbot', async (ctx) => {
    ctx.session.step = 'awaiting_token'
    await ctx.reply(
      `🤖 Let's set up your booth bot!\n\n` +
      `First, create a bot with @BotFather:\n` +
      `1. Open @BotFather\n` +
      `2. Send /newbot\n` +
      `3. Choose a name and username\n` +
      `4. Copy the token and send it here\n\n` +
      `Waiting for your bot token...`
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
      `📋 Your Bots:\n\n${botList}\n\n` +
      `To manage a bot, message it directly and use /admin`
    )
  })

  // Handle token submission
  bot.on('message:text', async (ctx) => {
    if (ctx.session.step !== 'awaiting_token') return
    
    const token = ctx.message.text.trim()
    const telegramId = ctx.from?.id
    
    if (!telegramId) return

    // Validate token format
    if (!token.match(/^\d+:[A-Za-z0-9_-]{35}$/)) {
      await ctx.reply(
        '❌ That doesn\'t look like a valid bot token.\n\n' +
        'Bot tokens look like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz123456789\n\n' +
        'Get your token from @BotFather and try again.'
      )
      return
    }

    await ctx.reply('⏳ Validating your bot token...')

    try {
      // Test the token by calling getMe
      const testBot = new Bot(token)
      const botInfo = await testBot.api.getMe()

      // Find or create tenant
      let tenant = await findTenantByTelegramId(telegramId)
      
      if (!tenant) {
        tenant = await createTenant({
          telegram_id: telegramId,
          email: `tg_${telegramId}@boothbot.local`, // placeholder
          password_hash: '', // no password for TG users
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

      ctx.session.step = 'idle'

      await ctx.reply(
        `✅ Success! Your booth bot @${botInfo.username} is ready!\n\n` +
        `🎁 Your 7-day free trial has started.\n\n` +
        `Next steps:\n` +
        `1. Open @${botInfo.username}\n` +
        `2. Send /admin to access admin commands\n` +
        `3. Create your first event with /newevent\n\n` +
        `Need help? Send /help here anytime.`
      )
    } catch (error: any) {
      console.error('Bot setup error:', error)
      await ctx.reply(
        `❌ Couldn't set up that bot.\n\n` +
        `Error: ${error.message || 'Unknown error'}\n\n` +
        `Make sure:\n` +
        `• The token is correct\n` +
        `• The bot hasn't been deleted\n` +
        `• You're the owner of the bot\n\n` +
        `Try again or contact support.`
      )
    }
  })

  // /help command
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `📚 BoothBot Commands:\n\n` +
      `/start - Welcome message\n` +
      `/newbot - Create a new booth bot\n` +
      `/mybots - List your bots\n` +
      `/help - Show this message\n\n` +
      `🌐 Web Dashboard:\n` +
      `https://boothbot-dashboard.vercel.app\n\n` +
      `💬 Support: @BoothBotSupport`
    )
  })

  return bot
}
