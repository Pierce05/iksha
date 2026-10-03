const C='sach-v1';const A=['./','index.html','styles.css','app.js','config.js','ui-strings.js','manifest.webmanifest','icon-192.png','icon-512.png',"fixtures/ledgers/kavita.json", "fixtures/ledgers/praveen.json", "fixtures/ledgers/control-a.json", "fixtures/ledgers/control-b.json", "fixtures/inputs/kavita.txt", "fixtures/inputs/praveen.txt", "fixtures/inputs/control-a.txt", "fixtures/inputs/control-b.txt"];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A))));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.pathname.startsWith('/api/')||e.request.method!=='GET')return;
 e.respondWith(fetch(e.request).then(r=>{const k=r.clone();caches.open(C).then(c=>c.put(e.request,k));return r}).catch(()=>caches.match(e.request)))});
