(()=>{const variant=['light','psyllium','boom'].includes(location.pathname.split('/')[1])?location.pathname.split('/')[1]:'light';const flavors={'Dark Chocolate':'chocolate','Dates & Nuts':'date','Pistachio':'pistachio'};
 function target(el){const query=new URLSearchParams();query.set('flavor',flavors[el?.dataset.flavour||document.querySelector('#flavour')?.value]||'chocolate');query.set('bars',document.querySelector('[data-count].selected')?.dataset.count||'14');const current=new URLSearchParams(location.search);for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'])if(current.has(key))query.set(key,current.get(key));return `/${variant}/en/product/?${query}`}
 document.querySelectorAll('a[href="#shop"]').forEach(a=>{a.href=target(a)});
 document.addEventListener('click',e=>{const el=e.target.closest?.('[data-flavour],#availability');if(!el)return;e.preventDefault();e.stopImmediatePropagation();location.assign(target(el))},true);
})();
