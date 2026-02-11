import { Bot } from 'grammy'
import type { BotContext } from './types'
import { createBotInstance } from './handler'
import { findBotById } from '../db/repositories/bot.repository'

class BotManager {
  private bots: Map<string, Bot<BotContext>> = new Map()

  async registerBot(botId: string, token: string): Promise<Bot<BotContext>> {
    const existingBot = this.bots.get(botId)
    if (existingBot) {
      return existingBot
    }

    const bot = createBotInstance(token, botId)
    // Initialize bot to fetch bot info (required for handling updates)
    await bot.init()
    console.log(`[botManager] Bot ${botId} initialized: @${bot.botInfo?.username}`)
    this.bots.set(botId, bot)
    return bot
  }

  async getBotInstance(botId: string): Promise<Bot<BotContext> | null> {
    const existingBot = this.bots.get(botId)
    if (existingBot) {
      return existingBot
    }

    try {
      const botData = await findBotById(botId)
      if (!botData) return null

      return await this.registerBot(botId, botData.token)
    } catch {
      return null
    }
  }

  unregisterBot(botId: string): void {
    const bot = this.bots.get(botId)
    if (bot) {
      bot.stop()
      this.bots.delete(botId)
    }
  }

  async handleWebhook(botId: string, update: unknown): Promise<void> {
    console.log(`[botManager] handleWebhook called for bot ${botId}`)
    const bot = await this.getBotInstance(botId)
    if (!bot) {
      console.error(`[botManager] Bot ${botId} not found in manager or DB`)
      throw new Error('Bot not found')
    }

    console.log(`[botManager] Handling update for bot ${botId}`)
    await bot.handleUpdate(update)
    console.log(`[botManager] Update handled successfully for bot ${botId}`)
  }
}

export const botManager = new BotManager()
