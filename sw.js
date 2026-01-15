const CACHE_NAME = 'j-nav-v1';
// 你想要离线也能访问的文件
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './data.js',
  './icons/logo.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});