import {cp,readFile,writeFile} from 'node:fs/promises';

// Build price variants from the finished translations so their design and copy stay identical.
export async function buildPriceVariants(){
 const catalog=JSON.parse(await readFile('site/commerce/catalog.json','utf8'));
 const concepts=['light','psyllium','boom'],languages=['en','de','pl'],routes=[];
 for(const concept of concepts)for(const language of languages){
  const base=`dist/${concept}/${language}`;
  for(const file of ['index.html','product/index.html']){
   let html=await readFile(`${base}/${file}`,'utf8');
   const route=`/${concept}/${language}/${file.startsWith('product')?'product/':''}`;
   html=html.replace(/rel="canonical" href="[^"]*"/,`rel="canonical" href="https://fiberboom.com${route}"`);
   if(file==='index.html')html=html.replace('<body> ',`<body data-version="${concept}"> `).replace('<body>',`<body data-version="${concept}">`);
   html=html.replace(/href="\/"/g,`href="/${concept}/${language}/"`);
   await writeFile(`${base}/${file}`,html);
  }
  await cp(base,`dist/${concept}x/${language}`,{recursive:true});
  for(const file of ['index.html','product/index.html']){
   let html=await readFile(`${base}/${file}`,'utf8');
   html=html.replaceAll(`/${concept}/${language}/`,`/${concept}x/${language}/`).replaceAll(`data-version="${concept}"`,`data-version="${concept}x"`);
   // Prices are correct even before the shared market script finishes loading.
   const format=n=>new Intl.NumberFormat(language,{style:'currency',currency:'EUR'}).format(n/100);
   for(const bars of [7,14,30]){
    const before=catalog.markets.DE.prices[bars],after=catalog.markets.DE.xPrices[bars];
    for(const [oldValue,newValue] of [[before,after],[before/bars,after/bars]]){
     html=html.replaceAll(`€${(oldValue/100).toFixed(2)}`,format(newValue)).replaceAll(`€${(oldValue/100).toFixed(2).replace('.',',')}`,format(newValue));
    }
   }
   await writeFile(`dist/${concept}x/${language}/${file}`,html);
  }
  const appPath=`dist/${concept}x/${language}/app.js`;
  const app=await readFile(appPath,'utf8');
  await writeFile(appPath,app.replace('{7:1250,14:2290,30:4590}','{7:1550,14:2890,30:5490}'));
 }
 for(const version of [...concepts,...concepts.map(v=>v+'x')])for(const language of languages)for(const page of ['','product/']){
  const route=`/${version}/${language}/${page}`,path=`dist${route}index.html`;
  let html=await readFile(path,'utf8');
  const alternates=languages.map(lang=>`<link rel="alternate" hreflang="${lang}" href="https://fiberboom.com/${version}/${lang}/${page}">`).join('');
  html=html.replace('</head>',alternates+'</head>');await writeFile(path,html);routes.push(route);
 }
 // Root is byte-for-byte the English Light X page, including its canonical URL.
 await cp('dist/lightx/en/index.html','dist/index.html');
 const sitemap=['/',...routes,'/privacy/en/','/terms/en/'];
 await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemap.map(route=>`<url><loc>https://fiberboom.com${route}</loc></url>`).join('')}</urlset>\n`);
 const redirects=await readFile('dist/_redirects','utf8');
 const extra=concepts.map(v=>`/${v}x /${v}x/en/ 302`);
 for(const version of [...concepts,...concepts.map(v=>v+'x')])for(const language of languages)for(const suffix of ['','/'])extra.push(`/${version}/${language}/checkout${suffix} /${version}/${language}/product/ 302`);
 await writeFile('dist/_redirects',redirects.replace('/product /light/en/product/','/product /lightx/en/product/').replace(/^(\/checkout(?:\/en\/?|) )\/light\/en\/product\//gm,'$1/lightx/en/product/')+'\n'+extra.join('\n')+'\n');
}
