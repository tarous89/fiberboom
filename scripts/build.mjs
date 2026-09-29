import {cp,rm,access} from 'node:fs/promises';
await access('site/index.html');
await rm('dist',{recursive:true,force:true});
await cp('site','dist',{recursive:true});
console.log('Built Fiberboom: Light homepage, three English variants, privacy, terms and checkout notice.');
