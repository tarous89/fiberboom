import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('all 18 product pages and localized scripts retain stable detail tracking',()=>{
 for(const v of ['light','boom','psyllium','lightx','boomx','psylliumx'])for(const l of ['en','de','pl']){
  const html=readFileSync(`dist/${v}/${l}/product/index.html`,'utf8');
  assert.deepEqual([...html.matchAll(/data-detail="([^"]+)"/g)].map(x=>x[1]),['ingredients','nutrition','shipping','payment','returns']);
 }
 for(const language of ['', '-de','-pl']){
  const source=readFileSync(`dist/commerce/app${language}.js`,'utf8').split('// Native toggle')[1];
  const events=[],panels=['ingredients','nutrition','shipping','payment','returns'].map(section=>({open:false,dataset:{detail:section},querySelector:()=>({textContent:section}),addEventListener(type,fn){this[type]=fn}}));
  let linkClick;vm.runInNewContext('// Native toggle'+source,{kind:'product',track:(...args)=>events.push(args),$:()=>panels[0],document:{querySelectorAll:()=>panels,querySelector:()=>({addEventListener:(name,fn)=>{linkClick=fn}})}});
  for(const panel of panels){panel.toggle();assert.equal(events.length,panels.indexOf(panel));panel.open=true;panel.toggle()}
  assert.deepEqual(events.map(x=>x[1].section),['ingredients','nutrition','shipping','payment','returns']);
  panels[0].open=false;linkClick();assert.equal(panels[0].open,true);
 }
});
