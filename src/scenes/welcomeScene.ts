import { Scenes } from 'telegraf';
import type { CallbackQuery, InlineKeyboardButton } from 'telegraf/types';

import LocalDb from '../database/localDb';
import { ScenarioType, RegisteredChats, UserParticipation, SceneContextWithChooseChatKeyboard } from '../types';
import { messages, env } from '../config/variables';
import { createRegisteredMembersDbFieldPath } from '../utils';

type WelcomeSceneContext = Scenes.SceneContext<SceneContextWithChooseChatKeyboard>;

const welcomeScene = new Scenes.BaseScene<WelcomeSceneContext>(ScenarioType.WELCOME_SCENE);

welcomeScene.enter(async ctx => {
	ctx.reply(messages.private_chat_welcome_user);
	ctx.scene.session.state = new Set();
	const registeredChats: RegisteredChats = await LocalDb.getData(env.DB_FIELD_REGISTERED_CHATS);
	const chooseChatKeyboard = registeredChats.map((chat): InlineKeyboardButton[] => ([{
		text: chat.title,
		callback_data: chat.id.toString(),
	}]));
	// we need to create the same keyboard for non-existed/non-participated users
	ctx.scene.session.chooseChatKeyboard = chooseChatKeyboard;

  ctx.reply(`<b>${messages.step_annotation_welcome}</b> ${messages.private_chat_welcome_choose_title}`, {
		reply_markup: {
			inline_keyboard: chooseChatKeyboard
		},
		parse_mode: 'HTML',
	});
});

welcomeScene.on('callback_query', async ctx => {
	const { data, from } = ctx.callbackQuery as CallbackQuery.DataQuery;
	const parsedChatId = parseInt(data);
	const user: UserParticipation | undefined = await LocalDb.find(
		createRegisteredMembersDbFieldPath(parsedChatId),
		(user: UserParticipation) => user.userId === from.id
	);
	const chooseKeyboard = ctx.scene.session.chooseChatKeyboard;

	if (user) {
		if (user.isParticipates) {
			ctx.reply(messages.private_chat_fill_info_welcome, {
				parse_mode: 'HTML',
			});
		} else {
			ctx.reply(messages.private_chat_try_again_non_participant, {
				parse_mode: 'HTML',
				...(chooseKeyboard && {
					reply_markup: {
						inline_keyboard: chooseKeyboard,
					}
				})
			});
		}
	} else {
		ctx.reply(messages.private_chat_try_again, {
			parse_mode: 'HTML',
			...(chooseKeyboard && {
				reply_markup: {
					inline_keyboard: chooseKeyboard,
				}
			})
		});
	}
});

export default welcomeScene;