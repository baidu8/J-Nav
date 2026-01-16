const CACHE_NAME = 'j-nav-v4'; // 建议升级版本号
// 如果域名是 daye.gv.uy 且代码在根目录，BASE_PATH 应设为 '/'
const BASE_PATH = '/'; 

const ASSETS = [
  BASE_PATH,
  'index.html',
  'style.css',
  'script.js',
  'data.js',
  'icons/logo.svg'
].map(path => path.startsWith('/') ? path : BASE_PATH + path);

/* 安装：预缓存资源 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // 强制跳过等待，直接激活
  );
});

/* 激活：清理旧缓存 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim()) // 立即接管所有页面
  );
});

/* 策略：网络优先 (Stale-While-Revalidate) 
   这种策略比单纯的缓存优先更适合导航类网站，既能秒开又能保证更新 */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // 更新缓存
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
        }
        return networkResponse;
      }).catch(() => {
        // 网络失败逻辑
        return cachedResponse; 
      });

      // 如果有缓存则返回缓存，同时在后台更新；如果没有缓存则等待网络
      return cachedResponse || fetchPromise;
    }).catch(() => {
      // 离线兜底：如果是页面跳转失败，返回首页
      if (event.request.mode === 'navigate') {
        return caches.match(BASE_PATH + 'index.html');
      }
    })
  );
});