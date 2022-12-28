import type { NarrowedContext } from 'telegraf';
import type {InlineKeyboardButton, Update, CallbackQuery } from 'telegraf/types';
import crypto from 'crypto';

import { fillInfoSteps, messages } from './config/variables';
import {
	FillInfoStep,
	UpdateUserInfoData,
	UserFromDb,
	PairUser,
	PublicUserInfo,
	UserPairs,
	PreparedUsersPairs,
	FillInfoSceneContext,
	assertNever,
	isObjKey,
	UserTempShufflingState,
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

export function createPreparedPairs(users: UserFromDb[]): UserPairs {
	const pairs: PairUser<UserFromDb>[][] = [];
	let rest = undefined;

	while (users.length) {
		const pair: PairUser<UserFromDb>[] = [];

		while (pair.length !== 2) {
			const randomUserIdx = Math.floor(Math.random() * users.length);
			const pairUser = users.splice(randomUserIdx, 1)[0];

			if (pairUser) {
				if (users.length === 0 && pair.length === 0) {
					rest = pairUser;
					break;
				} else {
					pair.push({ pairId: crypto.randomUUID(), ...pairUser });
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

export function shufflePreparedPairs(preparedPairs: PreparedUsersPairs): PreparedUsersPairs {
	const pairs: PreparedUsersPairs = [];
	const preparedUsers = preparedPairs.flat(2);
	const santas = preparedUsers.filter(({ isSanta }) => isSanta);
	const targets = preparedUsers.filter(({ isTarget }) => isTarget);

	while (santas.length && targets.length) {
		// get random santa & target
		const randomSantaIdx = Math.floor(Math.random() * santas.length);
		const randomTargetIdx = Math.floor(Math.random() * targets.length);
		// take by index
		const santaUser = santas.at(randomSantaIdx);
		const targetUser = targets.at(randomTargetIdx);

		// check: is there from prev pair ?
		if (santaUser && targetUser && santaUser.pairId !== targetUser.pairId) {
			pairs.push([santaUser, targetUser]);

			// remove from all
			santas.splice(randomSantaIdx, 1);
			targets.splice(randomTargetIdx, 1);
		}
	}

	return pairs;
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

export function parseUserInfoToMessage(userInfo: PairUser<UserFromDb | UserTempShufflingState>): string {
	const publicInfo: PublicUserInfo = {
		fullName: userInfo.fullName,
		number: userInfo.number,
		city: userInfo.city,
		novaPoshtaNo: userInfo.novaPoshtaNo,
	};

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
	const { pairs, rest } = createPreparedPairs(users);
	const preparedPairs: PreparedUsersPairs = [];

	// first randomizing step (raw users randomizer)
	pairs.forEach(pair => {
		const firstUserInfo = pair[0];
		const secondUserInfo = pair[1];

		if (firstUserInfo && secondUserInfo) {
			// second user - 'target', first - 'santa'
			ctx.telegram.sendMessage(
				firstUserInfo.privateChatId,
				[messages.result_target, parseUserInfoToMessage(secondUserInfo)].join('\n'),
				{ parse_mode: 'HTML' }
			);

			if (pairs.length === 1) {
				// first user - 'target', second - 'santa'
				ctx.telegram.sendMessage(
					secondUserInfo.privateChatId,
					[messages.result_target, parseUserInfoToMessage(firstUserInfo)].join('\n'), 
					{ parse_mode: 'HTML' }
				);
			}

			preparedPairs.push([
				{
					isSanta: true,
					isTarget: false,
					...firstUserInfo,
				},
				{
					isSanta: false,
					isTarget: true,
					...secondUserInfo,
				},
			]);
		}
	});

	// second randomizing step with more then 1 pairs (prepared users)
	if (pairs.length > 1) {
		const shuffledPairs = shufflePreparedPairs(preparedPairs);
		shuffledPairs.forEach(pair => {
			const firstUserInfo = pair[0];
			const secondUserInfo = pair[1];

			if (firstUserInfo && secondUserInfo) {
				if (firstUserInfo.isTarget) {
					// second user - 'target', first - 'santa'
					ctx.telegram.sendMessage(
						firstUserInfo.privateChatId,
						[messages.result_target, parseUserInfoToMessage(secondUserInfo)].join('\n'),
						{ parse_mode: 'HTML' }
					);
				}

				if (secondUserInfo.isTarget) {
					// first user - 'target', second - 'santa'
					ctx.telegram.sendMessage(
						secondUserInfo.privateChatId,
						[messages.result_target, parseUserInfoToMessage(firstUserInfo)].join('\n'), 
						{ parse_mode: 'HTML' }
					);
				}
			}
		})
	}

	if (rest) {
		const allUsersInPairs = pairs.flat();
		const randomUserFromPairs = allUsersInPairs.at(Math.floor(Math.random() * allUsersInPairs.length));

		if (randomUserFromPairs) {
			const restUserTargetMessage = [messages.result_target, parseUserInfoToMessage(randomUserFromPairs)].join('\n');
			const randomUserFromPairsTargetMessage = [messages.result_target_with_rest, parseUserInfoToMessage({ pairId: '', ...rest })].join('\n');

			ctx.telegram.sendMessage(rest.privateChatId, restUserTargetMessage, {
				parse_mode: 'HTML',
			});

			ctx.telegram.sendMessage(randomUserFromPairs.privateChatId, randomUserFromPairsTargetMessage, {
				parse_mode: 'HTML',
			});
		}
	}
}