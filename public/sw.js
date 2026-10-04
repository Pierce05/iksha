const C='sach-v3';
const A=['./','index.html','sach-wire.js','config.js','engine.bundle.js','fonts.css','fonts/Mukta-400.woff2','fonts/Mukta-600.woff2','fonts/Mukta-700.woff2','fonts/RozhaOne-400.woff2','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>Promise.allSettled(A.map(u=>c.add(u)))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
 if(u.pathname.startsWith('/api/')||e.request.method!=='GET'||u.origin!==location.origin)return; // never cache API or third-party
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const k=r.clone();caches.open(C).then(c=>c.put(e.request,k))}return r}).catch(()=>caches.match(e.request)))});
