import LocalDb from './localDb';
import {
	createRegisteredUsersInfoPath,
	createAllMembersCountDbFieldPath,
	createRegisteredMembersDbFieldPath,
}  from '../utils';
import { env } from '../config/variables';
import type { UserParticipation } from '../types';

export default class LocalDbService {
	private readonly _chatId: number;
	private readonly _registeredUsersInfoPath: string;
	private readonly _chatAllMembersCountDbFieldPath: string;
	private readonly _chatParticipatedMembersDbFieldPath: string;
	private readonly _chatParticipatedMembersDbFieldPushPath: string;

	constructor(chatId: number) {
		this._chatId = chatId;

		this._registeredUsersInfoPath = createRegisteredUsersInfoPath(chatId);
		this._chatAllMembersCountDbFieldPath = createAllMembersCountDbFieldPath(chatId);
		this._chatParticipatedMembersDbFieldPath = createRegisteredMembersDbFieldPath(chatId);
		this._chatParticipatedMembersDbFieldPushPath = createRegisteredMembersDbFieldPath(chatId, true);
	}

	async setChatToDb(title: string, usersCount: number): Promise<void> {
		await LocalDb.push(`${env.DB_FIELD_REGISTERED_CHATS}[]`, { id: this._chatId, title });
		await LocalDb.push(this._registeredUsersInfoPath, []);
		await LocalDb.push(this._chatAllMembersCountDbFieldPath, usersCount);
		await LocalDb.push(this._chatParticipatedMembersDbFieldPath, []);
	}

	async deleteChatFromDb(): Promise<void> {
		const chatInxInDb = await LocalDb.getIndex(env.DB_FIELD_REGISTERED_CHATS, this._chatId);
		await LocalDb.delete(`${env.DB_FIELD_REGISTERED_CHATS}[${chatInxInDb}]`);
		await LocalDb.delete(this._registeredUsersInfoPath);
		await LocalDb.delete(this._chatAllMembersCountDbFieldPath);
		await LocalDb.delete(this._chatParticipatedMembersDbFieldPath);
	}

	async removeUserFromDb(userId: number) {
		const userIdxInChatDb = await LocalDb.getIndex(this._registeredUsersInfoPath, userId);

		if (userIdxInChatDb !== -1) {
			await LocalDb.delete(`${this._registeredUsersInfoPath}[${userIdxInChatDb}]`);
		}
	}

	async getChatUsersCount(): Promise<number> {
		return LocalDb.getData(this._chatAllMembersCountDbFieldPath);
	}

	async getUsersParticipations(): Promise<UserParticipation[]> {
		return LocalDb.getData(this._chatParticipatedMembersDbFieldPath);
	}

	async setNewParticipation(participationData: UserParticipation): Promise<void> {
		await LocalDb.push(this._chatParticipatedMembersDbFieldPushPath, participationData, true);
	}
}