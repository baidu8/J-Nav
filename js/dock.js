(function() {
    // --- 1. 基础变量与 Dock 逻辑 ---
    const dock = document.getElementById('bottom-dock');
    const items = document.querySelectorAll('.dock-item');
    const isMobile = () => window.innerWidth <= 768;

    if (dock) {
        dock.addEventListener('mousemove', (e) => {
            if (isMobile()) return;
            const mouseX = e.clientX;
            items.forEach(item => {
                const rect = item.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const distance = Math.abs(mouseX - centerX);
                if (distance < 120) {
                    const cosFactor = Math.cos((distance / 120) * (Math.PI / 2));
                    const scale = 1 + 0.5 * cosFactor;
                    item.style.transform = `scale(${scale}) translateY(-${(scale - 1) * 15}px)`;
                } else {
                    item.style.transform = "scale(1) translateY(0)";
                }
            });
        });
        dock.addEventListener('mouseleave', () => {
            items.forEach(item => item.style.transform = "scale(1) translateY(0)");
        });
    }

    window.toggleDock = () => dock && dock.classList.toggle('active');

    // --- 2. 核心：多窗口管理系统 (支持混合模式) ---
    let windowCount = 0;
    let topZIndex = 10000;
    const urlMap = {}; 

    window.openWin = function(target, title = "应用窗口") {
        const isUrl = typeof target === 'string';
        const winKey = isUrl ? target : (target.id || title);

        // 1. 检查是否已存在
        if (urlMap[winKey]) {
            const existingWin = document.getElementById(urlMap[winKey]);
            if (existingWin) {
                if (existingWin.style.display === 'none' || existingWin.style.opacity === "0") {
                    existingWin.style.display = 'flex';
                    setTimeout(() => {
                        existingWin.style.opacity = "1";
                        existingWin.style.transform = "scale(1) translateY(0)";
                        existingWin.style.zIndex = ++topZIndex;
                    }, 10);
                } else {
                    minimizeSpecificWin(existingWin.id);
                }
                return;
            }
        }

        windowCount++;
        topZIndex++;
        const winId = `win-id-${windowCount}`;
        urlMap[winKey] = winId;

        const win = document.createElement('div');
        win.id = winId;
        win.className = 'win-container';
        
        if (!isMobile()) {
            const initW = Math.min(Math.max(window.innerWidth * 0.6, 600), 1200);
            const initH = Math.min(Math.max(window.innerHeight * 0.6, 600), 800);
            win.style.width = initW + 'px';
            win.style.height = initH + 'px';
            const topPos = (window.innerHeight - initH) / 3.5;
            win.style.top = (topPos + (windowCount % 6 * 20)) + 'px';
            win.style.left = (window.innerWidth - initW) / 2 + (windowCount % 6 * 20) + 'px';
        }

        win.style.display = 'flex';

        // 生成内部 HTML
        let bodyContent = isUrl 
            ? `<div class="win-loading" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#666; font-size:12px;">加载中...</div>
               <iframe src="${target}" style="width:100%; height:100%; border:none;" onload="this.previousElementSibling.style.display='none'"></iframe>`
            : `<div class="win-div-content" style="height:100%; overflow-y:auto; padding:15px; box-sizing:border-box; background:#fff;">${target.content || ''}</div>`;

        win.innerHTML = `
            <div class="win-header">
                <div class="win-controls-left">
                    <button class="win-btn refresh-btn" onclick="refreshSpecificWin('${winId}', this)">
                        <span class="refresh-icon"></span>
                    </button>
                </div>
                <div class="win-title">${title}</div>
                <div class="win-controls-right">
                    <button class="win-btn minimize" onclick="minimizeSpecificWin('${winId}')">−</button>
                    <button class="win-btn maximize" onclick="toggleSpecificMaximize('${winId}')">▢</button>
                    <button class="win-btn close" onclick="closeSpecificWin('${winId}')">×</button>
                </div>
            </div>
            <div class="win-body">${bodyContent}</div>
            <div class="resizer t"></div><div class="resizer b"></div>
            <div class="resizer l"></div><div class="resizer r"></div>
            <div class="resizer tl"></div><div class="resizer tr"></div>
            <div class="resizer bl"></div><div class="resizer br"></div>
        `;

        document.body.appendChild(win);
        setTimeout(() => {
            win.style.opacity = "1";
            win.style.transform = "scale(1) translateY(0)";
        }, 10);

        win.onmousedown = () => { win.style.zIndex = ++topZIndex; };
        attachWinEvents(win);
        updateDockStatus();
        if (isMobile() && dock) dock.classList.remove('active');
    };

    // --- 3. 核心控制函数 (修复关闭逻辑) ---
    window.closeSpecificWin = (id) => {
        const target = document.getElementById(id);
        if (target) {
            // 彻底清理 urlMap，防止无法再次打开
            for (let key in urlMap) {
                if (urlMap[key] === id) {
                    delete urlMap[key];
                    break;
                }
            }
            target.style.opacity = "0";
            target.style.transform = "scale(0.9) translateY(20px)";
            setTimeout(() => {
                target.remove();
                updateDockStatus();
            }, 200);
        }
    };

    window.minimizeSpecificWin = (id) => {
        const target = document.getElementById(id);
        if (target) {
            target.style.opacity = "0";
            target.style.transform = "scale(0.8) translateY(100px)";
            setTimeout(() => {
                if (target.style.opacity === "0") target.style.display = 'none';
            }, 300);
        }
    };

    window.refreshSpecificWin = (id, btn) => {
        const win = document.getElementById(id);
        const frame = win.querySelector('iframe');
        const icon = btn.querySelector('.refresh-icon');
        if (icon) icon.classList.add('rotating');

        if (frame) {
            frame.src = frame.src;
            frame.onload = () => icon && icon.classList.remove('rotating');
        } else {
            setTimeout(() => icon && icon.classList.remove('rotating'), 600);
        }
    };

    window.toggleSpecificMaximize = (id) => {
        const target = document.getElementById(id);
        if (target) {
            target.classList.toggle('is-maximized');
            const rs = target.querySelectorAll('.resizer');
            rs.forEach(r => r.style.display = target.classList.contains('is-maximized') ? 'none' : 'block');
        }
    };

    function updateDockStatus() {
        const allItems = document.querySelectorAll('.dock-item');
        allItems.forEach(item => {
            const onclickAttr = item.getAttribute('onclick') || "";
            let isRunning = false;
            for (let key in urlMap) {
                if (onclickAttr.includes(key)) {
                    isRunning = true;
                    break;
                }
            }
            item.classList.toggle('running', isRunning);
        });
    }

    // --- 4. 辅助：示例函数 ---
    window.openGallery = function() {
        // 1. 获取你的 JS 数据源
        const lib = window.wallpaperLib || {};
        const titles = { 
                bing: '收藏的api接口', 
                effects: '特效背景', 
                history: '必应壁纸',
                dynamic: '精选动态壁纸',
                xiran: '惜染壁纸',
                xrfj4k: '惜染风景4k',
                shouji: '手机端', 
        								xiransj: '惜染手机端壁纸',
                zipai: '随手拍', 
                custom: '自定义设置', 
                local: '上传记录' 
            };
        // 如果你想指定只看 'bing' 和 'zipai'，可以手动定义这个数组：
        // const categories = ['bing', 'zipai', 'xiran', 'xrfj4k'];
        const categories = Object.keys(lib).filter(key => !['effects', 'dynamic', 'custom'].includes(key));
    
        openWin({
            id: 'photo-gallery',
            content: `
                <div class="gallery-wrapper">
                    <div class="gallery-aside">
                        ${categories.map((cat, index) => `
                            <div class="aside-item ${index === 0 ? 'active' : ''}" 
                                 onclick="window.switchGalleryCategory('${cat}', this)">
                                 ${titles[cat] || cat} 
                            </div>
                        `).join('')}
                    </div>
                    <div id="gallery-main-grid" class="gallery-main"></div>
                </div>
            `
        }, '高清壁纸库');
    
        setTimeout(() => window.switchGalleryCategory(categories[0]), 50);
    };
    
    window.switchGalleryCategory = function(category, element) {
        const grid = document.getElementById('gallery-main-grid');
        const lib = window.wallpaperLib || {};
        if (!grid || !lib[category]) return;
    
        // 1. 切换左侧高亮样式
        if (element) {
            element.parentElement.querySelectorAll('.aside-item').forEach(s => s.classList.remove('active'));
            element.classList.add('active');
        }
    
        const dataList = lib[category];
        grid.style.opacity = '0';
    
        setTimeout(() => {
            grid.innerHTML = dataList.map(item => {
                const isVideo = item.url.toLowerCase().endsWith('.mp4');
                
                // --- ✨ 核心逻辑：智能缩略图处理 ---
                let thumbUrl = item.thumb || item.url;
                
                // 检测是否为惜染镜像站链接
                if (thumbUrl.includes('xiranimg.com')) {
                    // 如果已经是压缩链接则跳过，否则进行拼接
                    if (!thumbUrl.includes('action=file')) {
                        thumbUrl = thumbUrl.replace('https://xiranimg.com/', 'https://xiranimg.com/index.php?action=file&file=');
                        thumbUrl += '&resize=320';
                    }
                }
                // -----------------------------------
    
                return `
                    <div class="photo-card">
                        ${isVideo ? 
                            `<div class="video-placeholder">🎥 视频</div>` :
                            `<img src="${thumbUrl}" 
                                  loading="lazy" 
                                  onload="this.classList.add('loaded')"
                                  onclick="window.zoomPhoto('${item.url}')" 
                                  onerror="this.src='https://via.placeholder.com/200?text=Error'">`
                        }
                        <div class="photo-info">${item.name}</div>
                    </div>
                `;
            }).join('');
            grid.style.opacity = '1';
        }, 150);
    };

    // --- 5. 交互逻辑 (拖拽/拉伸/触摸) ---
    function attachWinEvents(win) {
        const header = win.querySelector('.win-header');
        const iframe = win.querySelector('iframe');
        
        const startInteraction = (e, type, dir = '') => {
            if (win.classList.contains('is-maximized')) return;
            if (iframe) iframe.style.pointerEvents = 'none';
            
            const startX = e.clientX || e.touches?.[0].clientX;
            const startY = e.clientY || e.touches?.[0].clientY;
            const startRect = win.getBoundingClientRect();

            const onMoving = (ev) => {
                const cx = ev.clientX || ev.touches?.[0].clientX;
                const cy = ev.clientY || ev.touches?.[0].clientY;
                if (type === 'drag') {
                    win.style.left = startRect.left + (cx - startX) + 'px';
                    win.style.top = startRect.top + (cy - startY) + 'px';
                } else {
                    if (dir.includes('r')) win.style.width = Math.max(200, startRect.width + (cx - startX)) + 'px';
                    if (dir.includes('b')) win.style.height = Math.max(150, startRect.height + (cy - startY)) + 'px';
                    if (dir.includes('l')) {
                        win.style.width = Math.max(200, startRect.width - (cx - startX)) + 'px';
                        win.style.left = startRect.left + (cx - startX) + 'px';
                    }
                    if (dir.includes('t')) {
                        win.style.height = Math.max(150, startRect.height - (cy - startY)) + 'px';
                        win.style.top = startRect.top + (cy - startY) + 'px';
                    }
                }
            };

            const onEnd = () => {
                if (iframe) iframe.style.pointerEvents = 'auto';
                document.removeEventListener('mousemove', onMoving);
                document.removeEventListener('mouseup', onEnd);
                document.removeEventListener('touchmove', onMoving);
                document.removeEventListener('touchend', onEnd);
            };

            document.addEventListener('mousemove', onMoving);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMoving, {passive: false});
            document.addEventListener('touchend', onEnd);
        };

        header.onmousedown = (e) => startInteraction(e, 'drag');
        header.ontouchstart = (e) => startInteraction(e, 'drag');
        win.querySelectorAll('.resizer').forEach(r => {
            const d = Array.from(r.classList).find(c => c !== 'resizer');
            r.onmousedown = (e) => { e.preventDefault(); startInteraction(e, 'resize', d); };
            r.ontouchstart = (e) => { if (e.cancelable) e.preventDefault(); startInteraction(e, 'resize', d); };
        });
    }
})();
// 看图
window.zoomPhoto = function(imgSrc) {
    // 找到当前相册窗口的 body
    const galleryWin = document.getElementById('win-id-1'); // 或者通过 id: 'photo-gallery' 找
    if (!galleryWin) return;
    const winBody = galleryWin.querySelector('.win-body');

    // 创建大图预览层
    const overlay = document.createElement('div');
    overlay.id = 'photo-zoom-overlay';
    // 样式：黑色半透明背景，全窗口覆盖，点击即关闭
    Object.assign(overlay.style, {
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, cursor: 'zoom-out',
        opacity: 0, transition: 'opacity 0.3s ease'
    });

    overlay.innerHTML = `
        <img src="${imgSrc}" style="max-width:95%; max-height:95%; object-fit:contain; border-radius:4px; box-shadow:0 0 20px rgba(0,0,0,0.5);">
        <div style="position:absolute; top:15px; right:15px; color:white; font-size:24px;">×</div>
    `;

    // 点击背景或大图，关闭预览
    overlay.onclick = () => {
        overlay.style.opacity = 0;
        setTimeout(() => overlay.remove(), 300);
    };

    winBody.appendChild(overlay);
    setTimeout(() => overlay.style.opacity = 1, 10);
};
// 监听全局滚轮事件
document.addEventListener('wheel', function(e) {
    // 1. 检查鼠标当前是不是在“窗口”或者“相册网格”里面
    const isInsideWindow = e.target.closest('.win-body, .gallery-main, .modal-body');

    if (isInsideWindow) {
        // 2. 如果在窗口里，我们手动控制滚动，并阻止它“传给”背景
        const container = e.target.closest('.win-body, .gallery-main, .modal-body');
        
        // 计算滚动位置
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const height = container.clientHeight;
        const delta = e.deltaY;

        // 3. 核心：如果已经滚到顶还往上滚，或者滚到底还往下滚
        // 或者只要在窗口里，就切断冒泡，不让背景的 .nt-scroll-area 响应
        if ((delta < 0 && scrollTop <= 0) || (delta > 0 && scrollTop + height >= scrollHeight)) {
            e.preventDefault(); // 强行拉住，不让背景动
        }
        
        // 阻止事件冒泡到 .nt-scroll-area
        e.stopPropagation();
    }
}, { passive: false }); // 必须加 false，否则无法 preventDefault