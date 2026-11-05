// ===== 용돈 기록장(중3 버전) 서비스워커 =====
// 앱을 고친 뒤 다시 올릴 때는 아래 버전 숫자를 하나 올려 주세요. (v1 → v2)
// 같은 GitHub 계정의 다른 앱 저장본은 지우지 않도록 이름 앞부분(접두어)으로 구분합니다.
const CACHE_PREFIX = 'pocket-money-teen-';
const CACHE_NAME = CACHE_PREFIX + 'v3';

// 처음 설치할 때 미리 저장해 둘 내 파일들 (오프라인용)
const CORE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// 1) 설치: 핵심 파일을 캐시에 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
      .catch((err) => console.error('[SW] 설치 중 캐시 실패:', err))
  );
});

// 2) 활성화: 옛날 버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 3) 요청 처리
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 화면(HTML)은 "인터넷 먼저" → 고친 내용이 바로 반영되고, 인터넷이 없으면 저장본 사용
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 그 밖의 파일(아이콘, Tailwind, 글꼴)은 "저장본 먼저, 뒤에서 새로 받아 갱신"
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached); // 인터넷 없으면 저장본
      return cached || network;
    })
  );
});
