import type {InlineKeyboardButton } from 'telegraf/types';

import { fillInfoSteps, messages } from './config/variables';
import { FillInfoStep, UpdateUserInfoData } from './types';

export function createAllMembersCountDbFieldPath(chatId: number): string {
	return `/${chatId}_all_members_count`;
}

export function createRegisteredMembersDbFieldPath(
	chatId: number,
	appendArr?: boolean
): string {
	return `/${chatId}_registered_members${appendArr ? '[]' : ''}`;
}

export function createRegisteredUsersInfoPath(
	chatId: number,
	appendArr?: boolean,
): string {
	return `/${chatId}_members_info${appendArr ? '[]' : ''}`;
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