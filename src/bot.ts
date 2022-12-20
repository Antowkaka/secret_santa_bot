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

const stage = new Scenes.Stage<Scenes.SceneContext>([welcomeScene, fillInfoScene]);
stage.command('/exit', async ctx => {
	const userInfoFromCb = ctx.scene.state;

	if (userInfoState(userInfoFromCb)) {
		console.log('leaving...');

		const db = new LocalDbService(userInfoFromCb.userGroupChatId);
		await db.removeUserInfo(userInfoFromCb.userId);
		ctx.scene.leave();
	}
});

bot.use(new LocalSession({ database: './src/database/local-sessin-db.json' }).middleware());
bot.use(stage.middleware());
bot.use(Telegraf.log());

bot.command('/start', ctx => ctx.scene.enter(ScenarioType.WELCOME_SCENE));

bot.on('my_chat_member', async (ctx) => {
	const { new_chat_member, old_chat_member, chat } = ctx.myChatMember;

	if (chat.type === 'group') {
		const localDbService = new LocalDbService(chat.id);
		if (new_chat_member.user.id === ctx.botInfo.id && new_chat_member.status === 'administrator') {
			// send a message when bot get an admin permissions
			ctx.telegram.sendMessage(chat.id, messages.chat_welcome_message);

			// set chat ID as database to local database
			const chatCount = await ctx.telegram.getChatMembersCount(chat.id);
			const excludeBotCount = chatCount - 1;
			if (excludeBotCount < 2) {
				ctx.telegram.sendMessage(chat.id, `${messages.chat_poll_unavailable}`);
			} else {
				await localDbService.setChatToDb(chat.title, excludeBotCount);

				// send poll for users (users count - bot)
				ctx.telegram.sendMessage(chat.id, `${messages.chat_poll_title} (0/${excludeBotCount})`, {
					reply_markup: {
						inline_keyboard: [
							[pollYes],
							[pollNo],
						]
					}
				});
			}
		}

		if (old_chat_member.user.id === ctx.botInfo.id
			&& new_chat_member.user.id === ctx.botInfo.id
			&& new_chat_member.status === 'member'
		) {
			// send a message when bot lose an admin permissions
			ctx.telegram.sendMessage(chat.id, messages.chat_goodbay_message);
			// remove from local db
			await localDbService.deleteChatFromDb();
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
			// register user in db (as Secret Santa)
			await dbService.setParticipation({
				userId: from.id,
				isParticipates: ctx.match[0] === InlineActions.PollYes,
			});
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