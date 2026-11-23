import { findUserById,publicUser } from '../models/User.js';
export async function requireAuth(req,res,next){
  try{const id=req.session?.userId;if(!id)return res.status(401).json({error:'Please sign in to continue.'});const user=await findUserById(id);if(!user){req.session.destroy(()=>{});return res.status(401).json({error:'Your session has expired. Please sign in again.'});}req.user=user;req.publicUser=publicUser(user);next();}
  catch(error){next(error);}
}
