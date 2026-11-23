import { getDatabase } from '../config/db.js';
import { fiscalYearRange } from '../utils/fy.js';
import { fail,ok } from '../utils/responseHandler.js';
const sum=(rows,key)=>Math.round(rows.reduce((v,x)=>v+Number(x[key]||0),0)*100)/100;
export async function getDashboard(req,res,next){try{
  const fy=String(req.query.fy||'2026-27'),range=fiscalYearRange(fy);if(!range)return fail(res,400,'Financial year must use YYYY-YY format.');
  const userId=String(req.user._id),[records,tasks]=await Promise.all([getDatabase().collection('invoices').find({userId,date:{$gte:range.from,$lte:range.to}}).sort({id:1}).toArray(),getDatabase().collection('tasks').find({userId}).sort({due:1,id:1}).toArray()]);
  const sales=records.filter(x=>x.kind==='sale'),purchases=records.filter(x=>x.kind==='purchase');
  const output=sum(sales,'cgst')+sum(sales,'sgst')+sum(sales,'igst'),itc=sum(purchases,'cgst')+sum(purchases,'sgst')+sum(purchases,'igst'),months=new Map();
  for(const row of records){const month=row.date.slice(0,7),v=months.get(month)||{month,sales:0,purchases:0,output:0,itc:0},key=row.kind==='sale'?'sales':'purchases';v[key]+=row.amount;v[row.kind==='sale'?'output':'itc']+=row.cgst+row.sgst+row.igst;months.set(month,v);}
  return ok(res,{fy,sales:sum(sales,'amount'),purchases:sum(purchases,'amount'),output:Math.round(output*100)/100,itc:Math.round(itc*100)/100,liability:Math.round((output-itc)*100)/100,count:records.length,pending:tasks.filter(x=>!x.done).length,chart:[...months.values()].sort((a,b)=>a.month.localeCompare(b.month)).slice(-12),recent:records.slice(-5).reverse(),tasks});
}catch(e){next(e);}}
