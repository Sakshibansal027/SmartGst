import express from 'express';
import session from 'express-session';
import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { connectDatabase,closeDatabase } from './config/db.js';
import { backendDir,config } from './config/env.js';
import { MongoSessionStore } from './config/mongoSessionStore.js';
import authRoutes from './routes/authRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import gstRoutes from './routes/gstRoutes.js';
import { requireAuth } from './middleware/authMiddleware.js';
import { errorHandler,notFound } from './middleware/errorMiddleware.js';
import { rateLimit } from './middleware/rateLimit.js';

await fs.mkdir(config.uploadDir,{recursive:true});
await connectDatabase();
const databaseSessionSecret=await (await import('./config/db.js')).getDatabase().collection('app_config').findOneAndUpdate(
  {_id:'session-secret'},{$setOnInsert:{value:randomBytes(48).toString('base64url')}},{upsert:true,returnDocument:'after'}
);
const app=express();
app.disable('x-powered-by');
app.set('trust proxy',1);
app.use(express.json({limit:'1mb'}));
app.use(session({
  name:config.sessionCookieName,
  secret:config.sessionSecret||databaseSessionSecret.value,
  resave:false,
  saveUninitialized:false,
  store:new MongoSessionStore({maxAge:config.sessionMaxAgeMs}),
  cookie:{httpOnly:true,sameSite:'lax',secure:config.isProduction,maxAge:config.sessionMaxAgeMs,path:'/'}
}));
// Note: `trust proxy` is 1, so without a proxy in front req.ip comes from a
// client-supplied X-Forwarded-For and the IP buckets can be sidestepped. The
// email bucket needs no such trust and carries the real protection.
const authEmailLimiter=rateLimit({windowMs:15*60*1000,max:10,skipSuccess:true,key:req=>String(req.body?.email||'').trim().toLowerCase(),message:'Too many sign-in attempts for this email. Wait a few minutes and try again.'});
const authIpLimiter=rateLimit({windowMs:15*60*1000,max:50,skipSuccess:true,key:req=>req.ip,message:'Too many sign-in attempts from this network. Wait a few minutes and try again.'});
const apiLimiter=rateLimit({windowMs:60*1000,max:300,key:req=>String(req.user?._id||req.ip)});
app.get('/api/health',(req,res)=>res.json({ok:true,database:config.mongoDatabase,ocrConfigured:Boolean(config.geminiApiKey)}));
app.use('/api/auth/login',authIpLimiter,authEmailLimiter);
app.use('/api/auth/register',authIpLimiter,authEmailLimiter);
app.use('/api/auth',authRoutes);
app.use('/api',requireAuth);
app.use('/api',apiLimiter);
app.use('/api/invoices',invoiceRoutes);
app.use('/api/dashboard',dashboardRoutes);
app.use('/api/profile',profileRoutes);
app.use('/api/tasks',taskRoutes);
app.use('/api',gstRoutes);
app.use(notFound);
app.use(errorHandler);
const server=app.listen(config.port,'0.0.0.0',()=>console.log(`SmartGST API connected to MongoDB database "${config.mongoDatabase}" on port ${config.port}`));
async function stop(){server.close(async()=>{await closeDatabase();process.exit(0);});setTimeout(()=>process.exit(1),5000).unref();}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
