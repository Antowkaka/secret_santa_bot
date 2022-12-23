import LocalDb from './localDb';
import {
	createRegisteredMembersDbFieldPath,
	createChatMembersCountDbFieldPath,
	createParticipatedMembersDbFieldPath,
}  from '../utils';
import { env } from '../config/variables';
import type { UserParticipation, UserFromDb, ChatDbEntity } from '../types';

export default class LocalDbService {
	private readonly _chatId: number;
	private readonly _registeredMembersPath: string;
	private readonly _registeredMembersPushPath: string;
	private readonly _chatMembersCountDbFieldPath: string;
	private readonly _participatedMembersDbFieldPath: string;
	private readonly _participatedMembersDbFieldPushPath: string;

	constructor(chatId: number) {
		this._chatId = chatId;

		this._registeredMembersPath = createRegisteredMembersDbFieldPath(chatId);
		this._registeredMembersPushPath = createRegisteredMembersDbFieldPath(chatId, true);
		this._chatMembersCountDbFieldPath = createChatMembersCountDbFieldPath(chatId);
		this._participatedMembersDbFieldPath = createParticipatedMembersDbFieldPath(chatId);
		this._participatedMembersDbFieldPushPath = createParticipatedMembersDbFieldPath(chatId, true);
	}

	// common chat
	async setChat(title: string, usersCount: number): Promise<void> {
		await LocalDb.push(`${env.DB_FIELD_REGISTERED_CHATS}[]`, { id: this._chatId, title });
		await LocalDb.push(this._registeredMembersPath, []);
		await LocalDb.push(this._chatMembersCountDbFieldPath, usersCount);
		await LocalDb.push(this._participatedMembersDbFieldPath, []);
	}

	async addChatMessageId(messageId: number): Promise<void> {
		const chatInxInDb = await LocalDb.getIndex(env.DB_FIELD_REGISTERED_CHATS, this._chatId);
		await LocalDb.push(`${env.DB_FIELD_REGISTERED_CHATS}[${chatInxInDb}]/messages[]`, messageId);
	}

	async deleteChat(): Promise<void> {
		const chatInxInDb = await LocalDb.getIndex(env.DB_FIELD_REGISTERED_CHATS, this._chatId);
		await LocalDb.delete(`${env.DB_FIELD_REGISTERED_CHATS}[${chatInxInDb}]`);
		await LocalDb.delete(this._registeredMembersPath);
		await LocalDb.delete(this._chatMembersCountDbFieldPath);
		await LocalDb.delete(this._participatedMembersDbFieldPath);
	}

	async getChat(chatId: number): Promise<ChatDbEntity | undefined> {
		return LocalDb.find(
			env.DB_FIELD_REGISTERED_CHATS,
			(chat: ChatDbEntity) => chat.id === chatId,
		);
	}

	async getChatUsersCount(): Promise<number> {
		return LocalDb.getData(this._chatMembersCountDbFieldPath);
	}

	async updateChatUsersCount(usersCount: number): Promise<void> {
		await LocalDb.push(this._chatMembersCountDbFieldPath, usersCount, true);
	}

	// registered info methods
	async getRegistrations(): Promise<UserFromDb[]> {
		return LocalDb.getData(this._registeredMembersPath);
	}

	async getRegistrationsCount(): Promise<number> {
		return LocalDb.count(this._registeredMembersPath);
	}

	async getUserInfo(userId: number): Promise<UserFromDb | undefined> {
		return LocalDb.find(
			this._registeredMembersPath,
			(user: UserFromDb) => user.id === userId,
		);
	}

	async setUserInfo(userInfo: UserFromDb): Promise<void> {
		await LocalDb.push(this._registeredMembersPushPath, userInfo);
	}

	async removeUserInfo(userId: number) {
		const userIdxInChatDb = await LocalDb.getIndex(this._registeredMembersPath, userId);

		if (userIdxInChatDb !== -1) {
			await LocalDb.delete(`${this._registeredMembersPath}[${userIdxInChatDb}]`);
		}
	}

	// participation methods
	async getParticipations(): Promise<UserParticipation[]> {
		return LocalDb.getData(this._participatedMembersDbFieldPath);
	}

	async getParticipation(userId: number): Promise<UserParticipation | undefined> {
		return await LocalDb.find<UserParticipation>(
			this._participatedMembersDbFieldPath,
			(user: UserParticipation) => user.userId === userId
		);
	}

	async setParticipation(participationData: UserParticipation): Promise<void> {
		await LocalDb.push(this._participatedMembersDbFieldPushPath, participationData, true);
	}
}