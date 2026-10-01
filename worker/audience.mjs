// Approximate edge geolocation; never persist IPs, coordinates or raw user-agent strings.
export function audience(request,context={}){
 const cf=request.cf||{},clean=v=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,100):'';
 const country=/^[A-Z]{2}$/.test(cf.country||'')&&!['XX','T1'].includes(cf.country)?cf.country:'unknown';
 const ua=request.headers.get('User-Agent')||'';let device='unknown';
 if(ua&&!/bot|crawler|spider|headless|curl|wget/i.test(ua)){
  if(/iPad|Tablet|Kindle|Silk|PlayBook/i.test(ua)||(/Android/i.test(ua)&&!/Mobile/i.test(ua))||(/Macintosh/i.test(ua)&&context.tabletHint===true))device='tablet';
  else if(/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)||request.headers.get('Sec-CH-UA-Mobile')==='?1')device='mobile';
  else if(/Windows|Macintosh|X11|CrOS|Linux/i.test(ua))device='desktop';
 }
 return {country,region:country==='unknown'?'':clean(cf.region),city:country==='unknown'?'':clean(cf.city),device};
}
