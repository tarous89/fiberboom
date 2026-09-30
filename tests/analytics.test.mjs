import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker/index.mjs';
import {adminPage} from '../worker/ui.mjs';
class D1 {
 constructor(){this.db=new DatabaseSync(':memory:')}
 prepare(sql){const db=this.db;let args=[];return {bind(...v){args=v;return this},async all(){return {results:db.prepare(sql).all(...args)}},async first(){return db.prepare(sql).get(...args)||null},async run(){db.prepare(sql).run(...args);return {success:true}}}}
 async batch(statements){let results=[];for(const s of statements)results.push(await s.all());return results}
}
const host='https://fiberboom.com';
const env=()=>({DB:new D1(),ADMIN_PIN:'test-only-pin',SESSION_SECRET:'test-only-secret-of-at-least-32-characters',ASSETS:{fetch:async()=>new Response('asset')}});
const req=(path,body,cookie)=>new Request(host+path,{method:body?'POST':'GET',headers:{Origin:host,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
async function login(e){const r=await worker.fetch(req('/api/admin/login',{pin:e.ADMIN_PIN}),e);assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0]}
const event=(overrides={})=>({id:crypto.randomUUID(),visitor:crypto.randomUUID(),session:crypto.randomUUID(),page:crypto.randomUUID(),seq:1,name:'page_view',path:'/',active:0,scroll:0,time:Date.now(),details:{persistent:true},...overrides});
test('missing setup fails closed; public pages still work',async()=>{const e=env();delete e.DB;assert.equal((await worker.fetch(req('/api/events',{events:[event()]}),e)).status,503);assert.equal(await (await worker.fetch(req('/'),e)).text(),'asset');assert.match(await (await worker.fetch(req('/admin'),e)).text(),/Setup required/)});
test('authentication, secure cookie, tampering, origin checks, rate limiting',async()=>{const e=env();assert.equal((await worker.fetch(req('/api/admin/report'),e)).status,401);assert.equal((await worker.fetch(req('/api/admin/login',{pin:'wrong'}),e)).status,401);const r=await worker.fetch(req('/api/admin/login',{pin:e.ADMIN_PIN}),e);assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);const cookie=r.headers.get('set-cookie').split(';')[0];assert.equal((await worker.fetch(req('/api/admin/report',null,cookie+'a'),e)).status,401);assert.equal((await worker.fetch(new Request(host+'/api/events',{method:'POST',headers:{Origin:'https://evil.test'},body:'{}'}),e)).status,403);for(let i=0;i<4;i++)await worker.fetch(req('/api/admin/login',{pin:'wrong'}),e);assert.equal((await worker.fetch(req('/api/admin/login',{pin:e.ADMIN_PIN}),e)).status,429)});
test('events persist once; maxima, returning visits, filters and journeys calculate correctly',async()=>{const e=env();const first=event();const second=event({visitor:first.visitor,path:'/boom/en/'});const engaged=event({visitor:first.visitor,session:first.session,page:first.page,name:'active_time',seq:2,active:600,scroll:80});const batch={events:[first,second,engaged]};assert.equal((await worker.fetch(req('/api/events',batch),e)).status,200);await worker.fetch(req('/api/events',batch),e);const cookie=await login(e);const report=await (await worker.fetch(req('/api/admin/report',null,cookie),e)).json();assert.equal(report.totals.events,3);assert.equal(report.totals.views,2);assert.equal(report.totals.returning_browsers,1);assert.equal(report.visitors[0].lifetime_sessions,2);assert.equal(report.pages.find(p=>p.path==='/').active,600);const filtered=await (await worker.fetch(req('/api/admin/report?variant=boom',null,cookie),e)).json();assert.equal(filtered.totals.views,1);const journey=await (await worker.fetch(req('/api/admin/journey?visitor='+first.visitor,null,cookie),e)).json();assert.equal(journey.events.length,3);assert.equal((await worker.fetch(req('/api/events',{events:[event({path:'/admin'})]}),e)).status,400)});
test('daily retention cleanup deletes old events',async()=>{const e=env();await worker.fetch(req('/api/events',{events:[event()]}),e);e.DB.db.exec('UPDATE events SET received=1');await worker.scheduled({},e);assert.equal(e.DB.db.prepare('SELECT count(*) n FROM events').get().n,0)});
test('admin templates contain syntactically valid scripts without embedded PIN',()=>{for(const auth of [true,false]){const html=adminPage(auth,true,'nonce');const script=html.match(/<script nonce="nonce">([\s\S]*?)<\/script>/)[1];new Function(script);assert.ok(!html.includes('1201'));assert.ok(!html.includes('test-only-pin'))}});

test('UTM filters combine, preserve legacy engagement and support missing values safely',async()=>{const e=env();const campaign={utm_source:'Newsletter',utm_medium:'email',utm_campaign:'Launch & summer',utm_content:'hero',utm_term:'psyllium'};const first=event({details:campaign});const click=event({visitor:first.visitor,session:first.session,page:first.page,name:'checkout_intent',seq:2,active:90,scroll:80});const other=event({details:{utm_source:'instagram',utm_medium:'paid',utm_campaign:'Other'}});const direct=event();await worker.fetch(req('/api/events',{events:[first,click,other,direct]}),e);const cookie=await login(e);const get=async q=>{const response=await worker.fetch(req('/api/admin/report?'+q,null,cookie),e);assert.equal(response.status,200);return response.json()};let d=await get(new URLSearchParams(campaign));assert.equal(d.totals.views,1);assert.equal(d.totals.events,2);assert.equal(d.pages[0].active,90);assert.equal(d.events.find(x=>x.name==='checkout_intent').count,1);assert.equal(d.campaigns[0].utm_campaign,'Launch & summer');assert.ok(d.utm_options.utm_source.includes('instagram'));d=await get('utm_source=Newsletter&utm_medium=paid');assert.equal(d.totals.views,0);d=await get('utm_source_missing=1');assert.equal(d.totals.views,1);d=await get('utm_term_missing=1');assert.equal(d.totals.views,2);d=await get(new URLSearchParams({utm_source:"x' OR 1=1 --"}));assert.equal(d.totals.views,0);d=await get('utm_source=newsletter');assert.equal(d.totals.views,0)});

test('checkout interest stays one immutable offer with optional protected email and matching campaign filters',async()=>{
 const e=env(),id=crypto.randomUUID(),token=crypto.randomUUID();const body={id,token,version:'boom',language:'en',flavor:'pistachio',bars:14,market:'PL',price:9900,currency:'PLN',revision:'2026-09-30-restock-v2',context:{visitor:crypto.randomUUID(),session:crypto.randomUUID(),page:crypto.randomUUID(),seq:2,campaign:{utm_source:'qa',utm_campaign:'offer-a'}}};
 await worker.fetch(req('/api/events',{events:[event({visitor:body.context.visitor,session:body.context.session,page:body.context.page,path:'/boom/en/product/',details:body.context.campaign})]}),e);
 const save=b=>worker.fetch(req('/api/checkout-intent',b),e);
 assert.equal((await save(body)).status,200);assert.equal((await save(body)).status,200);
 assert.equal(e.DB.db.prepare('SELECT count(*) n FROM checkout_intents').get().n,1);
 assert.equal(e.DB.db.prepare("SELECT count(*) n FROM events WHERE name='checkout_intent'").get().n,1);
 assert.equal(e.DB.db.prepare('SELECT email FROM checkout_intents').get().email,'');
 assert.equal((await save({...body,token:crypto.randomUUID(),email:'stolen@example.com',consent:true})).status,409);
 assert.equal((await save({...body,price:1})).status,409);
 assert.equal((await save({...body,email:'not-an-email',consent:true})).status,400);
 assert.equal((await save({...body,email:'tester@example.com',consent:true})).status,200);
 assert.equal((await save(body)).status,200);assert.equal(e.DB.db.prepare('SELECT email FROM checkout_intents').get().email,'tester@example.com');
 const cookie=await login(e);const d=await (await worker.fetch(req('/api/admin/report?variant=boom&utm_source=qa',null,cookie),e)).json();assert.equal(d.checkout_intents.length,1);assert.equal(d.checkout_intents[0].price,9900);assert.equal(d.checkout_intents[0].shipping,1500);assert.equal(d.checkout_intents[0].total,11400);assert.equal(d.checkout_intents[0].email,'tester@example.com');assert.equal(d.events.find(x=>x.name==='checkout_intent').count,1);
 const empty=await (await worker.fetch(req('/api/admin/report?utm_source=other',null,cookie),e)).json();assert.equal(empty.checkout_intents.length,0);
 assert.equal((await worker.fetch(req('/api/admin/report'),e)).status,401);
 const redirect=await worker.fetch(req('/boom/en/checkout/?flavor=pistachio'),e);assert.equal(redirect.status,302);assert.match(redirect.headers.get('location'),/boom\/en\/product\/\?flavor=pistachio/);
 e.DB.db.exec('UPDATE checkout_intents SET time=1');await worker.scheduled({},e);assert.equal(e.DB.db.prepare('SELECT count(*) n FROM checkout_intents').get().n,0);
});

test('Polish journeys and offers retain language and filter independently from English',async()=>{
 const e=env();await worker.fetch(req('/api/events',{events:[event({path:'/light/pl/',language:'pl'}),event({path:'/light/en/',language:'en'})]}),e);
 const body={id:crypto.randomUUID(),token:crypto.randomUUID(),version:'light',language:'pl',flavor:'date',bars:14,market:'PL',price:9900,currency:'PLN',revision:'2026-09-30-restock-v2'};
 assert.equal((await worker.fetch(req('/api/checkout-intent',body),e)).status,200);
 assert.equal((await worker.fetch(req('/api/checkout-intent',{...body,email:'polish@example.com',consent:true}),e)).status,200);
 assert.equal((await worker.fetch(req('/api/checkout-intent',{...body,language:'en'}),e)).status,409);
 const cookie=await login(e);const pl=await (await worker.fetch(req('/api/admin/report?language=pl',null,cookie),e)).json();assert.equal(pl.checkout_intents[0].language,'pl');assert.equal(pl.checkout_intents[0].email,'polish@example.com');assert.ok(pl.pages.every(p=>p.path.includes('/pl/')));
 const en=await (await worker.fetch(req('/api/admin/report?language=en',null,cookie),e)).json();assert.equal(en.checkout_intents.length,0);assert.equal(en.totals.views,1);
 const redirect=await worker.fetch(req('/boom/pl/checkout/?flavor=date'),e);assert.match(redirect.headers.get('location'),/boom\/pl\/product\/\?flavor=date/);
});
