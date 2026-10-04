const concepts=['light','psyllium','boom','lightx','psylliumx','boomx'];
const languages=['en','de','pl'];
const rates=row=>({...row,
 product_click_rate:row.viewers?Math.round(row.product_clickers/row.viewers*1000)/10:null,
 order_rate:(row.product_viewers??row.viewers)?Math.round(row.order_clickers/(row.product_viewers??row.viewers)*1000)/10:null,
 email_rate:row.order_clickers?Math.round(row.email_signups/row.order_clickers*1000)/10:null,
 overall_rate:row.viewers?Math.round(row.email_signups/row.viewers*1000)/10:null});

export async function funnelReport(db,where,args,{variant,language}){
 const query=sql=>db.prepare(sql).bind(...args).all();
 // Apply dashboard filters to each stage, then correlate within the same browser,
 // session, language and price variant. Repeated clicks never inflate browser counts.
 const filtered=`WITH filtered AS (SELECT * FROM events WHERE ${where} AND name IN ('page_view','product_view','product_click','cta_click','checkout_started','checkout_intent','market_selected'))`;
 const match=(alias,cohort)=>`${alias}.visitor=${cohort}.visitor AND ${alias}.session=${cohort}.session AND ${alias}.variant=${cohort}.variant AND ${alias}.language=${cohort}.language`;
 const landingPaths=['/','/en/','/de/','/pl/',...concepts.flatMap(v=>languages.map(l=>`/${v}/${l}/`))];
 const landingSql=`${filtered},
 landings AS (SELECT visitor,session,path,variant,language,MIN(time) started FROM filtered WHERE name IN ('page_view','market_selected') AND path IN (${landingPaths.map(p=>`'${p}'`).join(',')}) GROUP BY visitor,session,path,variant,language),
 clicks AS (SELECT l.*,(SELECT MIN(c.time) FROM filtered c WHERE ${match('c','l')} AND c.path=l.path AND c.time>=l.started AND (c.name='product_click' OR (c.name='cta_click' AND json_extract(c.details,'$.destination') LIKE '%/product/%'))) clicked,
 (SELECT MIN(p.time) FROM filtered p WHERE ${match('p','l')} AND p.path='/'||l.variant||'/'||l.language||'/product/' AND p.time>=l.started AND p.name IN ('page_view','product_view')) product_time FROM landings l),
 orders AS (SELECT c.*,(SELECT MIN(o.time) FROM filtered o WHERE ${match('o','c')} AND o.path='/'||c.variant||'/'||c.language||'/product/' AND o.time>=c.product_time AND o.name IN ('checkout_started','checkout_intent','market_selected')) order_time FROM clicks c),
 stages AS (SELECT o.*,EXISTS(SELECT 1 FROM checkout_intents i WHERE i.visitor=o.visitor AND i.session=o.session AND i.version=o.variant AND i.language=o.language AND i.time>=o.product_time AND i.consent_time>=o.order_time AND i.email<>'') signed_up FROM orders o)
 SELECT path,variant,language,COUNT(DISTINCT visitor) viewers,COUNT(DISTINCT CASE WHEN clicked IS NOT NULL THEN visitor END) product_clickers,COUNT(DISTINCT CASE WHEN product_time IS NOT NULL THEN visitor END) product_viewers,COUNT(DISTINCT CASE WHEN order_time IS NOT NULL THEN visitor END) order_clickers,COUNT(DISTINCT CASE WHEN signed_up THEN visitor END) email_signups FROM stages GROUP BY path,variant,language`;
 const productSql=`${filtered},
 products AS (SELECT visitor,session,page,path,variant,language,MIN(time) started FROM filtered WHERE name IN ('page_view','product_view') AND path LIKE '%/product/' GROUP BY visitor,session,page,path,variant,language),
 orders AS (SELECT p.*,(SELECT MIN(o.time) FROM filtered o WHERE ${match('o','p')} AND o.page=p.page AND o.path=p.path AND o.time>=p.started AND o.name IN ('checkout_started','checkout_intent','market_selected')) order_time FROM products p)
 SELECT path,variant,language,COUNT(DISTINCT visitor) viewers,COUNT(DISTINCT CASE WHEN order_time IS NOT NULL THEN visitor END) order_clickers,COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM checkout_intents i WHERE i.visitor=o.visitor AND i.session=o.session AND i.page=o.page AND i.version=o.variant AND i.language=o.language AND i.time>=o.started AND i.consent_time>=o.order_time AND i.email<>'') THEN visitor END) email_signups FROM orders o GROUP BY path,variant,language`;
 const offerSql=`${filtered},
 selections AS (SELECT visitor,session,page,path,variant,language,COALESCE(json_extract(details,'$.flavor_id'),json_extract(details,'$.flavour'),'') flavor,CAST(json_extract(details,'$.count') AS INTEGER) bars,COALESCE(json_extract(details,'$.market'),'') market,COALESCE(json_extract(details,'$.currency'),'') currency,json_extract(details,'$.price') price,MIN(time) started FROM filtered WHERE name='product_view' AND path LIKE '%/product/' GROUP BY visitor,session,page,path,variant,language,flavor,bars,market,currency,price),
 orders AS (SELECT p.*,(SELECT MIN(o.time) FROM filtered o WHERE ${match('o','p')} AND o.page=p.page AND o.time>=p.started AND o.name IN ('checkout_started','checkout_intent') AND COALESCE(json_extract(o.details,'$.flavor_id'),json_extract(o.details,'$.flavour'),'')=p.flavor AND json_extract(o.details,'$.count')=p.bars AND COALESCE(json_extract(o.details,'$.market'),'')=p.market AND COALESCE(json_extract(o.details,'$.currency'),'')=p.currency AND json_extract(o.details,'$.price')=p.price) order_time FROM selections p)
 SELECT path,variant,language,flavor,bars,market,currency,price,COUNT(DISTINCT visitor) viewers,COUNT(DISTINCT CASE WHEN order_time IS NOT NULL THEN visitor END) order_clickers,COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM checkout_intents i WHERE i.visitor=o.visitor AND i.session=o.session AND i.page=o.page AND i.version=o.variant AND i.language=o.language AND i.flavor=o.flavor AND i.bars=o.bars AND i.market=o.market AND i.price=o.price AND i.currency=o.currency AND i.time>=o.started AND i.consent_time>=o.order_time AND i.email<>'') THEN visitor END) email_signups FROM orders o GROUP BY path,variant,language,flavor,bars,market,currency,price ORDER BY viewers DESC,path`;
 const [landing,product,offers]=await Promise.all([query(landingSql),query(productSql),query(offerSql)]);
 const include=(v,l)=>(variant==='all'||variant===v)&&(language==='all'||language===l);
 const complete=(rows,page)=>{
  const all=concepts.flatMap(v=>languages.filter(l=>include(v,l)).map(l=>({path:`/${v}/${l}/${page}`,variant:v,language:l})));
  if(!page&&include('lightx','en'))all.unshift({path:'/',variant:'lightx',language:'en'});
  // Preserve the old homepage's Light attribution rather than reclassifying history.
  for(const row of rows)if(!all.some(p=>p.path===row.path&&p.variant===row.variant))all.push({path:row.path,variant:row.variant,language:row.language});
  return all.map(p=>rates({viewers:0,product_clickers:0,...(!page?{product_viewers:0}:{}),order_clickers:0,email_signups:0,...p,...rows.find(r=>r.path===p.path&&r.variant===p.variant)}));
 };
 return {unit:'unique browsers per row; stages within the same session and variant',landings:complete(landing.results,''),products:complete(product.results,'product/'),offers:offers.results.map(row=>rates({...row,product_clickers:0}))};
}
