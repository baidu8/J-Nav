const CACHE_NAME = 'j-nav-v5';
// 既然域名是 daye.gv.uy，根路径就是 /
const BASE_PATH = '/'; 

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/data.js',
  '/icons/logo.svg'
];

/* 安装：预缓存资源 */
self.addEventListener('install', event => {
  // 强制跳过等待，让新 SW 立即接管
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 使用 try-catch 避免其中一个文件 404 导致整个安装失败
      return cache.addAll(ASSETS).catch(err => console.error('预缓存失败:', err));
    })
  );
});

/* 激活：清理旧缓存 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

/* 拦截请求：网络优先策略 (解决样式不加载的问题) */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 如果网络请求成功，存入缓存并返回
        if (response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => {
        // 网络失败时，尝试从缓存读取
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // 如果是页面导航且离线，返回首页
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
