import fs from 'node:fs';
import path from 'node:path';
import { projectRoot } from './env.js';

export async function migrateLegacySqlite(db){
  const file=path.join(projectRoot,'backend','smartgst.db'),markers=db.collection('migration_metadata');
  if(await markers.findOne({_id:'sqlite-to-mongo-v1'})||!fs.existsSync(file))return;
  let legacy,migrated=true;
  try{
    const{DatabaseSync}=await import('node:sqlite');
    legacy=new DatabaseSync(file,{readOnly:true});
    const invoices=legacy.prepare('SELECT * FROM invoices').all().map(row=>({...row}));
    const tasks=legacy.prepare('SELECT * FROM tasks').all().map(row=>({...row}));
    const invoiceCollection=db.collection('invoices'),taskCollection=db.collection('tasks');
    if(invoices.length&&!(await invoiceCollection.countDocuments())){await invoiceCollection.insertMany(invoices);await db.collection('counters').updateOne({_id:'invoice'},{$max:{seq:Math.max(...invoices.map(x=>Number(x.id)||0))}},{upsert:true});}
    if(tasks.length&&!(await taskCollection.countDocuments())){await taskCollection.insertMany(tasks.map(x=>({...x,done:Number(x.done)||0})));await db.collection('counters').updateOne({_id:'task'},{$max:{seq:Math.max(...tasks.map(x=>Number(x.id)||0))}},{upsert:true});}
  }catch(error){migrated=false;console.warn('Legacy SQLite migration skipped; the original database file was left untouched.');}
  finally{legacy?.close();}
  if(migrated)await markers.insertOne({_id:'sqlite-to-mongo-v1',completedAt:new Date()});
}
