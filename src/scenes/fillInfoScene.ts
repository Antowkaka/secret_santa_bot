import { Scenes } from 'telegraf';
import { message } from 'telegraf/filters';

import LocalDbService from '../database/localDbService';
import { messages } from '../config/variables';
import { register } from '../keyboard/buttons';
import {
	createStepsGenerator,
	mapStepToUpdateData,
	handleUsersRegistration,
} from '../utils';
import {
	ScenarioType,
	FillInfoSceneContext,
	userInfoState,
	InlineActions,
	User,
	isUserFullfield,
} from '../types';

const fillInfoScene = new Scenes.BaseScene<FillInfoSceneContext>(ScenarioType.FILL_INFO_SCENE);

fillInfoScene.enter(ctx => {
	const userInfoFromCb = ctx.scene.state;

	if (userInfoState(userInfoFromCb)) {
		const { userId, userGroupChatId, userPrivateChatId } = userInfoFromCb;

		ctx.scene.session.stepsGenerator = createStepsGenerator();
		ctx.scene.session.userInfo = {
			id: userId,
			groupChatId: userGroupChatId,
			privateChatId: userPrivateChatId,
		};

		ctx.reply(messages.step_annotation_fill_info_name, {
			parse_mode: 'HTML',
		});
	}
});

fillInfoScene.on(message('text'), ctx => {
	const updateUserInfo = ctx.scene.session.stepsGenerator && ctx.scene.session.stepsGenerator.next();
	const prevUserInfo = ctx.scene.session?.userInfo;

	if (updateUserInfo?.value && !updateUserInfo.done) {
		const { field, message, last } = mapStepToUpdateData(updateUserInfo.value);
		ctx.scene.session.userInfo = {
			[field]: ctx.message.text,
			...prevUserInfo,
		};

		console.log(`user info in step: ${updateUserInfo.value} `, ctx.scene.session.userInfo);

		if (last) {
			ctx.reply(message, {
				reply_markup: {
					inline_keyboard: [[register]]
				},
				parse_mode: 'HTML',
			});
		} else {
			ctx.reply(message, {
				parse_mode: 'HTML',
			});
		}
	}
});

fillInfoScene.action(InlineActions.Register, async ctx => {
	const userInfo = ctx.scene.session.userInfo;

	if (userInfo && isUserFullfield(userInfo)) {
		const { groupChatId } = userInfo;
		const dbService = new LocalDbService(groupChatId);

		const user: User | undefined = await dbService.getUserInfo(userInfo.id);

		if (user) {
			ctx.reply(messages.step_annotation_end_already_registered, {
				parse_mode: 'HTML',
			});
		} else {
			await dbService.setUserInfo(userInfo);

			const allRegisteredUsers = await dbService.getRegistrations();
			const allChatMembers = await dbService.getChatUsersCount();

			const isAllRegistered = allRegisteredUsers.length === allChatMembers;

			if (isAllRegistered) {
				handleUsersRegistration(allRegisteredUsers, ctx);
			} else {
				ctx.reply(messages.step_annotation_end_registered, {
					parse_mode: 'HTML',
				});
			}
		}
	}

	ctx.answerCbQuery();
});

export default fillInfoScene;