import type {InlineKeyboardButton } from 'telegraf/types';

export function createAllMembersCountDbFieldPath(chatId: number): string {
	return `/${chatId}_all_members_count`;
}

export function createRegisteredMembersCountDbFieldPath(
	chatId: number,
	appendArr?: boolean
): string {
	return `/${chatId}_registered_members${appendArr ? '[]' : ''}`;
}

export function createDbFieldPath(chatId: number): string {
	return `/${chatId}_members_info`;
}

export function incrementPollBtn(
	btn: InlineKeyboardButton.CallbackButton,
	value: number,
): InlineKeyboardButton.CallbackButton {
	return {
		text: `${btn.text} (${value})`,
		callback_data: btn.callback_data,
	};
}