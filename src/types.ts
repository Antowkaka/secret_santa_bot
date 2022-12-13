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