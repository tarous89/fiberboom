// Ad-only entry routes. Static version URLs and the homepage are unaffected.
export const experimentVersions=['light','psyllium','boom','lightx','psylliumx','boomx'];
const duration=90*86400;
export function assignment(cookie,language,now=Date.now(),random=()=>crypto.getRandomValues(new Uint32Array(1))[0]){
 const key=`fb_experiment_v1_${language}`;
 const value=cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(key+'='))?.slice(key.length+1)||'';
 const [version,expires]=value.split('.');
 if(experimentVersions.includes(version)&&/^\d+$/.test(expires)&&Number(expires)>now&&Number(expires)<=now+duration*1000)return {version,key,value,fresh:false};
 // Rejection sampling avoids modulo bias and gives every version exactly 1/6 probability.
 const limit=Math.floor(2**32/experimentVersions.length)*experimentVersions.length;
 let n;do{n=random()}while(n>=limit);
 const selected=experimentVersions[n%experimentVersions.length];
 return {version:selected,key,value:`${selected}.${now+duration*1000}`,fresh:true};
}
export async function randomLanding(request,env,language){
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
 const selected=assignment(request.headers.get('Cookie'),language);
 const target=new URL(request.url);target.pathname=`/${selected.version}/${language}/`;
 const assetRequest=new Request(target,request);for(const name of ['If-None-Match','If-Modified-Since','Range','If-Range'])assetRequest.headers.delete(name);
 const asset=await env.ASSETS.fetch(assetRequest);
 const headers=new Headers(asset.headers);
 headers.set('Cache-Control','private, no-store');headers.set('Vary','Cookie');
 headers.delete('ETag');headers.delete('Last-Modified');
 if(asset.status===200&&selected.fresh)headers.append('Set-Cookie',`${selected.key}=${selected.value}; Path=/; Max-Age=${duration}; HttpOnly; Secure; SameSite=Lax`);
 return new Response(request.method==='HEAD'?null:asset.body,{status:asset.status,headers});
}
