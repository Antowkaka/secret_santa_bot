import type { NarrowedContext } from 'telegraf';
import type {InlineKeyboardButton, Update, CallbackQuery } from 'telegraf/types';

import { fillInfoSteps, messages } from './config/variables';
import {
	FillInfoStep,
	UpdateUserInfoData,
	UserFromDb,
	PublicUserInfo,
	UserPairs,
	FillInfoSceneContext,
	assertNever,
	isObjKey,
} from './types';

export function createChatMembersCountDbFieldPath(chatId: number): string {
	return `/${chatId}_chat_members_count`;
}

export function createParticipatedMembersDbFieldPath(
	chatId: number,
	appendArr?: boolean
): string {
	return `/${chatId}_participated_members${appendArr ? '[]' : ''}`;
}

export function createRegisteredMembersDbFieldPath(
	chatId: number,
	appendArr?: boolean,
): string {
	return `/${chatId}_registered_members${appendArr ? '[]' : ''}`;
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

export function* createStepsGenerator(): Generator<FillInfoStep> {
	for (const step of fillInfoSteps) {
		yield step;
	}
}

export function mapStepToUpdateData(step: FillInfoStep): UpdateUserInfoData {
	switch (step) {
		case FillInfoStep.FullName:
			return {
				field: 'fullName',
				message: messages.step_annotation_fill_info_number,
				last: false,
			};
		case FillInfoStep.Number:
			return {
				field: 'number',
				message: messages.step_annotation_fill_info_city,
				last: false,
			};
		case FillInfoStep.City:
			return {
				field: 'city',
				message: messages.step_annotation_fill_info_np_no,
				last: false,
			};
		case FillInfoStep.NovaPoshtaNo:
			return {
				field: 'novaPoshtaNo',
				message: messages.step_annotation_register_data,
				last: true,
			};
	}
}

export function createPairs(users: UserFromDb[]): UserPairs {
	const pairs: UserFromDb[][] = [];
	let rest = undefined;

	while (users.length) {
		const pair = [];

		while (pair.length !== 2) {
			const randomUserIdx = Math.floor(Math.random() * users.length);
			const pairUser = users.splice(randomUserIdx, 1)[0];

			if (pairUser) {
				if (users.length === 0 && pair.length === 0) {
					rest = pairUser;
					break;
				} else {
					pair.push(pairUser);
				}
			}
		}

		pair.length === 2 && pairs.push(pair);
	}

	return {
		pairs,
		rest
	};
}

export function mapDbFieldToMessageField(
	dbField: keyof PublicUserInfo
): string {
	switch (dbField) {
		case 'fullName':
			return messages.db_to_message_field_name;
		case 'number':
			return messages.db_to_message_field_number;
		case 'city':
			return messages.db_to_message_field_city;
		case 'novaPoshtaNo':
			return messages.db_to_message_field_np_no;
		default: assertNever(dbField);
	}
}

export function parseUserInfoToMessage(userInfo: UserFromDb): string {
	const { id, groupChatId, privateChatId, ...publicInfo } = userInfo;

	const messagesRows = Object.entries(publicInfo).map<string>(([key, value]) =>
		isObjKey<PublicUserInfo>(key, publicInfo)
			? [mapDbFieldToMessageField(key), value].join(' ')
			: ''
	);

	return messagesRows.filter(row => row !== '').reverse().join('\n');
}

export function handleUsersRegistration(
	users: UserFromDb[],
	ctx: NarrowedContext<FillInfoSceneContext & {match: RegExpExecArray;}, Update.CallbackQueryUpdate<CallbackQuery>>
): void {
	const { pairs, rest } = createPairs(users);

	pairs.forEach(pair => {
		const firstUserInfo = pair[0];
		const secondUserInfo = pair[1];

		if (firstUserInfo && secondUserInfo) {
			const firstUserTargetMessage = [messages.result_target, parseUserInfoToMessage(secondUserInfo)].join('\n');
			const secondUserTargetMessage = [messages.result_target, parseUserInfoToMessage(firstUserInfo)].join('\n');

			ctx.telegram.sendMessage(firstUserInfo.privateChatId, firstUserTargetMessage, {
				parse_mode: 'HTML',
			});

			ctx.telegram.sendMessage(secondUserInfo.privateChatId, secondUserTargetMessage, {
				parse_mode: 'HTML',
			});
		}
	});

	if (rest) {
		const allUsersInPairs = pairs.flat();
		const randomUserFromPairs = allUsersInPairs.at(Math.floor(Math.random() * allUsersInPairs.length));

		if (randomUserFromPairs) {
			const restUserTargetMessage = [messages.result_target, parseUserInfoToMessage(randomUserFromPairs)].join('\n');
			const randomUserFromPairsTargetMessage = [messages.result_target_with_rest, parseUserInfoToMessage(rest)].join('\n');

			ctx.telegram.sendMessage(rest.privateChatId, restUserTargetMessage, {
				parse_mode: 'HTML',
			});

			ctx.telegram.sendMessage(randomUserFromPairs.privateChatId, randomUserFromPairsTargetMessage, {
				parse_mode: 'HTML',
			});
		}
	}
}