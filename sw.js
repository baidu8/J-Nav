const CACHE_NAME = 'j-nav-pro-v2'; // 升级版本号以触发更新
const PRE_CACHE_ASSETS = [
    '/',
    'index.html',
    'style.css',
    'script.js',
    'data.js',
    'icons/logo.svg'
];

// 透明 1x1 像素占位图，用于替换加载失败的图标
const EMPTY_IMAGE_BASE64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/* 安装阶段 */
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRE_CACHE_ASSETS))
    );
});

/* 激活阶段 */
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

/* 拦截请求 */
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const request = event.request;
    const isImage = request.destination === 'image';

    event.respondWith(
        caches.match(request).then(cachedResponse => {
            // 发起网络请求作为更新逻辑
            const fetchPromise = fetch(request).then(networkResponse => {
                // 如果请求成功，更新缓存
                if (networkResponse.ok || networkResponse.type === 'opaque') {
                    updateCache(request, networkResponse.clone());
                }
                return networkResponse;
            }).catch(error => {
                // --- 核心修复：网络失败时的逻辑 ---
                
                // 如果是图片请求失败，返回 404 状态
                        // 既能消灭浏览器重试导致的红字报错，又能触发页面的 onerror 显示首字
                        if (isImage) {
                            return new Response('Icon not found', {
                                status: 404,
                                statusText: 'Not Found'
                            });
                        }
                // 如果是其他资源，且没有缓存，这里可以抛出错误或返回默认响应
                console.log('Fetch failed:', request.url);
            });

            // 优先返回缓存实现秒开，没缓存则返回 fetch 任务
            return cachedResponse || fetchPromise;
        })
    );
});

/**
 * 辅助函数：更新缓存并处理 data.js 通知
 */
async function updateCache(request, response) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);

    // 如果 data.js 更新了，通知页面弹出“发现新内容”气泡
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