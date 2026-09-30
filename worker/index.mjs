import catalog from '../site/commerce/catalog.json' with {type:'json'};
import {schema} from './schema.mjs';
import {adminPage} from './ui.mjs';
const ready=new WeakMap();
async function init(db){if(!ready.has(db)){const p=db.batch(schema.map(sql=>db.prepare(sql))).catch(e=>{ready.delete(db);throw e});ready.set(db,p)}await ready.get(db)}
const enc=new TextEncoder();
async function mac(secret,text){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
function equal(a,b){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0}
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json',...extra}})}
export function setupProblems(env){const problems=[];if(!env.DB)problems.push('DB database binding is missing');if(typeof env.ADMIN_PIN!=='string'||!env.ADMIN_PIN.length)problems.push('ADMIN_PIN runtime secret is missing');if(typeof env.SESSION_SECRET!=='string'||!env.SESSION_SECRET.length)problems.push('SESSION_SECRET runtime secret is missing');else if(env.SESSION_SECRET.length<32)problems.push('SESSION_SECRET must contain at least 32 characters');return problems}
function configured(env){return setupProblems(env).length===0}
async function authorized(request,env){if(!configured(env))return false;const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)fb_admin=([^;]+)/)?.[1]||'';const [expiry,nonce,signature]=token.split('.');if(!/^\d+$/.test(expiry)||!nonce||!signature||Number(expiry)<Date.now()||Number(expiry)>Date.now()+9*3600000)return false;return equal(signature,await mac(env.SESSION_SECRET,expiry+'.'+nonce));}
async function limit(db,key,max,window){const bucket=Math.floor(Date.now()/window);const result=await db.prepare('INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key+':'+bucket,(bucket+1)*window).first();return result.count<=max}
async function readBody(request,max=60000){const reader=request.body?.getReader();if(!reader)throw Error('body');let size=0,chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('size')}chunks.push(value)}let data=new Uint8Array(size),offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length}return JSON.parse(new TextDecoder().decode(data))}
const paths=new Set(['/','/light/en/','/psyllium/en/','/boom/en/','/privacy/en/','/terms/en/','/checkout/en/','/404.html']);
for(const v of ['light','psyllium','boom'])for(const page of ['product','checkout'])paths.add(`/${v}/en/${page}/`);
const names=new Set(['product_view','checkout_view','checkout_started','payment_attempt','delivery_selected','market_selected','page_view','scroll_depth','active_time','page_hidden','page_visible','page_exit','cta_click','flavour_selected','pack_selected','checkout_intent','routine_step']);
const idOk=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/.test(v);
export function validate(e,now){if(!e||![e.id,e.visitor,e.session,e.page].every(idOk)||!names.has(e.name)||!paths.has(e.path)||!Number.isInteger(e.seq)||e.seq<1||e.seq>100000)return null;const details={};for(const key of ['referrer','utm_source','utm_medium','utm_campaign','utm_content','utm_term','label','destination','flavour','selection','step'])if(typeof e.details?.[key]==='string')details[key]=e.details[key].slice(0,120);for(const key of ['seconds','percent','count'])if(Number.isFinite(e.details?.[key]))details[key]=e.details[key];details.persistent=e.details?.persistent===true;
 const variant=e.path==='/'?'light':(['light','psyllium','boom'].includes(e.path.split('/')[1])?e.path.split('/')[1]:'shared');
 return [e.id,now,Math.max(now-86400000,Math.min(now,Number(e.time)||now)),e.visitor,e.session,e.page,e.seq,e.name,e.path,variant,'en',Math.max(0,Math.min(600,Math.round(Number(e.active)||0))),Math.max(0,Math.min(100,Math.round(Number(e.scroll)||0))),JSON.stringify(details)];}
const utmKeys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
async function report(db,url){const days=Math.min(90,Math.max(1,Number(url.searchParams.get('days'))||7));const since=Date.now()-days*86400000;const variant=url.searchParams.get('variant')||'all';let where='time>=?'+(['light','psyllium','boom','shared'].includes(variant)?' AND variant=?':'');const args=[since];if(where.includes('variant=?'))args.push(variant);
 const baseWhere=where,baseArgs=[...args],utmFilters={},conditions=[];
 for(const key of utmKeys){
  if(url.searchParams.get(key+'_missing')==='1'){conditions.push(`COALESCE(json_extract(details,'$.${key}'),'')=''`);utmFilters[key]={missing:true};}
  else if(url.searchParams.has(key)&&url.searchParams.get(key)!==''){const value=url.searchParams.get(key).slice(0,120);conditions.push(`json_extract(details,'$.${key}')=?`);args.push(value);utmFilters[key]={value};}
 }
 // Filter whole page views, including engagement/clicks from older collectors where only page_view carried UTMs.
 if(conditions.length)where+=' AND page IN (SELECT page FROM events WHERE name=\'page_view\' AND '+conditions.join(' AND ')+')';
 const options=await Promise.all(utmKeys.map(async key=>{const r=await db.prepare(`SELECT DISTINCT json_extract(details,'$.${key}') value FROM events WHERE ${baseWhere} AND name='page_view' AND COALESCE(json_extract(details,'$.${key}'),'')<>'' ORDER BY value LIMIT 200`).bind(...baseArgs).all();return [key,r.results.map(x=>x.value)]}));
 const query=(s)=>db.prepare(s).bind(...args).all();
 const [pages,totals,events,sources,visitors,scroll,timeline,campaigns]=await Promise.all([
 query(`SELECT path,variant,COUNT(*) views,ROUND(AVG(active),1) active,ROUND(AVG(scroll),1) scroll FROM (SELECT page,path,variant,MAX(active) active,MAX(scroll) scroll FROM events WHERE ${where} GROUP BY page) GROUP BY path,variant ORDER BY views DESC`),
 query(`SELECT COUNT(DISTINCT page) views,COUNT(DISTINCT visitor) visitors,COUNT(DISTINCT session) sessions,COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM events h WHERE h.visitor=events.visitor AND h.session<>events.session) THEN visitor END) returning_browsers,COUNT(*) events FROM events WHERE ${where}`),
 query(`SELECT name,COUNT(*) count FROM events WHERE ${where} GROUP BY name ORDER BY count DESC`),
 query(`SELECT COALESCE(NULLIF(json_extract(details,'$.utm_source'),''),NULLIF(json_extract(details,'$.referrer'),''),'Direct / unknown') source,COUNT(*) views FROM events WHERE ${where} AND name='page_view' GROUP BY source ORDER BY views DESC LIMIT 30`),
 query(`SELECT e.visitor,MAX(e.time) last,COUNT(DISTINCT e.session) sessions,COUNT(DISTINCT e.page) pages,(SELECT COUNT(DISTINCT h.session) FROM events h WHERE h.visitor=e.visitor) lifetime_sessions FROM events e WHERE ${where} GROUP BY e.visitor ORDER BY last DESC LIMIT 100`),
 query(`SELECT json_extract(details,'$.percent') percent,COUNT(DISTINCT page) pages FROM events WHERE ${where} AND name='scroll_depth' GROUP BY percent ORDER BY percent`),
 query(`SELECT date(time/1000,'unixepoch') day,COUNT(DISTINCT page) views,COUNT(DISTINCT visitor) visitors FROM events WHERE ${where} GROUP BY day ORDER BY day`),
 query(`SELECT ${utmKeys.map(k=>"COALESCE(json_extract(details,'$."+k+"'),'') AS "+k).join(',')}, COUNT(*) views,COUNT(DISTINCT visitor) visitors FROM events WHERE ${where} AND name='page_view' GROUP BY ${utmKeys.join(',')} ORDER BY views DESC LIMIT 50`)
 ]);
 let iw='time>=?',ia=[since];if(['light','psyllium','boom','shared'].includes(variant)){iw+=' AND version=?';ia.push(variant)}for(const k of utmKeys){if(utmFilters[k]?.missing)iw+=` AND COALESCE(json_extract(campaign,'$.${k}'),'')=''`;else if(utmFilters[k]?.value){iw+=` AND json_extract(campaign,'$.${k}')=?`;ia.push(utmFilters[k].value)}}
 const intents=await db.prepare('SELECT id,time,version,language,flavor,bars,price,currency,market,revision,email,consent_time,visitor,campaign FROM checkout_intents WHERE '+iw+' ORDER BY time DESC LIMIT 1001').bind(...ia).all();
 return {checkout_intents:intents.results.slice(0,1000),checkout_intents_truncated:intents.results.length>1000,days,variant,utm_filters:utmFilters,utm_options:Object.fromEntries(options),campaigns:campaigns.results,totals:totals.results[0],pages:pages.results,events:events.results,sources:sources.results,visitors:visitors.results,scroll:scroll.results,timeline:timeline.results};}
async function handle(request,env){const url=new URL(request.url),path=url.pathname;const admin=path==='/admin'||path==='/admin/';const oldCheckout=path.match(/^\/(light|psyllium|boom)\/en\/checkout\/?$/);if(oldCheckout||path==='/checkout/en/'||path==='/checkout/en'||path==='/checkout')return Response.redirect(url.origin+'/'+(oldCheckout?.[1]||'light')+'/en/product/'+url.search,302);
 if(!admin&&!path.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(admin){const nonce=crypto.randomUUID();return new Response(adminPage(await authorized(request,env),configured(env),nonce).replace('Setup required: bind the D1 database and add ADMIN_PIN and SESSION_SECRET.', 'Setup required: '+setupProblems(env).join('; ')+'.'),{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`}})}
 if(!env.DB)return json({error:'Analytics database not configured'},503);
 await init(env.DB);
 if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
 if(path==='/api/checkout-intent'&&request.method==='POST'){
 if(!configured(env))return json({error:'Restock signup is temporarily unavailable. Please try again later.'},503);
 const ip=await mac(env.SESSION_SECRET,request.headers.get('CF-Connecting-IP')||'unknown');if(!await limit(env.DB,'restock:'+ip,40,60000))return json({error:'Please wait a minute and try again.'},429);
 let b;try{b=await readBody(request,6000)}catch{return json({error:'Invalid request'},400)}
 if(!idOk(b.id)||!idOk(b.token)||!Object.hasOwn(catalog.versions,b.version)||!Object.hasOwn(catalog.flavors,b.flavor)||!catalog.packs.includes(b.bars)||!Object.hasOwn(catalog.markets,b.market)||b.language!=='en')return json({error:'Invalid product selection'},400);
 const m=catalog.markets[b.market],price=m.prices[b.bars];if(b.price!==price||b.currency!==m.currency||b.revision!==catalog.revision)return json({error:'This offer has changed. Please reload the page to see current prices.'},409);
 const email=b.email===undefined?null:typeof b.email==='string'?b.email.trim():'';if(email!==null&&(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||b.consent!==true))return json({error:'Please enter a valid email address and agree to the restock email.'},400);
 const hash=await mac(env.SESSION_SECRET,b.token),existing=await env.DB.prepare('SELECT token_hash,version,flavor,bars,market,revision,time FROM checkout_intents WHERE id=?').bind(b.id).first();
 if(existing&&(!equal(existing.token_hash,hash)||existing.version!==b.version||existing.flavor!==b.flavor||existing.bars!==b.bars||existing.market!==b.market||existing.revision!==b.revision||Date.now()-existing.time>86400000))return json({error:'Please reload the page and try again.'},409);
 const now=Date.now(),ctx=b.context||{},visitor=idOk(ctx.visitor)?ctx.visitor:crypto.randomUUID(),session=idOk(ctx.session)?ctx.session:crypto.randomUUID(),page=idOk(ctx.page)?ctx.page:crypto.randomUUID();const campaign={};for(const k of utmKeys)if(typeof ctx.campaign?.[k]==='string')campaign[k]=ctx.campaign[k].slice(0,120);
 const statements=[];
 if(!existing){statements.push(env.DB.prepare('INSERT OR IGNORE INTO checkout_intents VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(b.id,hash,now,now,b.version,'en',b.flavor,b.bars,price,m.currency,b.market,b.revision,'',null,null,visitor,session,page,JSON.stringify(campaign)));
 statements.push(env.DB.prepare('INSERT OR IGNORE INTO events VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(b.id,now,now,visitor,session,page,Number.isInteger(ctx.seq)?Math.max(1,Math.min(100000,ctx.seq)):1,'checkout_intent','/'+b.version+'/en/product/',b.version,'en',Math.max(0,Math.min(600,Number(ctx.active)||0)),Math.max(0,Math.min(100,Number(ctx.scroll)||0)),JSON.stringify({...campaign,intent_id:b.id,flavour:catalog.flavors[b.flavor].name,count:b.bars,price,currency:m.currency,market:b.market,revision:b.revision})));}
 if(email!==null)statements.push(env.DB.prepare('UPDATE checkout_intents SET email=?,updated=?,consent_time=?,consent_version=? WHERE id=? AND token_hash=?').bind(email,now,now,'restock-30-v1',b.id,hash));
 if(statements.length)await env.DB.batch(statements);return json({ok:true,id:b.id,email_saved:email!==null});
 }
 if(path==='/api/events'&&request.method==='POST'){
 if(!env.SESSION_SECRET)return json({error:'Analytics not configured'},503);
 const ip=await mac(env.SESSION_SECRET,request.headers.get('CF-Connecting-IP')||'unknown');if(!await limit(env.DB,'ingest:'+ip,120,60000))return json({error:'Rate limit'},429);
 let body;try{body=await readBody(request)}catch{return json({error:'Invalid event batch'},400)}if(!Array.isArray(body.events)||body.events.length<1||body.events.length>40)return json({error:'Invalid event batch'},400);
 const rows=body.events.map(e=>validate(e,Date.now()));if(rows.some(x=>!x))return json({error:'Invalid event'},400);
 await env.DB.batch(rows.map(row=>env.DB.prepare('INSERT OR IGNORE INTO events VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(...row)));return json({stored:rows.length});
 }
 if(path==='/api/admin/login'&&request.method==='POST'){
 if(!configured(env))return json({error:'Setup required: '+setupProblems(env).join('; ')+'.'},503);
 const ip=await mac(env.SESSION_SECRET,request.headers.get('CF-Connecting-IP')||'unknown');
 if(!await limit(env.DB,'login:'+ip,5,900000)||!await limit(env.DB,'login:global',100,900000))return json({error:'Too many attempts. Try again in 15 minutes.'},429);
 let body;try{body=await readBody(request,1000)}catch{return json({error:'Invalid request'},400)}
 if(typeof body.pin!=='string'||!equal(await mac(env.SESSION_SECRET,body.pin),await mac(env.SESSION_SECRET,env.ADMIN_PIN)))return json({error:'Incorrect PIN'},401);
 const payload=(Date.now()+8*3600000)+'.'+crypto.randomUUID();return json({ok:true},200,{'Set-Cookie':`fb_admin=${payload}.${await mac(env.SESSION_SECRET,payload)}; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Strict`});
 }
 if(path.startsWith('/api/admin/')){
 if(!await authorized(request,env))return json({error:'Sign in required'},401);
 if(path==='/api/admin/logout'&&request.method==='POST')return json({ok:true},200,{'Set-Cookie':'fb_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'});
 if(request.method!=='GET')return json({error:'Method not allowed'},405);
 if(path==='/api/admin/report')return json(await report(env.DB,url));
 if(path==='/api/admin/journey'){
 const visitor=url.searchParams.get('visitor');if(!idOk(visitor))return json({error:'Invalid visitor'},400);
 const rows=await env.DB.prepare('SELECT time,session,page,seq,name,path,active,scroll,details FROM events WHERE visitor=? ORDER BY time,seq LIMIT 2001').bind(visitor).all();return json({events:rows.results.slice(0,2000),truncated:rows.results.length>2000});
 }
 }
 return json({error:'Not found'},404);
}
export default {async fetch(request,env){try{return await handle(request,env)}catch(e){console.error('Fiberboom API error:',e.message);return json({error:'Service temporarily unavailable'},503)}},async scheduled(controller,env){if(env.DB){await init(env.DB);await env.DB.batch([env.DB.prepare('DELETE FROM events WHERE received<?').bind(Date.now()-90*86400000),env.DB.prepare('DELETE FROM checkout_intents WHERE time<?').bind(Date.now()-90*86400000),env.DB.prepare('DELETE FROM limits WHERE expires<?').bind(Date.now())])}}};
