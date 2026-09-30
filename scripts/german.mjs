import {readFile,writeFile,cp} from 'node:fs/promises';
const dictionary=JSON.parse(await readFile('site/i18n/de.json','utf8'));
const decode=s=>s.replace(/&amp;/g,'&').replace(/&nbsp;/g,'\u00a0').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
export function translate(s){const key=decode(s).trim();if(/^[−+-]?\d+\.\d+(?: mmol\/L)?$/.test(key))return s.replace('.',',');return Object.hasOwn(dictionary,key)?s.replace(s.trim(),escape(dictionary[key])):s;}
function htmlDE(html,variant){
 html=html.replace(/>([^<>]+)</g,(all,s)=>'>'+translate(s)+'<');
 html=html.replace(/\b(alt|aria-label|placeholder|title|content|data-choice|data-taste|data-flavour)="([^"]*)"/g,(all,key,value)=>`${key}="${translate(value)}"`);
 html=html.replace('<option value="DE">','<option value="DE" selected>').replace('<option value="de">','<option value="de" selected>');
 html=html.replace('lang="en"','lang="de"').replaceAll(`/${variant}/en/`,`/${variant}/de/`).replace('src="/commerce/app.js"','src="/commerce/app-de.js"');
 html=html.replace(/(<header\b[\s\S]*?<a href=")\/(" aria-label)/,'$1/'+variant+'/de/$2');
 
 html=html.replace('BALLASTSTOFFE. WASSER.<br>', 'BALLASTSTOFFE.<br>WASSER.<br>');
 html=html.replace(/<(h[12])([^>]*)>([\s\S]*?)<\/\1>/g,(_,tag,attrs,text)=>'<'+tag+attrs+'>'+text.replaceAll('Flohsamenschalen','Flohsamen&shy;schalen').replaceAll('BALLASTSTOFFE','BALLAST&shy;STOFFE')+'</'+tag+'>');
 return html.replace('</head>','<link rel="stylesheet" href="/i18n/de.css"></head>');
}
function jsDE(source){
 // Translate quoted display strings and object keys together; data-flavour values follow the same map.
 source=source.replace(/(['"])((?:\\.|(?!\1)[^\\\n])*?)\1/g,(all,quote,raw)=>{
  const value=raw.replace(/\\'/g,"'").replace(/\\"/g,'"');
  return Object.hasOwn(dictionary,value)?JSON.stringify(dictionary[value]):all;
 });
 return source.replaceAll('} bars','} Riegel').replaceAll(' per bar',' pro Riegel').replaceAll(' / bar',' / Riegel').replaceAll('FiberBoom package','FiberBoom-Verpackung').replaceAll('FiberBoom bar','FiberBoom-Riegel').replaceAll(' Riegel in a branded cardboard display box',' — Riegel in einer FiberBoom-Box');
}
export async function buildGerman(){
 for(const variant of ['light','psyllium','boom']){
  await cp(`dist/${variant}/en`,`dist/${variant}/de`,{recursive:true});
  for(const file of ['index.html','product/index.html']){
   const html=await readFile(`dist/${variant}/en/${file}`,'utf8');
   await writeFile(`dist/${variant}/de/${file}`,htmlDE(html,variant));
  }
  await writeFile(`dist/${variant}/de/app.js`,jsDE(await readFile(`dist/${variant}/en/app.js`,'utf8')));
 }
 const c=JSON.parse(await readFile('site/commerce/catalog.json','utf8'));
 for(const f of Object.values(c.flavors))for(const key of ['name','description','ingredients','allergens'])f[key]=dictionary[f[key]]||dictionary[f[key].split(' Sample allergen')[0]]||f[key];
 for(const m of Object.values(c.markets)){m.name=dictionary[m.name]||m.name;m.payments=m.payments.map(p=>dictionary[p]||p)}
 await writeFile('dist/commerce/catalog-de.json',JSON.stringify(c));
 let app=jsDE(await readFile('site/commerce/app.js','utf8'));
 app=app.replace("import {catalog as data,country} from '/market.js';","import {country} from '/market.js';\nconst data=await fetch('/commerce/catalog-de.json').then(r=>r.json());");
 app=app.replaceAll("'en'","'de'").replace('`/${version}/en`','`/${version}/de`');
 app=app.replace("'Delivery in '+m.name","'Lieferung: '+m.name").replace("'Free delivery on this pack · '","'Diese Box ist versandkostenfrei · '").replace("' delivery · Free from '","' Versand · Kostenlos ab '").replace("' per order. Free delivery from '","' pro Bestellung. Versandkostenfrei ab '");
 app=app.replace("throw Error(result.error||", "throw Error(({'Please wait a minute and try again.':'Bitte warte eine Minute und versuch es erneut.','This offer has changed. Please reload the page to see current prices.':'Dieses Angebot hat sich geändert. Lade die Seite neu, um die aktuellen Preise zu sehen.','Please enter a valid email address and agree to the restock email.':'Bitte gib eine gültige E-Mail-Adresse ein und stimme der Benachrichtigung zu.'})[result.error]||");
 app=app.replace("f.name+' bar'","f.name+' — Riegel'").replace("'display box':view==='pack'?'package':'bar'","'Box':view==='pack'?'Verpackung':'Riegel'");
 app=app.replace(".toFixed(1)+' g'",".toFixed(1).replace('.',',')+' g'").replace("f.nutrition[key]+' g'","String(f.nutrition[key]).replace('.',',')+' g'");
 await writeFile('dist/commerce/app-de.js',app);
}
