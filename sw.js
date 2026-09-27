/* えいご練習: オフライン用のサービスワーカー
   - 初回（オンライン時）にアプリ一式を端末に保存する
   - index.html はネット優先: つながれば最新版を取って保存し直す。つながらなければ保存した版を使う
   - アイコンなどは保存した版を優先
   アップデートは index.html を差し替えるだけで届く（このファイルの VERSION を変える必要はない） */
const VERSION="eigo-v1";
const FILES=["./","./index.html","./manifest.webmanifest","./icon-180.png","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET"||new URL(req.url).origin!==location.origin)return;
  const isPage=req.mode==="navigate"||/\/(index\.html)?$/.test(new URL(req.url).pathname);
  if(isPage){
    // ネット優先。電波が弱くて3秒以内に返ってこなければ保存した版を出す
    e.respondWith((async()=>{
      const cache=await caches.open(VERSION);
      const net=fetch(req,{cache:"no-store"}).then(res=>{if(res.ok)cache.put("./index.html",res.clone());return res});
      const timeout=new Promise(r=>setTimeout(r,3000));
      try{
        const res=await Promise.race([net,timeout]);
        if(res)return res;
      }catch(err){}
      const saved=await cache.match("./index.html");
      return saved||net;
    })());
    return;
  }
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{
    if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(req,cp))}
    return res;
  })));
});
