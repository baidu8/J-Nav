const CACHE_NAME = 'j-nav-v1';
const ASSETS = [
  './',
  'index.html',  // 确保仓库里文件名确实是这个
  'style.css',
  'script.js',
  'data.js',
  'icons/logo.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => console.log('缓存失败的项目:', err));
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
