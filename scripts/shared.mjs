export const footer=(variant)=>{const root=`/${variant}/en/`;const slogan={light:"Feel light.<br>Every day.",psyllium:"Psyllium husk.<br>Now tastes great.",boom:"Fiber. Water. Boom."}[variant];return `<footer class="site-footer"><div class="footer-main"><div class="footer-brand"><a class="footer-home" href="${root}" aria-label="FiberBoom home"><img src="/assets/footer-logo-v5-be2bf9b2381a.webp" alt="FiberBoom" width="140" height="105" loading="lazy"></a><p class="footer-slogan">${slogan}</p></div><div class="footer-company"><span class="footer-label">FIBERBOOM</span><address>Svanevej 22<br>2400 København, Denmark</address></div><div class="footer-contact"><span class="footer-label">GET IN TOUCH</span><a href="mailto:contact@fiberboom.com">contact@fiberboom.com ↗</a></div></div><div class="footer-bottom"><small>© 2026 Fiberboom. All rights reserved.</small><div class="footer-legal"><a href="/privacy/en/">Privacy policy</a><a href="/terms/en/">Terms &amp; conditions</a></div></div></footer>`;};
export const marketControl=`<label class="locale-control"><span>Country / currency <small>· English</small></span><select id="market" aria-label="Country and currency"><option value="DE">Germany · EUR</option><option value="PL">Poland · PLN</option></select></label>`;
export function applyShared(html){
 const path=html.match(/rel="canonical" href="https:\/\/fiberboom.com\/([^/]+)\//)?.[1];const variant=['light','psyllium','boom'].includes(path)?path:'light';
 html=html.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/,footer(variant));
 html=html.replace(/<link[^>]+rel="icon"[^>]*>/g,'');
 html=html.replace('</head>','<link rel="icon" type="image/svg+xml" href="/favicon.svg"></head>');
 if(!html.includes('href="/legal-links.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/legal-links.css"></head>');
 if(html.includes('</header>'))html=html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/,header=>header.includes('class="button')?header.replace(/(<a class="button[^>]*>)/,marketControl+'$1'):header.replace('</header>',marketControl+'</header>'));
 return html.replace('</body>','<script type="module" src="/market.js"></script></body>');
}
