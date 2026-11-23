import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/db.js';
const users=()=>getDatabase().collection('users');
export const userId=value=>ObjectId.isValid(value)?new ObjectId(value):null;
export const findUserByEmail=email=>users().findOne({email:String(email||'').trim().toLowerCase()});
export const findUserById=id=>users().findOne({_id:userId(id)});
export const createUser=user=>users().insertOne({...user,email:String(user.email).trim().toLowerCase(),createdAt:new Date()});
export const updateUserProfile=(id,profile)=>users().findOneAndUpdate({_id:userId(id)},{$set:profile},{returnDocument:'after'});
export const publicUser=user=>user?({_id:String(user._id),email:user.email,business:user.business,owner:user.owner,type:user.type,state:user.state,gstin:user.gstin||'',phone:user.phone||''}):null;
