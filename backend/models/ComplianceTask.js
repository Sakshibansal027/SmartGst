import { getDatabase } from '../config/db.js';
const tasks=()=>getDatabase().collection('tasks');
export const listTasks=(filter={})=>tasks().find(filter).sort({due:1,id:1}).toArray();
export const insertTask=doc=>tasks().insertOne(doc);
export const findTask=(id,userId)=>tasks().findOne({id:Number(id),userId});
export const nextTaskId=async()=>{const c=getDatabase().collection('counters');const result=await c.findOneAndUpdate({_id:'task'},{$inc:{seq:1}},{upsert:true,returnDocument:'after',includeResultMetadata:false});return result.seq;};
