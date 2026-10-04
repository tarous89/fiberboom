import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker/index.mjs';
import catalog from '../site/commerce/catalog.json' with {type:'json'};
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
 const e=env(),id=crypto.randomUUID(),token=crypto.randomUUID();const body={id,token,version:'boom',language:'en',flavor:'pistachio',bars:14,market:'PL',price:9900,currency:'PLN',revision:catalog.revision,context:{visitor:crypto.randomUUID(),session:crypto.randomUUID(),page:crypto.randomUUID(),seq:2,campaign:{utm_source:'qa',utm_campaign:'offer-a'}}};
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
 const body={id:crypto.randomUUID(),token:crypto.randomUUID(),version:'light',language:'pl',flavor:'date',bars:14,market:'PL',price:9900,currency:'PLN',revision:catalog.revision};
 assert.equal((await worker.fetch(req('/api/checkout-intent',body),e)).status,200);
 assert.equal((await worker.fetch(req('/api/checkout-intent',{...body,email:'polish@example.com',consent:true}),e)).status,200);
 assert.equal((await worker.fetch(req('/api/checkout-intent',{...body,language:'en'}),e)).status,409);
 const cookie=await login(e);const pl=await (await worker.fetch(req('/api/admin/report?language=pl',null,cookie),e)).json();assert.equal(pl.checkout_intents[0].language,'pl');assert.equal(pl.checkout_intents[0].email,'polish@example.com');assert.ok(pl.pages.every(p=>p.path.includes('/pl/')));
 const en=await (await worker.fetch(req('/api/admin/report?language=en',null,cookie),e)).json();assert.equal(en.checkout_intents.length,0);assert.equal(en.totals.views,1);
 const redirect=await worker.fetch(req('/boom/pl/checkout/?flavor=date'),e);assert.match(redirect.headers.get('location'),/boom\/pl\/product\/\?flavor=date/);
});

test('German journeys and offers retain language and filter independently from English',async()=>{
 const e=env();await worker.fetch(req('/api/events',{events:[event({path:'/light/de/',language:'de'}),event({path:'/light/en/',language:'en'})]}),e);
 const body={id:crypto.randomUUID(),token:crypto.randomUUID(),version:'light',language:'de',flavor:'date',bars:14,market:'DE',price:2290,currency:'EUR',revision:catalog.revision};
 assert.equal((await worker.fetch(req('/api/checkout-intent',body),e)).status,200);
 assert.equal((await worker.fetch(req('/api/checkout-intent',{...body,email:'german@example.com',consent:true}),e)).status,200);
 assert.equal((await worker.fetch(req('/api/checkout-intent',{...body,language:'en'}),e)).status,409);
 const cookie=await login(e);const pl=await (await worker.fetch(req('/api/admin/report?language=de',null,cookie),e)).json();assert.equal(pl.checkout_intents[0].language,'de');assert.equal(pl.checkout_intents[0].email,'german@example.com');assert.ok(pl.pages.every(p=>p.path.includes('/de/')));
 const en=await (await worker.fetch(req('/api/admin/report?language=en',null,cookie),e)).json();assert.equal(en.checkout_intents.length,0);assert.equal(en.totals.views,1);
 const redirect=await worker.fetch(req('/boom/de/checkout/?flavor=date'),e);assert.match(redirect.headers.get('location'),/boom\/de\/product\/\?flavor=date/);
});

test('edge location and device persist, combine with filters, and follow offers without trusting client location',async()=>{
 const e=env();const send=(path,body,cf,ua)=>{const r=req(path,body);r.headers.set('User-Agent',ua);Object.defineProperty(r,'cf',{value:cf});return worker.fetch(r,e)};
 const ua='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile Safari';
 const ev=event({path:'/light/de/',details:{country:'US',city:'Fake',device:'desktop',utm_source:'test'}});
 assert.equal((await send('/api/events',{events:[ev]},{country:'DE',region:'Berlin',city:'Berlin',latitude:'52.5'},ua)).status,200);
 const details=JSON.parse(e.DB.db.prepare('SELECT details FROM events WHERE id=?').get(ev.id).details);assert.equal(details.country,'DE');assert.equal(details.device,'mobile');assert.equal(details.city,'Berlin');assert.equal(details.latitude,undefined);assert.equal(details.tabletHint,undefined);
 const offer={id:crypto.randomUUID(),token:crypto.randomUUID(),version:'light',language:'de',flavor:'date',bars:14,market:'PL',price:9900,currency:'PLN',revision:catalog.revision,context:{visitor:ev.visitor,session:ev.session,page:ev.page,campaign:{utm_source:'test'}}};
 assert.equal((await send('/api/checkout-intent',offer,{country:'DE',region:'Berlin',city:'Berlin'},ua)).status,200);
 await worker.fetch(req('/api/events',{events:[event()]}),e);
 const cookie=await login(e),get=async q=>(await worker.fetch(req('/api/admin/report?'+q,null,cookie),e)).json();
 const d=await get('country=DE&device=mobile&language=de&utm_source=test');assert.equal(d.totals.views,1);assert.equal(d.locations[0].city,'Berlin');assert.equal(d.devices[0].device,'mobile');assert.equal(d.checkout_intents[0].market,'PL');assert.equal(JSON.parse(d.checkout_intents[0].audience_details).country,'DE');assert.equal(d.visitors[0].countries,'DE');
 assert.equal((await get('country=PL')).totals.views,0);assert.equal((await get('device=desktop')).checkout_intents.length,0);assert.equal((await get('country=unknown&device=unknown')).totals.views,1);
 const journey=await (await worker.fetch(req('/api/admin/journey?visitor='+ev.visitor,null,cookie),e)).json();assert.equal(JSON.parse(journey.events[0].details).device,'mobile');
});

test('X prices validate server-side in both markets and reject standard prices and stale revisions',async()=>{
 for(const version of ['lightx','boomx','psylliumx'])for(const language of ['en','de','pl'])for(const market of ['DE','PL']){
  const e=env(),bars=30,m=catalog.markets[market],body={id:crypto.randomUUID(),token:crypto.randomUUID(),version,language,flavor:'chocolate',bars,market,price:m.xPrices[bars],currency:m.currency,revision:catalog.revision};
  assert.equal((await worker.fetch(req('/api/checkout-intent',{...body,price:m.prices[bars]}),e)).status,409);
  assert.equal((await worker.fetch(req('/api/checkout-intent',{...body,revision:'old'}),e)).status,409);
  assert.equal((await worker.fetch(req('/api/checkout-intent',body),e)).status,200);
 }
 const redirect=await worker.fetch(req('/boomx/pl/checkout/'),env());assert.match(redirect.headers.get('location'),/boomx\/pl\/product\//);
});

test('funnels deduplicate browsers, preserve root history and correlate exact variants, sessions and offers',async()=>{
 const e=env(),visitor=crypto.randomUUID(),session=crypto.randomUUID(),landingPage=crypto.randomUUID(),productPage=crypto.randomUUID(),now=Date.now()-1000;
 const campaign={utm_source:'funnel-qa',utm_campaign:'price-x'},offer={flavor_id:'date',flavour:'Dates & Nuts',count:14,market:'DE',price:2890,currency:'EUR'};
 const make=(path,name,page,seq,time,details={})=>event({visitor,session,page,path,name,seq,time:now+time,variant:'lightx',details:{...campaign,...details}});
 const events=[make('/','page_view',landingPage,1,0),make('/','product_click',landingPage,2,100,{destination:'/lightx/en/product/'}),make('/','product_click',landingPage,3,110),make('/lightx/en/product/','page_view',productPage,1,200),make('/lightx/en/product/','product_view',productPage,2,210,offer),make('/lightx/en/product/','checkout_started',productPage,3,300,offer),make('/lightx/en/product/','checkout_started',productPage,4,310,offer),event({path:'/',variant:'light',details:{utm_source:'old-home'}})];
 assert.equal((await worker.fetch(req('/api/events',{events}),e)).status,200);
 const body={id:crypto.randomUUID(),token:crypto.randomUUID(),version:'lightx',language:'en',flavor:'date',bars:14,market:'DE',price:2890,currency:'EUR',revision:catalog.revision,context:{visitor,session,page:productPage,seq:5,campaign}};
 assert.equal((await worker.fetch(req('/api/checkout-intent',body),e)).status,200);
 assert.equal((await worker.fetch(req('/api/checkout-intent',{...body,email:'funnel@example.com',consent:true}),e)).status,200);
 await worker.fetch(req('/api/checkout-intent',{...body,email:'funnel@example.com',consent:true}),e);
 assert.equal(e.DB.db.prepare("SELECT count(*) n FROM events WHERE name='email_saved'").get().n,1);
 const cookie=await login(e),get=async q=>(await worker.fetch(req('/api/admin/report?'+q,null,cookie),e)).json();
 const report=await get('variant=lightx&utm_source=funnel-qa');const l=report.funnels.landings.find(r=>r.path==='/');
 assert.deepEqual([l.viewers,l.product_clickers,l.product_viewers,l.order_clickers,l.email_signups],[1,1,1,1,1]);assert.equal(l.overall_rate,100);
 const p=report.funnels.products.find(r=>r.path==='/lightx/en/product/');assert.deepEqual([p.viewers,p.order_clickers,p.email_signups],[1,1,1]);
 const o=report.funnels.offers[0];assert.deepEqual([o.flavor,o.bars,o.price,o.viewers,o.order_clickers,o.email_signups],['date',14,2890,1,1,1]);
 assert.equal((await get('variant=light')).funnels.landings.find(r=>r.path==='/').viewers,1);
 assert.equal((await get('language=pl')).funnels.offers.length,0);
 // A direct visitor with an order on another price version/session must not progress this landing cohort.
 const v=crypto.randomUUID(),s=crypto.randomUUID(),page=crypto.randomUUID();
 await worker.fetch(req('/api/events',{events:[event({visitor:v,session:s,page,path:'/boomx/de/',name:'page_view',time:now}),event({visitor:v,session:s,path:'/boom/de/product/',name:'page_view',time:now+100}),event({visitor:v,path:'/boomx/de/product/',name:'checkout_started',time:now+200,details:offer})]}),e);
 const b=(await get('variant=boomx')).funnels.landings.find(r=>r.path==='/boomx/de/');assert.deepEqual([b.viewers,b.product_viewers,b.order_clickers,b.email_signups],[1,0,0,0]);
});

test('approved new markets preserve prices, currencies and unknown shipping in records and report filters',async()=>{
 for(const market of ['AT','CH','INT']){
  const e=env(),m=catalog.markets[market],version='lightx',lang=m.preferredLanguage,visitor=crypto.randomUUID(),session=crypto.randomUUID(),page=crypto.randomUUID();
  const details={market,currency:m.currency,price:m.xPrices[14],count:14,flavor_id:'date'};
  await worker.fetch(req('/api/events',{events:[event({visitor,session,page,path:`/${version}/${lang}/product/`,details}),event({visitor,session,page,path:`/${version}/${lang}/product/`,name:'product_view',seq:2,details})]}),e);
  const body={id:crypto.randomUUID(),token:crypto.randomUUID(),version,language:lang,flavor:'date',bars:14,market,price:m.xPrices[14],currency:m.currency,revision:catalog.revision,context:{visitor,session,page}};
  assert.equal((await worker.fetch(req('/api/checkout-intent',{...body,currency:market==='CH'?'EUR':'CHF'}),e)).status,409);
  assert.equal((await worker.fetch(req('/api/checkout-intent',body),e)).status,200);
  assert.equal((await worker.fetch(req('/api/checkout-intent',{...body,email:'local-market-test@example.com',consent:true}),e)).status,200);
  const cookie=await login(e);const data=await (await worker.fetch(req('/api/admin/report?market='+market,null,cookie),e)).json();
  assert.equal(data.checkout_intents[0].shipping,null);assert.equal(data.checkout_intents[0].total,null);assert.equal(data.checkout_intents[0].shipping_status,'pending');assert.equal(data.checkout_intents[0].currency,m.currency);
  assert.equal(data.funnels.offers[0].market,market);assert.equal(data.funnels.offers[0].viewers,1);assert.equal(data.funnels.offers[0].email_signups,1);
  const other=await (await worker.fetch(req('/api/admin/report?market=PL',null,cookie),e)).json();assert.equal(other.checkout_intents.length,0);assert.equal(other.totals.views,0);
 }
 for(const level of ['prices','xPrices'])for(const pack of catalog.packs)assert.ok(catalog.markets.INT[level][pack]>=catalog.markets.DE[level][pack]*1.25);
});
