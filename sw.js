const CACHE_NAME = 'j-nav-v2';
const ASSETS = [
  './',          // 更加稳妥的首页指向
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
    caches.open(CACHE_NAME).then(cache => {
      // 使用 map 尝试一个一个加载，防止其中一个 404 导致全部失败
      return Promise.all(
        ASSETS.map(url => {
          return cache.add(url).catch(err => console.log('资源缓存失败:', url, err));
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});