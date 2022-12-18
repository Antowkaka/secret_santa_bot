import type { InlineKeyboardButton } from 'telegraf/types';

import { messages } from '../config/variables';
import { InlineActions } from '../types';

export const pollYes: InlineKeyboardButton.CallbackButton = {
	text: messages.poll_yes,
	callback_data: InlineActions.PollYes,
};
export const pollNo: InlineKeyboardButton.CallbackButton = {
	text: messages.poll_no,
	callback_data: InlineActions.PollNo,
};

export const register: InlineKeyboardButton.CallbackButton = {
	text: messages.step_annotation_register_button,
	callback_data: InlineActions.Register,
};