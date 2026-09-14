/* 룰렛 타이머 — 오프라인 캐시
 *
 * 전략:
 *   페이지(HTML) = 네트워크 우선 → 온라인이면 항상 최신, 오프라인이면 캐시
 *   그 외(폰트 등) = 캐시 우선 → 빠르고 데이터 절약
 *
 * 이렇게 해야 코드를 고쳐서 push 했을 때 아이패드에도 반영됩니다.
 */

var CACHE = 'roulette-timer-v2';
var FILES = ['./', './index.html'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          if (k !== CACHE) return caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  // 페이지 요청: 최신을 먼저 시도하고, 실패하면 캐시로 떨어진다
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
          return res;
        })
        .catch(function () {
          return caches.match('./index.html').then(function (hit) {
            return hit || caches.match('./');
          });
        })
    );
    return;
  }

  // 나머지 자원: 캐시 우선
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        return Response.error();
      });
    })
  );
});
