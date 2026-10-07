export async function engagementReport(db,where,args){
 const filtered=`WITH filtered AS (SELECT * FROM events WHERE ${where})`;
 const query=sql=>db.prepare(sql).bind(...args).all();
 const [totals,details,ctas]=await Promise.all([
  query(`${filtered} SELECT
   COUNT(DISTINCT CASE WHEN path LIKE '%/product/' AND name IN ('page_view','product_view') THEN visitor END) product_viewers,
   COUNT(DISTINCT CASE WHEN path LIKE '%/product/' AND name IN ('checkout_started','checkout_intent') THEN visitor END) order_clickers,
   COUNT(DISTINCT CASE WHEN name='checkout_intent' AND EXISTS(SELECT 1 FROM checkout_intents i WHERE i.id=filtered.id AND i.email<>'' AND i.consent_time IS NOT NULL) THEN visitor END) email_signups
   FROM filtered`),
  query(`${filtered}, opens AS (SELECT *,json_extract(details,'$.section') section FROM filtered WHERE name='product_detail_open'),
   outcomes AS (SELECT o.*,EXISTS(SELECT 1 FROM filtered c WHERE c.visitor=o.visitor AND c.session=o.session AND c.page=o.page AND c.path=o.path AND c.name IN ('checkout_started','checkout_intent') AND (c.time>o.time OR (c.time=o.time AND c.seq>o.seq))) ordered FROM opens o)
   SELECT section,COUNT(*) opens,COUNT(DISTINCT visitor) browsers,COUNT(DISTINCT CASE WHEN ordered THEN visitor END) order_clickers FROM outcomes GROUP BY section ORDER BY browsers DESC`),
  query(`${filtered} SELECT name,COALESCE(json_extract(details,'$.section'),json_extract(details,'$.label'),name) label,COUNT(*) count,COUNT(DISTINCT visitor) browsers FROM filtered WHERE name IN ('cta_click','product_click','checkout_started','product_detail_open') GROUP BY name,label ORDER BY browsers DESC`)
 ]);
 return {totals:totals.results[0],details:details.results,ctas:ctas.results};
}
