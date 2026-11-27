import { getDatabase } from '../config/db.js';
import { fiscalYearRange } from '../utils/fy.js';
import { fail,ok } from '../utils/responseHandler.js';
const sum=(rows,key)=>Math.round(rows.reduce((v,x)=>v+Number(x[key]||0),0)*100)/100;
const MONTH_KEY=/^\d{4}-\d{2}$/;
// Grouping was previously inline and called row.date.slice(0, 7) on every
// record, so a stored row whose date was unset or not a string threw a
// TypeError. That 500 reached the client as a rejected refresh(), which left
// every panel empty, not just the chart. Records that cannot be bucketed are
// now omitted instead. Numeric fields are coerced because a partially written
// legacy row would otherwise poison its whole month with NaN.
export function monthlyBuckets(rows=[]){
  const months=new Map();
  for(const row of rows){
    const month=String(row?.date??'').slice(0,7);
    if(!MONTH_KEY.test(month))continue;
    const isSale=row.kind==='sale';
    const bucket=months.get(month)||{month,sales:0,purchases:0,output:0,itc:0};
    bucket[isSale?'sales':'purchases']+=Number(row.amount||0);
    bucket[isSale?'output':'itc']+=Number(row.cgst||0)+Number(row.sgst||0)+Number(row.igst||0);
    months.set(month,bucket);
  }
  return [...months.values()].sort((a,b)=>a.month.localeCompare(b.month));
}
export async function getDashboard(req,res,next){try{
  const fy=String(req.query.fy||'2026-27'),range=fiscalYearRange(fy);if(!range)return fail(res,400,'Financial year must use YYYY-YY format.');
  const userId=String(req.user._id),[records,tasks]=await Promise.all([getDatabase().collection('invoices').find({userId,date:{$gte:range.from,$lte:range.to}}).sort({id:1}).toArray(),getDatabase().collection('tasks').find({userId}).sort({due:1,id:1}).toArray()]);
  const sales=records.filter(x=>x.kind==='sale'),purchases=records.filter(x=>x.kind==='purchase');
  const output=sum(sales,'cgst')+sum(sales,'sgst')+sum(sales,'igst'),itc=sum(purchases,'cgst')+sum(purchases,'sgst')+sum(purchases,'igst');
  return ok(res,{fy,sales:sum(sales,'amount'),purchases:sum(purchases,'amount'),output:Math.round(output*100)/100,itc:Math.round(itc*100)/100,liability:Math.round((output-itc)*100)/100,count:records.length,pending:tasks.filter(x=>!x.done).length,chart:monthlyBuckets(records).slice(-12),recent:records.slice(-5).reverse(),tasks});
}catch(e){next(e);}}
