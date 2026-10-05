// Google Ads base tag. Conversion labels must come from the two Google Ads actions.
(()=>{
 if(location.pathname.startsWith('/admin'))return;
 const account='AW-18365157703';
 const conversions={product:{label:'',value:0},order:{label:'',value:10}};
 const storageKey='fb_google_ads_consent_v1';
 let approved=false,loaded=false,productSeen=document.body?.dataset.commercePage==='product';
 const sent=new Set();
 window.dataLayer=window.dataLayer||[];
 window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
 const consent=value=>({ad_storage:value,analytics_storage:value,ad_user_data:value,ad_personalization:'denied'});
 window.gtag('consent','default',consent('denied'));
 function emit(action){
  if(!approved||sent.has(action))return;
  sent.add(action);const c=conversions[action];
  // This local dataLayer event is NOT a Google Ads conversion without its label.
  window.dataLayer.push({event:'fiberboom_'+action,value:c.value,currency:'USD',page_variant:document.body?.dataset.version||'',page_language:document.documentElement.lang});
  if(c.label)window.gtag('event','conversion',{send_to:account+'/'+c.label,value:c.value,currency:'USD',transaction_id:crypto.randomUUID()});
 }
 function enable(){
  window.gtag('consent','update',consent('granted'));
  if(!loaded){loaded=true;window.gtag('js',new Date());window.gtag('config',account,{allow_ad_personalization_signals:false});const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+account;document.head.append(script)}
  if(productSeen)emit('product');
 }
 function choose(value){approved=value;try{localStorage.setItem(storageKey,JSON.stringify({approved,expires:Date.now()+90*86400000}))}catch{}if(approved)enable();else window.gtag('consent','update',consent('denied'))}
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');approved=saved?.approved===true&&saved.expires>Date.now()}catch{}
 document.addEventListener('click',e=>{const target=e.target.closest?.('button');if(target?.id==='fb-beta-notice-approve')choose(true);else if(target?.id==='fb-beta-notice-decline')choose(false);else if(target?.id==='fb-ad-settings'){const notice=document.getElementById('fb-beta-notice');if(notice){notice.hidden=false;document.getElementById('fb-beta-notice-approve')?.focus()}}});
 document.addEventListener('fb:commerce',e=>{if(document.body?.dataset.commercePage!=='product')return;if(e.detail?.name==='product_view'){productSeen=true;emit('product')}else if(e.detail?.name==='checkout_started')emit('order')});
 if(approved)enable();
})();
