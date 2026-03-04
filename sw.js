// 1. 升级版本号，确保新加入的日历逻辑能立即生效
const CACHE_NAME = 'j-nav-v5'; 

const PRE_CACHE_ASSETS = [
    '/',
    'index.html',
    'style.css',
    'script.js',
    'data.js',
    'icons/logo.svg',
    'icons/baidu.svg',
    'icons/bing.svg',
    'icons/google.svg',
    'icons/favicon.svg',
    'icons/logo.png',
    'icons/baidu.png',
    'icons/bing.png',
    'icons/google.png',
    'icons/favicon.ico',
    'new.html',
    'newtab.css',
    'newtab.js',
    'wallpaper-data.js',
    '/effects/matrix.html',
    '/effects/sakura.html',
    '/effects/xuehua.html',
    '/effects/yanhua.html',
    '/effects/img/樱花.png',
    '/effects/img/yinghua.jpg'
];

const EMPTY_IMAGE_BASE64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/* 安装阶段 */
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(PRE_CACHE_ASSETS);
        })
    );
});

/* 激活阶段 - 清理旧缓存 */
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

/* 拦截请求 - 策略：Stale-while-revalidate (先用缓存，后台更新) */
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const request = event.request;
    const url = new URL(request.url);

    // 针对统计类、天气 API 等不需要缓存的地址进行排除
    if (url.hostname.includes('wttr.in') || url.hostname.includes('api.')) {
        return;
    }

    event.respondWith(
        caches.match(request).then(cachedResponse => {
            const fetchPromise = fetch(request).then(networkResponse => {
                // 成功响应则更新缓存
                if (networkResponse.ok || networkResponse.type === 'opaque') {
                    updateCache(request, networkResponse.clone());
                }
                return networkResponse;
            }).catch(error => {
                // 图片加载失败处理
                if (request.destination === 'image') {
                    return new Response('Icon not found', { status: 404 });
                }
                console.log('离线模式且无缓存:', request.url);
            });

            return cachedResponse || fetchPromise;
        })
    );
});

/**
 * 智能更新缓存
 */
async function updateCache(request, response) {
    const cache = await caches.open(CACHE_NAME);
    
    // 保持你原有的 data.js 内容比对逻辑，这非常棒
    if (request.url.includes('data.js')) {
        try {
            const oldResponse = await cache.match(request);
            const responseToStore = response.clone();
            const newText = await response.text(); 

            if (oldResponse) {
                const oldText = await oldResponse.text();
                if (oldText !== newText) {
                    await cache.put(request, responseToStore);
                    notifyUpdate(request.url);
                }
            } else {
                await cache.put(request, responseToStore);
            }
        } catch (e) {
            await cache.put(request, response.clone());
        }
        return;
    }

    await cache.put(request, response);
}

async function notifyUpdate(url) {
    const allClients = await self.clients.matchAll();
    allClients.forEach(client => {
        client.postMessage({
            type: 'UPDATE_AVAILABLE',
            file: url
        });
    });
}