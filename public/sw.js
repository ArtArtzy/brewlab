self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
// Private HTML and API responses are deliberately never cached.
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin===self.location.origin&&(u.pathname.startsWith('/icons/')||u.pathname==='/icon.svg'))e.respondWith(caches.open('brew-lab-static-v1').then(async c=>(await c.match(e.request))||fetch(e.request).then(r=>{if(r.ok)c.put(e.request,r.clone());return r;})));});
