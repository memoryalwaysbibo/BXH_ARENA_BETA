'use strict';

const STATIC_CACHE='bxh-arena-static-v2';

self.addEventListener('install',event=>{
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('bxh-arena-static-')&&key!==STATIC_CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

function isStaticRequest(request,url){
  if(request.method!=='GET') return false;
  if(url.origin!==self.location.origin) return false;
  if(request.mode==='navigate') return false;
  const path=url.pathname.toLowerCase();
  return /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|webmanifest|woff2?)$/.test(path);
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(!isStaticRequest(request,url)) return;

  event.respondWith((async()=>{
    const cache=await caches.open(STATIC_CACHE);
    const cached=await cache.match(request);
    const networkPromise=fetch(request).then(async response=>{
      if(response&&response.ok){
        try{await cache.put(request,response.clone());}catch(e){}
      }
      return response;
    }).catch(()=>null);

    if(cached){
      event.waitUntil(networkPromise);
      return cached;
    }
    const network=await networkPromise;
    return network||Response.error();
  })());
});
