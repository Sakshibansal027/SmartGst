import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/db.js';
import { config } from '../config/env.js';
import { createUser,findUserByEmail,findUserById,publicUser } from '../models/User.js';
import { fail,ok } from '../utils/responseHandler.js';

function sessionLogin(req,userId){return new Promise((resolve,reject)=>req.session.regenerate(error=>{if(error)return reject(error);req.session.userId=String(userId);req.session.save(error=>error?reject(error):resolve());}));}
export async function seedOrClaimBusinessData(user,{db=getDatabase(),claim=config.claimLegacyData}={}){
  const userId=String(user._id),invoice=db.collection('invoices'),tasks=db.collection('tasks');
  if(!(await invoice.countDocuments({userId}))){
    const legacy=claim?await invoice.find({userId:{$exists:false}}).toArray():[];
    if(legacy.length){await invoice.updateMany({userId:{$exists:false}},{$set:{userId}});await db.collection('counters').updateOne({_id:'invoice'},{$max:{seq:Math.max(...legacy.map(x=>Number(x.id)||0))}},{upsert:true});}
    else {
      const samples=[
        ['sale','SG-2026-001','2026-06-02','Mehta Kirana Stores','27AABCU9603R1ZM','Maharashtra','Packaged groceries','1001',20,450,18],
        ['sale','SG-2026-002','2026-08-08','Green Leaf Cafe','07AABCU9603R1ZM','Delhi','Restaurant supplies','2106',12,850,12],
        ['sale','SG-2026-003','2026-10-15','Rao Home Needs','29AABCU9603R1ZM','Karnataka','Household essentials','3924',8,1250,18],
        ['purchase','PB-2026-014','2026-07-03','Shree Wholesale Mart','27AADFS1245K1ZQ','Maharashtra','General stock replenishment','1001',40,300,5],
        ['purchase','PB-2026-015','2026-09-10','Metro Packaging Co.','07AADFM2280L1ZX','Delhi','Packaging materials','4819',15,600,12],
        ['purchase','PB-2026-016','2026-11-19','Coastal Foods Supply','32AADFC6723P1ZB','Kerala','Speciality food items','2106',10,980,5]
      ];
      const docs=samples.map(([kind,number,date,party,gstin,state,description,hsn,quantity,unit_price,rate],i)=>{const amount=quantity*unit_price,tax=calculateTax(amount,rate,user.state,state);return{id:i+1,userId,kind,number,date,party,gstin,state,description,hsn,quantity,unit_price,amount,rate,cgst:tax.cgst,sgst:tax.sgst,igst:tax.igst,total:tax.total};});
      await invoice.insertMany(docs);await db.collection('counters').updateOne({_id:'invoice'},{$max:{seq:docs.length}},{upsert:true});
    }
  }
  if(!(await tasks.countDocuments({userId}))){
    const legacy=claim?await tasks.find({userId:{$exists:false}}).toArray():[];
    if(legacy.length){await tasks.updateMany({userId:{$exists:false}},{$set:{userId}});await db.collection('counters').updateOne({_id:'task'},{$max:{seq:Math.max(...legacy.map(x=>Number(x.id)||0))}},{upsert:true});}
    else {await tasks.insertMany([{id:1,userId,title:'Prepare GSTR-1 summary',due:'2026-12-11',kind:'GSTR-1',done:0},{id:2,userId,title:'Review GSTR-3B estimate',due:'2026-12-20',kind:'GSTR-3B',done:0},{id:3,userId,title:'Reconcile purchase invoices',due:'2026-11-27',kind:'Reconciliation',done:0}]);await db.collection('counters').updateOne({_id:'task'},{$max:{seq:3}},{upsert:true});}
  }
}
import { calculateTax } from '../utils/tax.js';

export async function register(req,res,next){
  try{
    const x=req.body||{},email=String(x.email||'').trim().toLowerCase(),password=String(x.password||'');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail(res,400,'Enter a valid email address.');
    if(password.length<8)return fail(res,400,'Password must be at least 8 characters.');
    for(const k of ['business','owner','state'])if(!String(x[k]||'').trim())return fail(res,400,`${k} is required.`);
    const exists=await findUserByEmail(email);if(exists)return fail(res,409,'An account with this email already exists. Sign in instead.');
    const passwordHash=await bcrypt.hash(password,12),doc={email,passwordHash,business:String(x.business).trim(),owner:String(x.owner).trim(),type:x.type||'Retail',state:x.state,gstin:String(x.gstin||'').toUpperCase(),phone:x.phone||'',createdAt:new Date()};
    const result=await createUser(doc);doc._id=new ObjectId(result.insertedId);
    await seedOrClaimBusinessData(doc);await sessionLogin(req,doc._id);
    return ok(res,{user:publicUser(doc)},201);
  }catch(error){if(error.code===11000)return fail(res,409,'An account with this email already exists.');next(error);}
}
export async function login(req,res,next){
  try{const email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||'');const user=await findUserByEmail(email);if(!user||!(await bcrypt.compare(password,user.passwordHash)))return fail(res,401,'Email or password is incorrect.');await sessionLogin(req,user._id);return ok(res,{user:publicUser(user)});}catch(error){next(error);}
}
export async function me(req,res){if(!req.session?.userId)return fail(res,401,'Please sign in.');const user=await findUserById(req.session.userId);return user?ok(res,{user:publicUser(user)}):fail(res,401,'Session expired. Please sign in again.');}
export function logout(req,res){if(!req.session)return ok(res,{ok:true});req.session.destroy(error=>{if(error)return res.status(500).json({error:'Could not end the session.'});res.clearCookie('smartgst.sid',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'});return ok(res,{ok:true});});}
