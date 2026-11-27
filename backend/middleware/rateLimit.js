import { fail } from '../utils/responseHandler.js';

// Counters live in this process only. That is enough for a single-instance
// prototype, but a second instance would keep its own counters and allow twice
// the configured rate -- a multi-instance deployment needs shared storage
// instead. `now` is injectable so the windows can be tested without sleeping.
export function rateLimit(options={}){
  const{
    windowMs,
    max,
    key=req=>req.ip||'unknown',
    strategy='fixed',
    skipSuccess=false,
    message='Too many requests. Please wait a moment and try again.',
    now=Date.now
  }=options;
  if(!Number.isFinite(windowMs)||windowMs<=0)throw new Error('rateLimit requires a positive windowMs.');
  if(!Number.isFinite(max)||max<1)throw new Error('rateLimit requires a positive max.');

  const store=new Map();
  // Entries are pruned on every access; this sweep only reclaims the keys that
  // stop being used entirely, so their arrays do not accumulate forever.
  const sweeper=setInterval(()=>{
    const at=now();
    for(const[id,entry]of store){
      const expired=strategy==='sliding'
        ?!entry.hits.length||entry.hits[entry.hits.length-1]+windowMs<=at
        :entry.resetAt<=at;
      if(expired)store.delete(id);
    }
  },Math.max(windowMs,1000));
  sweeper.unref?.();

  function reject(res,retryAfter,msg){
    res.setHeader('Retry-After',String(Math.max(1,Math.ceil(retryAfter/1000))));
    return fail(res,429,msg);
  }

  return function rateLimitMiddleware(req,res,next){
    const at=now(),id=String(key(req)??'unknown');

    if(strategy==='sliding'){
      const entry=store.get(id)||{hits:[]};
      if(!store.has(id))store.set(id,entry);
      entry.hits=entry.hits.filter(hit=>hit+windowMs>at);
      if(entry.hits.length>=max)return reject(res,entry.hits[0]+windowMs-at,message);
      entry.hits.push(at);
      if(skipSuccess)res.once('finish',()=>{
        if(res.statusCode>=400)return;
        const index=entry.hits.indexOf(at);
        if(index!==-1)entry.hits.splice(index,1);
      });
      return next();
    }

    let entry=store.get(id);
    if(!entry||entry.resetAt<=at){
      entry={count:0,resetAt:at+windowMs};
      store.set(id,entry);
    }
    entry.count+=1;
    if(entry.count>max)return reject(res,entry.resetAt-at,message);
    // A successful attempt should not consume the allowance, or a user who
    // signs in normally several times a day would lock themselves out.
    if(skipSuccess)res.once('finish',()=>{
      if(res.statusCode<400)entry.count=Math.max(0,entry.count-1);
    });
    return next();
  };
}
