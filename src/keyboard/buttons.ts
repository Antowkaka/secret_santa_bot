import type { InlineKeyboardButton } from 'telegraf/types';
import { messages } from '../config/variables';

export const pollYes: InlineKeyboardButton.CallbackButton = {
	text: messages.poll_yes,
	callback_data: 'poll_yes',
};
export const pollNo: InlineKeyboardButton.CallbackButton = {
	text: messages.poll_no,
	callback_data: 'poll_no',
};