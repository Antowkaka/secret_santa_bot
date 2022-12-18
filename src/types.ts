import type { InlineKeyboardButton } from 'telegraf/types';
import type { SceneSessionData } from "telegraf/typings/scenes";

export type User = Partial<{
	// process data
	id: number;
	groupChatId: number;
	privateChatId: number;
	// public data
	fullName: string;
	number: string;
	city: string;
	novaPoshtaNo: string;
}>

export type UserParticipation = Readonly<{
	userId: number;
	isParticipates: boolean;
}>;

export type DbData = {
	[key: string]: User[];
}

export enum InlineActions {
	PollYes = 'poll_yes',
	PollNo = 'poll_no',
	Register = 'register',
}

export type RegisteredChats = {
	id: number;
	title: string;
}[]

export type SceneContextWithChooseChatKeyboard = SceneSessionData & {
	chooseChatKeyboard?: InlineKeyboardButton[][];
}

export type SceneContextWithUserInfo = SceneSessionData & {
	stepsGenerator?: Generator<FillInfoStep>;
	userInfo?: User;
}

// start -> 'Hello' + keyboard (available chats)
// choose -> check -> isExist ? FillInfoScene : TryAgainScene
// filling steps -> check filling info array count -> isLastUser ? RandomizerScene : WaitOtherScene
// wait other -> RandomizerScene
// try again -> choose
// randomizer -> send pair user -> GoodBayScene

export enum ScenarioType {
	WELCOME_SCENE = 'welcome_scene',
	FILL_INFO_SCENE = 'fill_info_scene',
	TRY_AGAIN_SCENE = 'try_again_scene',
	RANDOMIZR_SCENE = 'randomizer_scene',
	WAIT_OTHER_SCENE = 'wait_other_scene',
	GOOD_BAY_SCENE = 'good_bay_scene'
}

export enum FillInfoStep {
	FullName = 'first-step',
	Number = 'second-step',
	City = 'third-step',
	NovaPoshtaNo = 'fourth-step',
}

export type UpdateUserInfoData = Readonly<{
	field: keyof User;
	// next step message
	message: string;
	last: boolean;
}>;

export type UserStateInfo = Readonly<{
	userId: number;
	userGroupChatId: number;
	userPrivateChatId: number;
}>;

export const userInfoState = (
	state: object
): state is UserStateInfo => Object.hasOwn(state, 'userId')
	&& Object.hasOwn(state, 'userGroupChatId')
	&& Object.hasOwn(state, 'userPrivateChatId');

export const isUserFullfield = (user: User): user is Required<User> => {
	const allSettled: boolean[] = [];

	for (const field of Object.keys(user)) {
		allSettled.push(Object.hasOwn(user, field));
	}

	return allSettled.every(isExist => isExist);
}