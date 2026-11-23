import { getDatabase } from '../config/db.js';
const invoices=()=>getDatabase().collection('invoices');
export const listInvoices=(filter={},sort={date:-1,id:-1})=>invoices().find(filter).sort(sort).toArray();
export const findInvoice=(id,userId)=>invoices().findOne({id:Number(id),userId});
export const insertInvoice=doc=>invoices().insertOne(doc);
export const replaceInvoice=(id,userId,doc)=>invoices().replaceOne({id:Number(id),userId},doc);
export const removeInvoice=(id,userId)=>invoices().deleteOne({id:Number(id),userId});
export const nextInvoiceId=async()=>{const c=getDatabase().collection('counters');const result=await c.findOneAndUpdate({_id:'invoice'},{$inc:{seq:1}},{upsert:true,returnDocument:'after',includeResultMetadata:false});return result.seq;};
