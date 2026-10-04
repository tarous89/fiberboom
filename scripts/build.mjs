import {cp,rm,access,readdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {applyShared} from './shared.mjs';
import {buildGerman} from './german.mjs';
import {buildPolish} from './polish.mjs';
import {buildCommerce} from './commerce.mjs';
import {buildPriceVariants} from './price-variants.mjs';
await access('site/index.html');
await rm('dist',{recursive:true,force:true});
await cp('site','dist',{recursive:true});
for(const path of ['dist/index.html',...['light','psyllium','boom'].map(v=>`dist/${v}/en/index.html`)]){
 const html=await readFile(path,'utf8');await writeFile(path,html.replace('</body>','<script type="module" src="/commerce/landing.js"></script></body>'));
}
await buildCommerce();

// Informational privacy notice only. No consent manager, tracking switches or storage.
const notice = `<aside id="fb-beta-notice" class="fb-beta-notice" aria-labelledby="fb-beta-notice-title"><div><strong id="fb-beta-notice-title">Your privacy</strong><p>We use cookies and similar technologies to understand how our website is used and improve your experience. Read our <a href="/privacy/en/">Privacy Policy</a> for information about how we handle your data and your rights.</p></div><div class="notice-actions"><button type="button" id="fb-beta-notice-decline">Decline</button><button type="button" id="fb-beta-notice-approve" aria-label="Approve privacy notice">Approve</button></div></aside>`;
const css = `#fb-beta-notice{position:fixed;inset:auto 20px 20px auto;z-index:1000;box-sizing:border-box;width:360px;max-width:calc(100vw - 40px);margin:0;padding:20px;display:flex;flex-direction:column;align-items:stretch;gap:16px;background:#0d3026;color:#fff;border:1px solid #ffffff30;border-radius:16px;box-shadow:0 12px 40px #0003;font:14px/1.5 system-ui,sans-serif;text-align:left}#fb-beta-notice[hidden]{display:none}#fb-beta-notice strong{font-size:15px;color:#fff}#fb-beta-notice p{margin:6px 0 0;color:#e1eae6;font:inherit;max-width:none}#fb-beta-notice a{color:#d4ef47;text-decoration:underline;text-underline-offset:3px}#fb-beta-notice button{align-self:flex-end;flex-shrink:0;min-height:44px;padding:10px 18px;border:0;border-radius:8px;background:#d4ef47;color:#0d3026;font:600 14px/1.4 system-ui,sans-serif;cursor:pointer}#fb-beta-notice .notice-actions{display:flex;justify-content:flex-end;gap:10px}#fb-beta-notice #fb-beta-notice-decline{background:transparent;color:#fff;border:1px solid #ffffff80}#fb-beta-notice :focus-visible{outline:2px solid #fff;outline-offset:4px}@media(max-width:600px){#fb-beta-notice{inset:auto 12px max(12px,env(safe-area-inset-bottom)) auto;max-width:calc(100vw - 24px);padding:16px;gap:12px;flex-direction:column;align-items:stretch}#fb-beta-notice button{align-self:flex-end}}`;
await writeFile('dist/beta-notice.css',css);
await writeFile('dist/beta-notice.js',`// Approveal is presentation-only; no consent is inferred or persisted.\nfor(const id of ['fb-beta-notice-approve','fb-beta-notice-decline'])document.getElementById(id)?.addEventListener('click',()=>{document.getElementById('fb-beta-notice').hidden=true;});\n`);
async function addNotice(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=join(directory,entry.name);
  if(entry.isDirectory())await addNotice(path);
  else if(entry.name.endsWith('.html')){
   let html=applyShared(await readFile(path,'utf8'));
   html=html.replace('</head>','<link rel="stylesheet" href="/beta-notice.css"></head>');
   html=html.replace('</body>',notice+'<script defer src="/beta-notice.js"></script><script defer src="/analytics.js"></script></body>');
   await writeFile(path,html);
  }
 }
}
await addNotice('dist');
await buildPolish();
await buildGerman();
await buildPriceVariants();
console.log('Built Fiberboom pages with informational privacy notice.');

// Persist the D1 binding in deployment configuration when the Cloudflare build variable is set.
if(process.env.FIBERBOOM_DATABASE_ID){
 const config=JSON.parse(await readFile('wrangler.worker.jsonc','utf8'));
 const id=process.env.FIBERBOOM_DATABASE_ID.trim();
 if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('Invalid FIBERBOOM_DATABASE_ID');
 config.d1_databases=[{binding:'DB',database_name:'fiberboom-analytics',database_id:id}];
 await writeFile('wrangler.worker.jsonc',JSON.stringify(config,null,2)+'\n');
}
