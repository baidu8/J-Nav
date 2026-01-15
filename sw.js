const CACHE_NAME = 'j-nav-v2';
const ASSETS = [
  '../',          // 更加稳妥的首页指向
  'index.html',
  'style.css',
  'script.js',
  'data.js',
  'icons/logo.svg'
];

self.addEventListener('install', (e) => {
  // 强制跳过等待，让新版本立即生效
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).键，然后(cache => {
      // 使用 map 尝试一个一个加载，防止其中一个 404 导致全部失败
      return Promise.全部(
        ASSETS.map(url => {
          return cache.add(url).catch(err => console.log('资源缓存失败:', url, err));
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).键，然后(res => res || fetch(e.request))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().键，然后(keys => {
      return Promise.全部(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

