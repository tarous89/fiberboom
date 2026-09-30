import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
const dictionary=JSON.parse(await readFile('site/i18n/pl.json','utf8'));
const decode=s=>s.replace(/&amp;/g,'&').replace(/&nbsp;/g,'\u00a0').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
export function translate(s){const key=decode(s).trim();if(/^[−+-]?\d+\.\d+(?: mmol\/L)?$/.test(key))return s.replace('.',',');return Object.hasOwn(dictionary,key)?s.replace(s.trim(),escape(dictionary[key])):s;}
function htmlPL(html,variant){
 html=html.replace(/>([^<>]+)</g,(all,s)=>'>'+translate(s)+'<');
 html=html.replace(/\b(alt|aria-label|placeholder|title|content|data-choice|data-taste|data-flavour)="([^"]*)"/g,(all,key,value)=>`${key}="${translate(value)}"`);
 html=html.replace('<option value="PL">','<option value="PL" selected>').replace('<option value="pl">','<option value="pl" selected>');
 html=html.replace('lang="en"','lang="pl"').replaceAll(`/${variant}/en/`,`/${variant}/pl/`).replace('src="/commerce/app.js"','src="/commerce/app-pl.js"');
 html=html.replace(/(<header\b[\s\S]*?<a href=")\/(" aria-label)/,'$1/'+variant+'/pl/$2');
 html=html.replace('class="gallery-stamp">OD BŁONNIKA.','class="gallery-stamp">BŁONNIK.');
 return html.replace('</head>','<link rel="stylesheet" href="/i18n/pl.css"></head>');
}
function jsPL(source){
 // Translate quoted display strings and object keys together; data-flavour values follow the same map.
 source=source.replace(/(['"])((?:\\.|(?!\1)[^\\\n])*?)\1/g,(all,quote,raw)=>{
  const value=raw.replace(/\\'/g,"'").replace(/\\"/g,'"');
  return Object.hasOwn(dictionary,value)?JSON.stringify(dictionary[value]):all;
 });
 return source.replaceAll('} bars','} batonów').replaceAll(' per bar',' za baton').replaceAll(' / bar',' / baton').replaceAll('FiberBoom package','opakowanie FiberBoom').replaceAll('FiberBoom bar','baton FiberBoom').replaceAll(' batonów in a branded cardboard display box',' — batony w pudełku FiberBoom');
}
export async function buildPolish(){
 for(const variant of ['light','psyllium','boom']){
  await cp(`dist/${variant}/en`,`dist/${variant}/pl`,{recursive:true});
  for(const file of ['index.html','product/index.html']){
   const html=await readFile(`dist/${variant}/en/${file}`,'utf8');
   await writeFile(`dist/${variant}/pl/${file}`,htmlPL(html,variant));
  }
  await writeFile(`dist/${variant}/pl/app.js`,jsPL(await readFile(`dist/${variant}/en/app.js`,'utf8')));
 }
 const c=JSON.parse(await readFile('site/commerce/catalog.json','utf8'));
 for(const f of Object.values(c.flavors))for(const key of ['name','description','ingredients','allergens'])f[key]=dictionary[f[key]]||dictionary[f[key].split(' Sample allergen')[0]]||f[key];
 for(const m of Object.values(c.markets)){m.name=dictionary[m.name]||m.name;m.payments=m.payments.map(p=>dictionary[p]||p)}
 await writeFile('dist/commerce/catalog-pl.json',JSON.stringify(c));
 let app=jsPL(await readFile('site/commerce/app.js','utf8'));
 app=app.replace("import {catalog as data,country} from '/market.js';","import {country} from '/market.js';\nconst data=await fetch('/commerce/catalog-pl.json').then(r=>r.json());");
 app=app.replaceAll("'en'","'pl'").replace('`/${version}/en`','`/${version}/pl`');
 app=app.replace("'Delivery in '+m.name","'Dostawa: '+m.name").replace("'Free delivery on this pack · '","'Ten zestaw z darmową dostawą · '").replace("' delivery · Free from '","' dostawa · Za darmo od '").replace("' per order. Free delivery from '","' za zamówienie. Darmowa dostawa od '");
 app=app.replace("throw Error(result.error||", "throw Error(({'Please wait a minute and try again.':'Poczekaj minutę i spróbuj ponownie.','This offer has changed. Please reload the page to see current prices.':'Oferta się zmieniła. Odśwież stronę, aby zobaczyć aktualne ceny.','Please enter a valid email address and agree to the restock email.':'Podaj poprawny adres e-mail i zaakceptuj powiadomienie o dostępności.'})[result.error]||");
 app=app.replace("f.name+' bar'","f.name+' — baton'").replace("'display box':view==='pack'?'package':'bar'","'pudełko':view==='pack'?'opakowanie':'baton'");
 app=app.replace(".toFixed(1)+' g'",".toFixed(1).replace('.',',')+' g'").replace("f.nutrition[key]+' g'","String(f.nutrition[key]).replace('.',',')+' g'");
 await writeFile('dist/commerce/app-pl.js',app);
}
