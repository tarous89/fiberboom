import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('site/tiktok-pixel.js','utf8');
function browser({path='/lightx/en/',version='lightx',language='en',kind='',saved={approved:true,expires:Date.now()+10000}}={}){
 const handlers={},scripts=[],window={};
 const document={body:{dataset:{commercePage:kind,version}},documentElement:{lang:language},createElement:()=>({}),getElementsByTagName:()=>[{parentNode:{insertBefore:s=>scripts.push(s)}}],addEventListener:(name,fn)=>{(handlers[name]??=[]).push(fn)}};
 vm.runInNewContext(source,{window,document,URL,Date,location:{pathname:path,origin:'https://fiberboom.com'},localStorage:{getItem:()=>JSON.stringify(saved)}});
 const dispatch=(name,event)=>{for(const fn of handlers[name]||[])fn(event)};
 return {scripts,commands:()=>Array.from(window.ttq||[]),tracks:()=>Array.from(window.ttq||[]).filter(c=>c[0]==='track'),click:(href,button=false)=>dispatch('click',{target:{closest:selector=>selector==='a[href]'&&!button?{href,matches:()=>false}:null}}),choose:id=>dispatch('click',{target:{closest:selector=>selector==='button'?{id}:null}}),commerce:destination=>dispatch('fb:commerce',{detail:{name:'product_click',details:{destination}}})};
}
test('all languages, concepts, prices, homepage and random entries track only product navigation',()=>{
 for(const version of ['light','boom','psyllium','lightx','boomx','psylliumx'])for(const language of ['en','de','pl'])for(const path of [`/${version}/${language}/`,`/${language}/`]){
  const b=browser({version,language,path});
  assert.equal(b.scripts.length,1);assert.match(b.scripts[0].src,/sdkid=DB2BIJBC77U04C8M35B0&lib=ttq$/);
  b.click(`https://fiberboom.com/${version}/${language}/product/?market=PL&bars=30&ttclid=test`);
  assert.equal(b.tracks().length,1);assert.equal(b.tracks()[0][1],'ViewContent');assert.equal(b.tracks()[0][2].page_variant,version);assert.equal(b.tracks()[0][2].page_language,language);
  b.click('https://fiberboom.com/privacy/en/');b.click(`https://other.example/${version}/${language}/product/`);assert.equal(b.tracks().length,1);
 }
 const root=browser({path:'/'});root.click('https://fiberboom.com/lightx/en/product/');assert.equal(root.tracks().length,1);
});
test('button-navigation event tracks once; product pages and order clicks do not convert',()=>{
 const b=browser();b.click('https://fiberboom.com/lightx/en/product/',true);b.commerce('/lightx/en/product/');assert.equal(b.tracks().length,1);
 for(const path of ['/lightx/en/product/','/privacy/en/','/admin']){const p=browser({path,kind:path.includes('/product/')?'product':''});p.click('https://fiberboom.com/lightx/en/product/');p.commerce('/lightx/en/product/');assert.equal(p.tracks().length,0)}
});
test('TikTok starts without approval and does not read or alter the existing banner choice',()=>{
 for(const saved of [null,{approved:false,expires:Date.now()+10000},{approved:true,expires:1}]){
  const b=browser({saved});assert.equal(b.scripts.length,1);assert.equal(b.tracks().length,0);
  b.commerce('/lightx/en/product/');assert.equal(b.tracks().length,1);
  b.choose('fb-beta-notice-approve');b.choose('fb-beta-notice-decline');
  assert.equal(b.scripts.length,1);assert.equal(b.commands().filter(c=>c[0]==='page').length,1);
  assert.ok(!b.commands().some(c=>c[0]==='grantConsent'||c[0]==='revokeConsent'));
 }
});
test('every generated storefront includes Google and TikTok exactly once',()=>{
 for(const version of ['light','boom','psyllium','lightx','boomx','psylliumx'])for(const language of ['en','de','pl'])for(const page of ['','product/']){
  const html=readFileSync(`dist/${version}/${language}/${page}index.html`,'utf8');
  assert.equal(html.split('src="/tiktok-pixel.js"').length-1,1);assert.equal(html.split('src="/google-ads.js"').length-1,1);
 }
});
