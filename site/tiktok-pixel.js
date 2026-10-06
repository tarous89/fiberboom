// Share the existing advertising choice without modifying Google tracking or the UI.
(()=>{
 if(location.pathname.startsWith('/admin'))return;
 const storageKey='fb_google_ads_consent_v1';
 let approved=false,loaded=false;
 function enable(){
  if(loaded){window.ttq.grantConsent();return;}
  loaded=true;
  // TikTok Pixel Code Start
  !function (w, d, t) {
    w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
    var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
    ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
    ttq.load('DB2BIJBC77U04C8M35B0');
    ttq.page();
  }(window, document, 'ttq');
  // TikTok Pixel Code End
 }
 function landing(){return !document.body?.dataset.commercePage&&/^\/(?:$|(?:en|de|pl)\/?$|(?:lightx|boomx|psylliumx|light|boom|psyllium)\/(?:en|de|pl)\/?$)/.test(location.pathname);}
 function conversion(destination){
  if(!approved||!landing())return;
  let url;try{url=new URL(destination,location.origin)}catch{return;}
  if(url.origin!==location.origin||!/^\/(lightx|boomx|psylliumx|light|boom|psyllium)\/(en|de|pl)\/product\/?$/.test(url.pathname))return;
  // Product interest, sent on the landing CTA; never a purchase or checkout event.
  window.ttq.track('ViewContent',{content_type:'product',content_name:'FiberBoom',page_variant:document.body?.dataset.version||'lightx',page_language:document.documentElement.lang});
 }
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');approved=saved?.approved===true&&saved.expires>Date.now()}catch{}
 // Capture links before navigation. Button-based navigation emits fb:commerce instead.
 document.addEventListener('click',e=>{
  const link=e.target.closest?.('a[href]');
  if(link&&!link.matches('[data-flavour],#availability'))conversion(link.href);
 },true);
 document.addEventListener('fb:commerce',e=>{if(e.detail?.name==='product_click')conversion(e.detail.details?.destination)});
 document.addEventListener('click',e=>{
  const button=e.target.closest?.('button');
  if(button?.id==='fb-beta-notice-approve'){approved=true;enable()}
  else if(button?.id==='fb-beta-notice-decline'){approved=false;if(loaded)window.ttq.revokeConsent()}
 });
 if(approved)enable();
})();
