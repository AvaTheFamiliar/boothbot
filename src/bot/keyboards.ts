import { InlineKeyboard } from 'grammy'

export function getStartKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Register as Visitor', 'register_visitor')
}

export function getSkipKeyboard(action: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('Skip', `skip_${action}`)
}

export function getConfirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Confirm', 'confirm_registration')
    .text('Edit', 'edit_registration')
}

export function getEditFieldsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Edit Name', 'edit_name').row()
    .text('Edit Email', 'edit_email').row()
    .text('Edit Phone', 'edit_phone').row()
    .text('Edit Wallet', 'edit_wallet').row()
    .text('Edit Notes', 'edit_notes').row()
    .text('Back to Confirm', 'back_to_confirm')
}
