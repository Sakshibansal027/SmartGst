import { findUserById,publicUser,updateUserProfile } from '../models/User.js';
import { validateProfile } from '../utils/validators.js';
import { fail,ok } from '../utils/responseHandler.js';
const allowed=['business','owner','type','state','gstin','phone'];
export async function getProfile(req,res){return ok(res,publicUser(req.user));}
export async function saveProfile(req,res,next){try{const x=req.body||{},profile=Object.fromEntries(allowed.filter(k=>k in x).map(k=>[k,k==='gstin'?String(x[k]||'').toUpperCase():x[k]])),errors=validateProfile({...req.user,...profile});if(errors.length)return fail(res,400,errors.join(' '));const updated=await updateUserProfile(req.user._id,profile);return ok(res,publicUser(updated));}catch(e){next(e);}}
