const CACHE_NAME = 'j-nav-pro-v1';
const ICON_HOST = 'icons.duckduckgo.com';

const PRE_CACHE_ASSETS = [
  '/',           // 这个保留，代表首页
  'index.html',  // 去掉斜杠
  'style.css',   // 去掉斜杠
  'script.js',   // 去掉斜杠
  'data.js',     // 去掉斜杠
  'icons/logo.svg' // 去掉斜杠
];

/* 安装阶段：强制缓存核心资源 */
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRE_CACHE_ASSETS))
  );
});

/* 激活阶段：清理旧版本 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

/* 拦截请求：Stale-While-Revalidate 策略 */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 策略：过时即重新验证 (Stale-While-Revalidate)
  // 适用于：HTML, JS, CSS 和 图标
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 无论是否有缓存，都发起网络请求进行更新
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse.status === 200) {
          updateCache(event.request, networkResponse);
        }
        return networkResponse;
      }).catch(() => {
        // 网络失败时的兜底逻辑
      });

      // 优先返回缓存，实现秒开；没缓存则返回网络请求
      return cachedResponse || fetchPromise;
    })
  );
});

/**
 * 辅助函数：更新缓存并通知页面
 */
async function updateCache(request, response) {
  const cache = await caches.open(CACHE_NAME);
  const copy = response.clone();
  
  // 检查内容是否真的发生了变化（简单对比校验，可选）
  await cache.put(request, copy);

  // 如果 data.js 更新了，向所有页面客户端发送通知
  if (request.url.includes('data.js')) {
    const allClients = await self.clients.matchAll();
    allClients.forEach(client => {
      client.postMessage({
        type: 'UPDATE_AVAILABLE',
        file: 'data.js'
      });
    });
  }
}