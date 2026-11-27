import { getDatabase } from '../config/db.js';
import { calculateTax } from '../utils/tax.js';
import { validateInvoice } from '../utils/validators.js';
import { toDateOnly } from '../utils/validators.js';
import { fail,ok } from '../utils/responseHandler.js';
import { nextInvoiceId } from '../models/Invoice.js';
import { fiscalYearRange } from '../utils/fy.js';

function filters(req){const f={userId:String(req.user._id)};if(req.query.fy){const range=fiscalYearRange(req.query.fy);if(!range)return null;f.date={$gte:range.from,$lte:range.to};}if(['sale','purchase'].includes(req.query.kind))f.kind=req.query.kind;const q=String(req.query.q||'').trim();if(q)f.$or=['number','party','gstin','description'].map(k=>({[k]:{$regex:q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'}}));return f;}
// The single definition of what a client may write to an invoice, shared by
// create and update so the two cannot drift apart. Ownership (id, userId) and
// creation time are deliberately absent: updateInvoice writes this with $set,
// and a $set can only touch the fields it names, so leaving them out is what
// keeps an edit from rewriting them.
export function invoiceFields(x,tax){
  return{kind:x.kind,number:String(x.number).trim(),date:toDateOnly(x.date),party:String(x.party).trim(),gstin:String(x.gstin||'').toUpperCase(),state:x.state,description:String(x.description).trim(),hsn:String(x.hsn).trim(),quantity:Number(x.quantity||1),unit_price:Number(x.unit_price??x.amount),amount:tax.taxable,rate:tax.rate,cgst:tax.cgst,sgst:tax.sgst,igst:tax.igst,total:tax.total,updatedAt:new Date()};
}
export async function listInvoices(req,res,next){try{const filter=filters(req);if(!filter)return fail(res,400,'Financial year must use YYYY-YY format.');const docs=await getDatabase().collection('invoices').find(filter).sort({date:-1,id:-1}).toArray();return ok(res,docs);}catch(e){next(e);}}
export async function createInvoice(req,res,next){try{
  const x=req.body||{},collection=getDatabase().collection('invoices'),existing=await collection.find({userId:String(req.user._id)},{projection:{id:1,kind:1,number:1}}).toArray(),check=validateInvoice(x,existing);
  if(!check.valid)return fail(res,400,check.errors.join(' '),{validation:check});
  const tax=calculateTax(x.amount,x.rate,req.user.state,x.state),invoice={id:await nextInvoiceId(),userId:String(req.user._id),...invoiceFields(x,tax),createdAt:new Date()};
  await collection.insertOne(invoice);return ok(res,{invoice,validation:check},201);
}catch(e){next(e);}}
export async function updateInvoice(req,res,next){try{
  const id=Number(req.params.id),collection=getDatabase().collection('invoices'),existing=await collection.find({userId:String(req.user._id)},{projection:{id:1,kind:1,number:1}}).toArray(),check=validateInvoice(req.body||{},existing,id);
  if(!check.valid)return fail(res,400,check.errors.join(' '),{validation:check});
  const x=req.body,tax=calculateTax(x.amount,x.rate,req.user.state,x.state),fields=invoiceFields(x,tax);
  const result=await collection.updateOne({id,userId:String(req.user._id)},{$set:fields});if(!result.matchedCount)return fail(res,404,'Invoice not found.');
  return ok(res,{invoice:{id,userId:String(req.user._id),...fields},validation:check});
}catch(e){next(e);}}
export async function deleteInvoice(req,res,next){try{const result=await getDatabase().collection('invoices').deleteOne({id:Number(req.params.id),userId:String(req.user._id)});return result.deletedCount?ok(res,{ok:true}):fail(res,404,'Invoice not found.');}catch(e){next(e);}}
export async function validateInvoiceBody(req,res,next){try{const existing=await getDatabase().collection('invoices').find({userId:String(req.user._id)},{projection:{id:1,kind:1,number:1}}).toArray();return ok(res,validateInvoice(req.body||{},existing,req.body?.id));}catch(e){next(e);}}
