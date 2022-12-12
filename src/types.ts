type User = {
	id: string;
	firstName: string;
	lastName: string;
	info?: string;
}

export type DbData = {
	[key: string]: User[];
}