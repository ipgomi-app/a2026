// KPP 운송견적 PWA 서비스워커
const CACHE = 'kpp-quote-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.3/babel.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting()) // 대기 없이 즉시 활성화
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))) // 모든 탭 리로드 신호
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return; // POST(시트 기록) 등은 그대로 통과
  const url = new URL(e.request.url);
  // Apps Script(통계)는 항상 네트워크 — 캐시하지 않음
  if (url.hostname.indexOf('script.google') !== -1) return;
  const isDoc = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html') || url.pathname.endsWith('manifest.json') || url.pathname.endsWith('KPP_%EC%9A%B4%EC%86%A1%EA%B2%AC%EC%A0%81_%EB%AA%A8%EB%B0%94%EC%9D%BC.html') || url.pathname.includes('운송견적_모바일');
  if (isDoc) {
    // HTML/매니페스트: 네트워크 우선(재배포 즉시 반영), 오프라인 시 캐시
    e.respondWith(
      fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // 정적 자원(아이콘·CDN 라이브러리): 캐시 우선
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return resp;
      }).catch(() => hit))
    );
  }
});
