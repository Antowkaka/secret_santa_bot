import { Context, NarrowedContext, Telegraf, Scenes } from 'telegraf';
import LocalSession from 'telegraf-session-local';
import type { CallbackQuery, Update } from 'telegraf/types';

import LocalDbService from './database/localDbService';
import { env, messages } from './config/variables';
import { pollYes, pollNo } from './keyboard/buttons';
import { InlineActions, UserParticipation, ScenarioType, userInfoState } from './types';
import welcomeScene from './scenes/welcomeScene';
import fillInfoScene from './scenes/fillInfoScene';

const bot = new Telegraf<Scenes.SceneContext>(env.BOT_TOKEN);

bot.telegram.setMyCommands(
	[
		{ command: '/start', description: 'Try again' },
		{ command: '/reset_session', description: 'Reset user session' },
	],
	{ scope: { type: 'all_private_chats' }}
);

bot.telegram.setMyCommands(
	[
		{ command: '/reset_chat', description: 'Remove chat from database' },
		{ command: '/register_again', description: 'Register chat to database' },
	],
	{ scope: { type: 'all_chat_administrators' }}
);

const stage = new Scenes.Stage<Scenes.SceneContext>([welcomeScene, fillInfoScene]);
stage.command('/reset_session', async ctx => {
	const userInfoFromCb = ctx.scene.state;

	if (userInfoState(userInfoFromCb)) {
		console.log('leaving...');

		const db = new LocalDbService(userInfoFromCb.userGroupChatId);
		const isExist = await db.getUserInfo(userInfoFromCb.userId);

		if (isExist) {
			await db.removeUserInfo(userInfoFromCb.userId);
		}

		ctx.scene.leave();
	}
});

bot.use(new LocalSession({ database: './src/database/local-sessin-db.json' }).middleware());
bot.use(stage.middleware());
bot.use(Telegraf.log());

bot.command('/start', ctx => {
	if (ctx.chat.type === 'private') {
		ctx.scene.enter(ScenarioType.WELCOME_SCENE);
	}
});

bot.command('/register_again', async (ctx) => {
	const { id } = ctx.chat;
	const db = new LocalDbService(id);
	const chat = await db.getChat(id);

	if (chat) {
		// send a message when admin try to register already registered chat
		ctx.telegram.sendMessage(id, messages.chat_already_registered_to_db);
	} else {
		if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
			const admins = await ctx.getChatAdministrators();
			const isBotAdmin = admins.find(admin => admin.user.id === ctx.botInfo.id);
	
			if (isBotAdmin) {
				// set chat ID as database to local database
				const chatCount = await ctx.telegram.getChatMembersCount(id);
				// TODO: find posibility to exclude all bots
				const excludeBotCount = chatCount - 1;
				if (excludeBotCount < 2) {
					ctx.telegram.sendMessage(id, `${messages.chat_poll_unavailable}`);
				} else {
					await db.setChat(ctx.chat.title, excludeBotCount);
	
					// send poll for users (users count - bot)
					const chatPollMessage = await ctx.telegram.sendMessage(id, `${messages.chat_poll_title} (0/${excludeBotCount})`, {
						reply_markup: {
							inline_keyboard: [
								[pollYes],
								[pollNo],
							]
						}
					});
	
					await db.addChatMessageId(chatPollMessage.message_id);
				}
			} else {
				// send a message when admin try to register chat without admin rights
				ctx.telegram.sendMessage(id, messages.chat_is_not_admin);
			}
		}
	}
});

bot.command('/reset_chat', async (ctx) => {
	const { id } = ctx.chat;
	const db = new LocalDbService(id);
	const chat = await db.getChat(id);

	if (chat) {
		const userSessionsCount = await db.getRegistrationsCount();

		if (userSessionsCount === 0) {
			// remove bot poll message from chat
			chat.messages.forEach(messageId => ctx.telegram.deleteMessage(id, messageId));
			// remove from local db
			await db.deleteChat();
			// send a message when admin reset chat
			ctx.telegram.sendMessage(id, messages.chat_deleted_from_db);
		}
	}
});

bot.on('my_chat_member', async (ctx) => {
	const { new_chat_member, old_chat_member, chat } = ctx.myChatMember;

	if (chat.type === 'group' || chat.type === 'supergroup') {
		const localDbService = new LocalDbService(chat.id);
		if (new_chat_member.user.id === ctx.botInfo.id && new_chat_member.status === 'administrator') {
			// send a message when bot get an admin permissions
			ctx.telegram.sendMessage(chat.id, messages.chat_welcome_message);

			// set chat ID as database to local database
			const chatCount = await ctx.telegram.getChatMembersCount(chat.id);
			// TODO: find posibility to exclude all bots
			const excludeBotCount = chatCount - 1;
			if (excludeBotCount < 2) {
				ctx.telegram.sendMessage(chat.id, `${messages.chat_poll_unavailable}`);
			} else {
				await localDbService.setChat(chat.title, excludeBotCount);

				// send poll for users (users count - bot)
				const chatPollMessage = await ctx.telegram.sendMessage(chat.id, `${messages.chat_poll_title} (0/${excludeBotCount})`, {
					reply_markup: {
						inline_keyboard: [
							[pollYes],
							[pollNo],
						]
					}
				});

				await localDbService.addChatMessageId(chatPollMessage.message_id);
			}
		}

		if (old_chat_member.user.id === ctx.botInfo.id
			&& new_chat_member.user.id === ctx.botInfo.id
			&& new_chat_member.status === 'member'
		) {
			// send a message when bot lose an admin permissions
			ctx.telegram.sendMessage(chat.id, messages.chat_goodbay_message);
		}
	}
});

const pollHandler = async (
	ctx: NarrowedContext<Context<Update> & { match: RegExpExecArray }, Update.CallbackQueryUpdate<CallbackQuery>>
) => {
	if (ctx.callbackQuery.message) {
		const { message: { message_id: msgId, chat: { id: chatId } }, from } = ctx.callbackQuery;
		const dbService = new LocalDbService(chatId);
		// something like reactive (after push - updates length)
		const participatedUsers: UserParticipation[] = await dbService.getParticipations();
		const isUserExist = participatedUsers.length > 0 && participatedUsers.find(({ userId }) => userId === from.id);
		if (isUserExist) {
			ctx.answerCbQuery(messages.registered_exist_notification);
		} else {
			const isParticipates = ctx.match[0] === InlineActions.PollYes;
			// register user in db (as Secret Santa)
			await dbService.setParticipation({
				userId: from.id,
				isParticipates,
			});

			// exclude users which don`t want to play
			if (!isParticipates) {
				const currCount = await dbService.getChatUsersCount();
				await dbService.updateChatUsersCount(currCount - 1);
			}
			// get user notified
			ctx.answerCbQuery(messages.registered_notification);
			// update title with registered users count
			const allUsers = await dbService.getChatUsersCount();
			const updatedTitle = `${messages.chat_poll_title} ${participatedUsers.length}/${allUsers}`;
			// not counted bot (allUsers - bot)
			if (participatedUsers.length === allUsers) {
				ctx.telegram.editMessageText(chatId, msgId, undefined, messages.chat_all_registered);
			} else {
				ctx.telegram.editMessageText(chatId, msgId, undefined, updatedTitle, {
					reply_markup: {
						inline_keyboard: [
							[pollYes],
							[pollNo],
						]
					}
				});
			}
		}
	}
};

bot.action(InlineActions.PollYes, pollHandler);
bot.action(InlineActions.PollNo, pollHandler);

export default bot;