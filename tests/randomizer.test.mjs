import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assignment,experimentVersions} from '../worker/randomizer.mjs';
import worker from '../worker/index.mjs';
test('six equal buckets, unbiased rejection, valid 90-day reuse and invalid-cookie replacement',()=>{
 const now=Date.now();for(let n=0;n<6;n++)assert.equal(assignment('', 'de',now,()=>n).version,experimentVersions[n]);
 const values=[4294967295,5];assert.equal(assignment('','en',now,()=>values.shift()).version,'boomx');
 const a=assignment('','de',now,()=>2);const saved=assignment(`${a.key}=${a.value}`,'de',now+1000,()=>{throw Error('must reuse')});assert.equal(saved.version,'boom');assert.equal(saved.fresh,false);
 for(const cookie of ['fb_experiment_v1_de=invalid.9999999999999',`fb_experiment_v1_de=boom.${now-1}`,`fb_experiment_v1_de=boom.${now+91*86400000}`])assert.equal(assignment(cookie,'de',now,()=>0).fresh,true);
 assert.equal(assignment(`${a.key}=${a.value}`,'pl',now,()=>0).fresh,true);
});
test('all variants render directly with canonical assets, preserved query and private cache headers',async()=>{
 for(const lang of ['en','de','pl'])for(const version of experimentVersions)for(const slash of ['','/']){
  let fetched;const env={ASSETS:{fetch:async request=>{fetched=request;return new Response(readFileSync(`dist/${version}/${lang}/index.html`),{headers:{'Content-Type':'text/html',ETag:'shared','Cache-Control':'public'}})}}};
  const cookie=`fb_experiment_v1_${lang}=${version}.${Date.now()+86400000}`;
  const response=await worker.fetch(new Request(`https://fiberboom.com/${lang}${slash}?utm_source=tiktok&ttclid=abc%2B123&market=CH`,{headers:{Cookie:cookie,'If-None-Match':'shared'}}),env);
  assert.equal(response.status,200);assert.equal(response.headers.get('Location'),null);assert.equal(response.headers.get('Set-Cookie'),null);assert.equal(response.headers.get('ETag'),null);assert.match(response.headers.get('Cache-Control'),/no-store/);assert.equal(response.headers.get('Vary'),'Cookie');
  assert.equal(fetched.headers.get('If-None-Match'),null);const url=new URL(fetched.url);assert.equal(url.pathname,`/${version}/${lang}/`);assert.equal(url.searchParams.get('ttclid'),'abc+123');assert.equal(url.searchParams.get('utm_source'),'tiktok');
  const html=await response.text();assert.ok(html.includes(`data-version="${version}"`));assert.ok(html.includes(`lang="${lang}"`));
 }
 const env={ASSETS:{fetch:async()=>new Response('page')}};
 const first=await worker.fetch(new Request('https://fiberboom.com/en/'),env);assert.match(first.headers.get('Set-Cookie'),/Max-Age=7776000; HttpOnly; Secure; SameSite=Lax/);
 const head=await worker.fetch(new Request('https://fiberboom.com/de/',{method:'HEAD'}),env);assert.equal(await head.text(),'');
 assert.equal((await worker.fetch(new Request('https://fiberboom.com/pl/',{method:'POST'}),env)).status,405);
 const config=JSON.parse(readFileSync('wrangler.worker.jsonc'));for(const lang of ['en','de','pl'])for(const slash of ['','/'])assert.ok(config.assets.run_worker_first.includes('/'+lang+slash));
});
