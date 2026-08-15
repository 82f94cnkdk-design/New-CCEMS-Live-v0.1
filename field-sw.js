const CACHE="ccems-estate-field-journal-live-v16";
const ASSETS=["./field-journal.html","./field-journal.css","./field-approved.css","./field-fit.css","./journal-app.js","./field-screen-standby.png","./field-screen-welcome.png","./field-screen-login.png","./field-manifest.webmanifest","./crown-cross-monogram-exact-v3.png","./ccems-field-icon-v2.png"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match("./field-journal.html"))))});
