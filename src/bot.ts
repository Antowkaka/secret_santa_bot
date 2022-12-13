import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import LocalDb from './database/local-db';
import { env, messages } from './config/variables';
import { pollYes, pollNo } from './keyboard/buttons';
import {
	createDbFieldPath,
	createAllMembersCountDbFieldPath,
	createRegisteredMembersCountDbFieldPath,
	incrementPollBtn,
}  from './utils';

const bot = new Telegraf(env.BOT_TOKEN);

bot.on(message('text'), ctx => {
	const chatId = ctx.chat.id;
	console.log('Message: ', ctx);

	// send a message to the chat acknowledging receipt of their message
	ctx.telegram.sendMessage(chatId, 'Received your message');
});

bot.on('my_chat_member', async (ctx) => {
	const { new_chat_member, old_chat_member, chat } = ctx.myChatMember;
	const chatDbFieldPath = createDbFieldPath(chat.id);
	const chatAllMembersCountDbFieldPath = createAllMembersCountDbFieldPath(chat.id);
	const chatRegisteredMembersCountDbFieldPath = createRegisteredMembersCountDbFieldPath(chat.id);

	if (new_chat_member.user.id === ctx.botInfo.id && new_chat_member.status === 'administrator') {
		// send a message when bot get an admin permissions
		ctx.telegram.sendMessage(chat.id, messages.chat_welcome_message);

		// set chat ID as database to local database
		await LocalDb.push(chatDbFieldPath, []);
		const chatCount = await ctx.telegram.getChatMembersCount(chat.id);
		await LocalDb.push(chatAllMembersCountDbFieldPath, chatCount);
		await LocalDb.push(chatRegisteredMembersCountDbFieldPath, []);
		await LocalDb.load();

		// send poll for users
		ctx.telegram.sendMessage(chat.id, messages.chat_poll_title, {
			reply_markup: {
				inline_keyboard: [
					[pollYes],
					[pollNo],
				]
			}
		});
	}

	if (old_chat_member.user.id === ctx.botInfo.id
		&& new_chat_member.user.id === ctx.botInfo.id
		&& new_chat_member.status === 'member'
	) {
		// send a message when bot lose an admin permissions
		ctx.telegram.sendMessage(chat.id, messages.chat_goodbay_message);
		// remove from local db
		await LocalDb.delete(chatDbFieldPath);
		await LocalDb.delete(chatAllMembersCountDbFieldPath);
		await LocalDb.delete(chatRegisteredMembersCountDbFieldPath);
	}
});

bot.action('poll_yes', async ctx => {
	if (ctx.callbackQuery.message) {
		const { message: { message_id: msgId, chat: { id: chatId } }, from } = ctx.callbackQuery;
		// something like reactive (after push - updates length)
		const registeredUsersIds: number[] = await LocalDb.getData(createRegisteredMembersCountDbFieldPath(chatId));
		const isUserExist = registeredUsersIds.find(id => id === from.id);
		if (isUserExist) {
			ctx.answerCbQuery(messages.registered_exist_notification);
		} else {
			// register user in db (as Secret Santa)
			await LocalDb.push(createRegisteredMembersCountDbFieldPath(chatId, true), from.id, false);
			// get user notified
			ctx.answerCbQuery(messages.registered_notification);
			// increment inline button with registered users count
			ctx.telegram.editMessageReplyMarkup(chatId, msgId, undefined, {
				inline_keyboard: [
					[incrementPollBtn(pollYes, registeredUsersIds.length)],
					[pollNo]
				]
			});

			const allUsers = await ctx.telegram.getChatMembersCount(chatId);
			// not counted bot (allUsers - bot)
			if (registeredUsersIds.length === allUsers - 1) {
				ctx.telegram.editMessageText(chatId, msgId, undefined, messages.chat_all_registered);
			}
		}
	}
});

export default bot;