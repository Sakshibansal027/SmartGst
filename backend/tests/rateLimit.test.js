import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { rateLimit } from '../middleware/rateLimit.js';

// Every assertion here drives an injected clock. A sliding window tested by
// actually sleeping would either take a minute per case or verify nothing, and
// the expiry boundary is the whole point of the sliding strategy.
function clock(start=1_700_000_000_000){
  const state={value:start};
  const now=()=>state.value;
  now.advance=ms=>{state.value+=ms;};
  return now;
}

async function withServer(t,middleware,handler=()=>{ }){
  const app=express();
  app.use(express.json());
  app.post('/probe',middleware,(req,res)=>{handler(req);res.json({ok:true});});
  // Mirrors the real error middleware closely enough that a thrown status
  // becomes that status, so a 401 failure is observed as a 401 rather than as
  // Express's default 500.
  app.use((error,req,res,next)=>res.status(error.status||500).json({error:error.message}));
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>{server.closeAllConnections?.();server.close();});
  const url=`http://127.0.0.1:${server.address().port}/probe`;
  return async body=>{
    const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body??{})});
    const text=await response.text();
    let json={};
    try{json=JSON.parse(text);}catch{json={raw:text};}
    return{status:response.status,retryAfter:response.headers.get('retry-after'),json};
  };
}

test('the OCR sliding window allows five requests in any rolling minute, then blocks', async t=>{
  const now=clock();
  const limiter=rateLimit({windowMs:60_000,max:5,strategy:'sliding',key:()=>'user-1',now});
  const probe=await withServer(t,limiter);

  for(let attempt=1;attempt<=5;attempt++){
    const {status}=await probe();
    assert.equal(status,200,`request ${attempt} should be allowed`);
  }

  const blocked=await probe();
  assert.equal(blocked.status,429,'the sixth request inside the window must be rejected');
  assert.ok(blocked.json.error,'the rejection should carry a message');
  assert.equal(blocked.retryAfter,'60','Retry-After should point at when the oldest request expires');
});

test('a blocked sliding window frees up only once the oldest request ages out', async t=>{
  const now=clock();
  const limiter=rateLimit({windowMs:60_000,max:5,strategy:'sliding',key:()=>'user-1',now});
  const probe=await withServer(t,limiter);

  for(let attempt=1;attempt<=5;attempt++)await probe();
  assert.equal((await probe()).status,429);

  now.advance(59_000);
  assert.equal((await probe()).status,429,'five requests are still inside the rolling minute');

  now.advance(2_000);
  assert.equal((await probe()).status,200,'the oldest request has now fallen outside the window');
});

test('one user hitting the limit does not block another', async t=>{
  const now=clock();
  const limiter=rateLimit({windowMs:60_000,max:2,strategy:'sliding',key:req=>req.body.user,now});
  const probe=await withServer(t,limiter);

  await probe({user:'a'});
  await probe({user:'a'});
  assert.equal((await probe({user:'a'})).status,429);
  assert.equal((await probe({user:'b'})).status,200,'a separate key keeps its own allowance');
});

test('the login bucket cannot be bypassed by changing the casing or spacing of an email', async t=>{
  const now=clock();
  // The same normalization authController applies before looking the user up,
  // so alternative spellings of one address cannot mint a fresh allowance.
  const limiter=rateLimit({
    windowMs:15*60_000,max:3,now,
    key:req=>String(req.body?.email||'').trim().toLowerCase()
  });
  const probe=await withServer(t,limiter);

  assert.equal((await probe({email:'aarav@example.com'})).status,200);
  assert.equal((await probe({email:'AARAV@example.com'})).status,200);
  assert.equal((await probe({email:'  Aarav@Example.Com  '})).status,200);
  assert.equal((await probe({email:'aarav@example.com'})).status,429,'the fourth attempt must share the same counter');
  assert.equal((await probe({email:'someone.else@example.com'})).status,200,'a different account is unaffected');
});

test('a fixed window allows the configured number and reports the reset time', async t=>{
  const now=clock();
  const limiter=rateLimit({windowMs:1000,max:2,key:()=>'k',now});
  const probe=await withServer(t,limiter);

  assert.equal((await probe()).status,200);
  assert.equal((await probe()).status,200);
  const blocked=await probe();
  assert.equal(blocked.status,429);
  assert.equal(blocked.retryAfter,'1');

  now.advance(1001);
  assert.equal((await probe()).status,200,'the next window starts fresh');
});

test('skipSuccess refunds a successful attempt so normal use is never throttled', async t=>{
  const now=clock();
  const limiter=rateLimit({windowMs:60_000,max:2,skipSuccess:true,key:()=>'k',now});
  // 200 by default, so every request here is a success and must be refunded.
  const probe=await withServer(t,limiter,()=>{ });

  for(let attempt=1;attempt<=10;attempt++){
    assert.equal((await probe()).status,200,`successful attempt ${attempt} should not accumulate`);
  }
});

test('a 401 failure is not refunded and eventually locks the key out', async t=>{
  const now=clock();
  const limiter=rateLimit({windowMs:60_000,max:2,skipSuccess:true,key:()=>'k',now});
  const probe=await withServer(t,limiter,()=>{throw Object.assign(new Error('Invalid credentials'),{status:401});});
  // The error middleware turns the thrown status into a real 401, so this
  // asserts the failure status the rate limiter actually sees at runtime.
  assert.equal((await probe()).status,401);
  assert.equal((await probe()).status,401);
  assert.equal((await probe()).status,429,'three failures against an allowance of two must be blocked');
});

test('sliding with skipSuccess refunds a success and does not refund a failure', async t=>{
  // This combination had no coverage at all: only the fixed strategy was
  // exercised with skipSuccess, so the splice-in-the-hits-array path was never
  // run. It is the configuration the OCR limiter would use if refunds were
  // ever wanted there.
  const now=clock();
  const limiter=rateLimit({windowMs:60_000,max:2,strategy:'sliding',skipSuccess:true,key:()=>'k',now});
  const probe=await withServer(t,limiter,req=>{
    if(req.body?.fail)throw Object.assign(new Error('nope'),{status:401});
  });

  // Successful requests must not accumulate, however many are made.
  for(let attempt=1;attempt<=6;attempt++)assert.equal((await probe({})).status,200);
  // Failures do accumulate, so the third one exceeds an allowance of two.
  assert.equal((await probe({fail:true})).status,401);
  assert.equal((await probe({fail:true})).status,401);
  assert.equal((await probe({fail:true})).status,429);

  // The refunds left the array short, so a success is still possible once the
  // failed timestamps age out.
  now.advance(61_000);
  assert.equal((await probe({})).status,200,'the window should be clear again');
});

test('rateLimit refuses to be constructed with an unusable window or limit', () => {
  assert.throws(()=>rateLimit({windowMs:0,max:1}),/positive windowMs/);
  assert.throws(()=>rateLimit({windowMs:1000,max:0}),/positive max/);
});
