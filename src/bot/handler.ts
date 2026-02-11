import { Bot } from 'grammy'
import type { BotContext } from './types'
import { ConversationState } from './types'
import {
  sessionMiddleware,
  eventContextMiddleware,
  billingMiddleware,
  errorMiddleware
} from './middleware'
import {
  handleStartCommand,
  handleRegisterVisitor,
  handleNameInput,
  handleEmailInput,
  handlePhoneInput,
  handleWalletInput,
  handleNotesInput,
  handleSkip,
  handleConfirm,
  handleEdit,
  handleEditField,
  handleBackToConfirm
} from './flow/visitor.flow'
import {
  handleStatsCommand,
  handleExportCommand,
  handleBroadcastCommand
} from './flow/admin.flow'

export function createBotInstance(token: string, botId: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token)

  bot.use(errorMiddleware())
  bot.use(sessionMiddleware(botId))
  bot.use(eventContextMiddleware())
  bot.use(billingMiddleware())

  bot.command('start', handleStartCommand())
  bot.command('stats', handleStatsCommand())
  bot.command('export', handleExportCommand())
  bot.command('broadcast', handleBroadcastCommand())

  bot.callbackQuery('register_visitor', handleRegisterVisitor())
  bot.callbackQuery(/^skip_/, handleSkip())
  bot.callbackQuery('confirm_registration', handleConfirm())
  bot.callbackQuery('edit_registration', handleEdit())
  bot.callbackQuery(/^edit_/, handleEditField())
  bot.callbackQuery('back_to_confirm', handleBackToConfirm())

  bot.on('message:text', async (ctx: BotContext, next) => {
    switch (ctx.session.state) {
      case ConversationState.COLLECTING_NAME:
        return handleNameInput()(ctx)
      case ConversationState.COLLECTING_EMAIL:
        return handleEmailInput()(ctx)
      case ConversationState.COLLECTING_PHONE:
        return handlePhoneInput()(ctx)
      case ConversationState.COLLECTING_WALLET:
        return handleWalletInput()(ctx)
      case ConversationState.COLLECTING_NOTES:
        return handleNotesInput()(ctx)
      default:
        await next()
    }
  })

  return bot
}
