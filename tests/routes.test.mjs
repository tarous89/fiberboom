import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../dist/'+p,import.meta.url),'utf8');
test('all 36 routes have correct identities, localized assets and sitemap links; root exactly matches English Light X',()=>{
 const xml=read('sitemap.xml');let n=0;
 for(const v of ['light','boom','psyllium','lightx','boomx','psylliumx'])for(const lang of ['en','de','pl'])for(const page of ['','product/']){
  const route=v+'/'+lang+'/'+page,html=read(route+'index.html');n++;
  assert.ok(html.includes(`lang="${lang}"`));assert.ok(html.includes(`data-version="${v}"`));assert.ok(html.includes(`rel="canonical" href="https://fiberboom.com/${route}"`));assert.ok(xml.includes(`<loc>https://fiberboom.com/${route}</loc>`));
  assert.ok(!html.includes('/light-x/')&&!html.includes('/boom-x/')&&!html.includes('/psyllium-x/'));
  if(v.endsWith('x'))assert.ok(html.includes('class="theme-'+v.slice(0,-1)+'"')||!page);
 }
 assert.equal(n,36);assert.equal(read('index.html'),read('lightx/en/index.html'));
 const html=read('lightx/en/index.html');for(const p of ['$19.50','$36.50','$68.90'])assert.ok(html.includes(p));for(const p of ['€12.50','€22.90','€45.90'])assert.ok(!html.includes(p));
 const redirects=read('_redirects');for(const v of ['light','boom','psyllium','lightx','boomx','psylliumx'])for(const lang of ['en','de','pl'])assert.ok(redirects.includes(`/${v}/${lang}/checkout/ /${v}/${lang}/product/ 302`));
});
