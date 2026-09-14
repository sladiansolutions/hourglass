/* Hourglass service worker.
   Job: make the app open offline and start instantly. Nothing else.
   Bump CACHE on every deploy or browsers will keep serving the old shell. */

var CACHE = "hourglass-v2";

var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(SHELL); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){
        return Promise.all(keys.map(function(k){
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function(){ return self.clients.claim(); })
  );
});

/* Navigations: network first so a deploy is picked up, cache as the fallback.
   Everything else: cache first, since the shell is static. */
self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;

  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;   // the webfont is best-effort

  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req)
        .then(function(res){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put("./index.html", copy); });
          return res;
        })
        .catch(function(){
          return caches.match("./index.html").then(function(r){ return r || Response.error(); });
        })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && res.status === 200 && res.type === "basic"){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    }).catch(function(){ return Response.error(); })
  );
});

/* Tapping a nudge should land you back in the app, not open a second copy. */
self.addEventListener("notificationclick", function(e){
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(list){
      for(var i = 0; i < list.length; i++){
        if("focus" in list[i]) return list[i].focus();
      }
      if(self.clients.openWindow) return self.clients.openWindow("./index.html");
    })
  );
});
