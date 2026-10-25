import {createServer} from 'node:http';
import {createHmac,randomUUID} from 'node:crypto';

// Synthetic provider used ONLY on loopback by isolated integration tests.
export function localAuthFixture(users,password,onSignup=()=>{}) {
 const valid=new Map(),factors=new Map(users.map(u=>[u.id,{id:randomUUID(),status:'verified',factor_type:'totp',friendly_name:'LOCAL TEST AUTHENTICATOR'}]));
 const record=u=>({...u,aud:'authenticated',role:'authenticated',is_anonymous:false,email_confirmed_at:'2026-01-01T00:00:00Z',user_metadata:{full_name:'LOCAL FICTIONAL ACCOUNT',role:'owner',...(u.email.startsWith('recipient@')?{first_name:'LOCAL',last_name:'NEW PERSON'}:{})},app_metadata:{provider:'email'},factors:[factors.get(u.id)]});
 function session(u,aal=u.aal||'aal2') {
  const now=Math.floor(Date.now()/1000),head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify({iss:'http://127.0.0.1:5888/auth/v1',sub:u.id,exp:now+3600,iat:now,aud:'authenticated',role:'authenticated',aal,session_id:randomUUID(),amr:[{method:'password',timestamp:now},...(aal==='aal2'?[{method:'totp',timestamp:u.mfaTime||now}]:[])]})).toString('base64url');
  const token=head+'.'+payload+'.'+createHmac('sha256','local-fixture-never-production').update(head+'.'+payload).digest('base64url');valid.set(token,u);
  return {access_token:token,refresh_token:'local-refresh-'+u.id,expires_in:3600,token_type:'bearer',user:record(u)};
 }
 const server=createServer(async(req,res)=>{
  res.setHeader('content-type','application/json');
  const token=(req.headers.authorization||'').replace(/^Bearer /,''),u=valid.get(token);
  if(req.url.startsWith('/auth/v1/settings'))return res.end(JSON.stringify({external:{google:false,apple:false}}));
  if(req.url.startsWith('/auth/v1/logout')){valid.delete(token);return res.end('{}');}
  let input={};if(req.method==='POST'||req.method==='PUT'){let body='';for await(const part of req)body+=part;try{input=JSON.parse(body||'{}');}catch{res.statusCode=400;return res.end('{}');}}
  if(req.url.startsWith('/auth/v1/signup')){onSignup(input);return res.end(JSON.stringify({user:record(users[2]||users[0]),session:null}));}
  if(req.url.startsWith('/auth/v1/token')){const user=users.find(x=>x.email===input.email);if(user&&input.password===password)return res.end(JSON.stringify(session(user)));res.statusCode=400;return res.end(JSON.stringify({code:'invalid_credentials',msg:'Local fixture rejected'}));}
  if(req.url.startsWith('/auth/v1/user')&&u)return res.end(JSON.stringify(record(u)));
  if(req.url==='/auth/v1/factors'&&req.method==='POST'&&u){const f={id:randomUUID(),status:'unverified',factor_type:'totp',friendly_name:'LOCAL NEW FACTOR'};factors.set(u.id,f);return res.end(JSON.stringify({...f,type:'totp',totp:{qr_code:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>',secret:'LOCAL-ONLY-SECRET',uri:'otpauth://totp/LOCAL'}}));}
  if(req.url.includes('/challenge')&&u&&req.url.includes(factors.get(u.id).id))return res.end(JSON.stringify({id:'local-challenge',expires_at:Math.floor(Date.now()/1000)+60}));
  if(req.url.includes('/verify')&&u&&req.url.includes(factors.get(u.id).id)&&input.code==='123456'){factors.get(u.id).status='verified';return res.end(JSON.stringify(session(u,'aal2')));}
  res.statusCode=401;res.end(JSON.stringify({msg:'Local fixture unauthenticated'}));
 });
 return {server,session,factors,revoke:token=>valid.delete(token)};
}
