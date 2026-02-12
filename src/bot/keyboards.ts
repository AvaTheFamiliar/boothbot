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
    .text('Edit Company', 'edit_company').row()
    .text('Edit Role', 'edit_title').row()
    .text('Edit Email', 'edit_email').row()
    .text('← Back', 'back_to_confirm')
}
