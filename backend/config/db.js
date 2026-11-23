import { MongoClient } from 'mongodb';
import { config } from './env.js';
import { migrateLegacySqlite } from './migrateLegacy.js';

let client;
let database;
export async function connectDatabase(uri=config.mongoUri,name=config.mongoDatabase){
  client=new MongoClient(uri,{serverSelectionTimeoutMS:10000});
  await client.connect();
  database=client.db(name);
  await database.collection('sessions').createIndex({expireAt:1},{expireAfterSeconds:0});
  await database.collection('users').createIndex({email:1},{unique:true});
  await database.collection('invoices').createIndex({userId:1,kind:1,number:1},{unique:true,partialFilterExpression:{userId:{$exists:true}}});
  await database.collection('tasks').createIndex({userId:1,due:1});
  await migrateLegacySqlite(database);
  return database;
}
export function getDatabase(){if(!database)throw new Error('MongoDB has not been connected.');return database;}
export function getMongoClient(){if(!client)throw new Error('MongoDB has not been connected.');return client;}
export async function closeDatabase(){if(client)await client.close();client=undefined;database=undefined;}
