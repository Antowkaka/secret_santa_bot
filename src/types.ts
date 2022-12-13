import type { InlineKeyboardButton } from 'telegraf/types';
import type { SceneSessionData } from "telegraf/typings/scenes";

type User = {
	id: string;
	firstName: string;
	lastName: string;
	info?: string;
}

export type UserParticipation = Readonly<{
	userId: number;
	isParticipates: boolean;
}>;

export type DbData = {
	[key: string]: User[];
}

export enum InlineActions {
	PollYes = 'poll_yes',
	PollNo = 'poll_no'
}

export type RegisteredChats = {
	id: number;
	title: string;
}[]

export type SceneContextWithChooseChatKeyboard = SceneSessionData & {
	chooseChatKeyboard?: InlineKeyboardButton[][];
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