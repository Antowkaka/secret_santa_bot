import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import LocalDb from './database/local-db';
import { env, messages } from './config/variables';
import { pollYes, pollNo } from './keyboard/buttons';

const bot = new Telegraf(env.BOT_TOKEN);

bot.on(message('text'), ctx => {
	const chatId = ctx.chat.id;
	console.log('Message: ', ctx);

	// send a message to the chat acknowledging receipt of their message
	ctx.telegram.sendMessage(chatId, 'Received your message');
});

bot.on('my_chat_member', async (ctx) => {
	const { new_chat_member, old_chat_member, chat } = ctx.myChatMember;
	const chatDbFieldPath = `/${chat.id}`;
	const chatMembersCountDbFieldPath = `/${chat.id}_members_count`;

	if (new_chat_member.user.id === ctx.botInfo.id && new_chat_member.status === 'administrator') {
		// send a message when bot get an admin permissions
		ctx.telegram.sendMessage(chat.id, messages.chat_welcome_message);
		ctx.telegram.sendMessage(chat.id, messages.chat_poll_title, {
			reply_markup: {
				inline_keyboard: [
					[pollYes],
					[pollNo],
				]
			}
		});

		// set chat ID as database to local database
		await LocalDb.push(chatDbFieldPath, []);
		const chatCount = await ctx.telegram.getChatMembersCount(chat.id);
		await LocalDb.push(chatMembersCountDbFieldPath, chatCount);
	}

	if (old_chat_member.user.id === ctx.botInfo.id
		&& new_chat_member.user.id === ctx.botInfo.id
		&& new_chat_member.status === 'member'
	) {
		// send a message when bot lose an admin permissions
		ctx.telegram.sendMessage(chat.id, messages.chat_goodbay_message);
		// todo: remove from state
		await LocalDb.delete(chatDbFieldPath);
		await LocalDb.delete(chatMembersCountDbFieldPath);
	}
});

bot.action('poll_yes', async ctx => {
	const chatId = ctx.callbackQuery.message?.chat.id;
	if (chatId) {
		LocalDb.push(`/${chatId}[]`, ctx.from?.id, true);
	}
	ctx.answerCbQuery(messages.registered_notification);
});

export default bot;