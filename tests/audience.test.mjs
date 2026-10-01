import {test} from 'node:test';import assert from 'node:assert/strict';import {audience} from '../worker/audience.mjs';
const classify=(ua,context={})=>audience(new Request('https://fiberboom.com',{headers:{'User-Agent':ua}}),context).device;
test('device categories distinguish phones, Android/iPad tablets, desktops and unknown agents',()=>{
 assert.equal(classify('Mozilla/5.0 (iPhone) Mobile Safari'),'mobile');assert.equal(classify('Mozilla/5.0 (Linux; Android 14; Pixel) Mobile Chrome'),'mobile');
 assert.equal(classify('Mozilla/5.0 (Linux; Android 14; SM-X) Chrome'),'tablet');assert.equal(classify('Mozilla/5.0 (iPad) Safari'),'tablet');assert.equal(classify('Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari',{tabletHint:true}),'tablet');
 assert.equal(classify('Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari'),'desktop');assert.equal(classify('Mozilla/5.0 (Windows NT 10.0) Chrome'),'desktop');assert.equal(classify('Googlebot'),'unknown');assert.equal(classify(''),'unknown');
});
