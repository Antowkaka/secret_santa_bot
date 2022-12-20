import { JsonDB, Config } from 'node-json-db';
import { env } from '../config/variables';

// The first argument is the database filename. If no extension, '.json' is assumed and automatically added.
// The second argument is used to tell the DB to save after each push
// If you put false, you'll have to call the save() method.
// The third argument is to ask JsonDB to save the database in an human readable format. (default false)
// The last argument is the separator. By default it's slash (/)
const db = new JsonDB(new Config(`${env.DB_PATH}/db.json`, true, true, '/'));

db.exists(env.DB_FIELD_REGISTERED_CHATS).then(isExists => {
	!isExists && db.push(env.DB_FIELD_REGISTERED_CHATS, []);
}).catch(dbInitErr => {
	console.log('Something went wrong with pushing chats field: ', dbInitErr);
});

export default db;
