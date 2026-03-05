(function() {
    // --- 1. 基础变量与 Dock 逻辑 ---
    const dock = document.getElementById('bottom-dock');
    const items = document.querySelectorAll('.dock-item');
    const trigger = document.getElementById('dock-trigger');
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

    // --- 2. 升级版：多窗口管理系统 (支持 Dock 联动) ---
    let windowCount = 0;
    let topZIndex = 10000;
    const urlMap = {}; 

    window.openWin = function(url, title = "应用窗口") {
        if (urlMap[url]) {
            const existingWin = document.getElementById(urlMap[url]);
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
        urlMap[url] = winId;

        const win = document.createElement('div');
        win.id = winId;
        win.className = 'win-container';
        
        // ✨ 新增：根据屏幕动态调整初始大小
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

        win.innerHTML = `
            <div class="win-header">
                <div class="win-controls-left">
                    <button class="win-btn refresh-btn" onclick="refreshSpecificWin('${win.id}', this)">
                            <span class="refresh-icon"></span>
                        </button>
                </div>
                <div class="win-title">${title}</div>
                <div class="win-controls-right">
                    <button class="win-btn minimize" onclick="minimizeSpecificWin('${win.id}')">−</button>
                    <button class="win-btn maximize" onclick="toggleSpecificMaximize('${win.id}')">▢</button>
                    <button class="win-btn close" onclick="closeSpecificWin('${win.id}')">×</button>
                </div>
            </div>
            <div class="win-body">
                <div class="win-loading" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#666; font-size:12px;">加载中...</div>
                <iframe src="${url}" style="width:100%; height:100%; border:none;" onload="this.previousElementSibling.style.display='none'"></iframe>
            </div>
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
        if (isMobile()) dock.classList.remove('active');
    };

    // --- 核心控制函数 ---
    window.closeSpecificWin = (id) => {
        const target = document.getElementById(id);
        if (target) {
            for (let url in urlMap) {
                if (urlMap[url] === id) {
                    delete urlMap[url];
                    break;
                }
            }
            target.remove();
            updateDockStatus();
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

    window.refreshSpecificWin = (id) => {
        const frame = document.querySelector(`#${id} iframe`);
        if (frame) frame.src = frame.src;
    };

    window.toggleSpecificMaximize = (id) => {
        document.getElementById(id)?.classList.toggle('is-maximized');
    };

    function updateDockStatus() {
        const allItems = document.querySelectorAll('.dock-item');
        allItems.forEach(item => {
            const onclickAttr = item.getAttribute('onclick') || "";
            let isRunning = false;
            for (let url in urlMap) {
                if (onclickAttr.includes(url)) {
                    isRunning = true;
                    break;
                }
            }
            item.classList.toggle('running', isRunning);
        });
    }

    // --- 3. 拖拽与拉伸逻辑 ---
    function attachWinEvents(win) {
        const header = win.querySelector('.win-header');
        const iframe = win.querySelector('iframe');
        
        const startInteraction = (e, type, dir = '') => {
            if (win.classList.contains('is-maximized')) return;
            iframe.style.pointerEvents = 'none';
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
                    if (dir.includes('r')) win.style.width = startRect.width + (cx - startX) + 'px';
                    if (dir.includes('b')) win.style.height = startRect.height + (cy - startY) + 'px';
                    if (dir.includes('l')) {
                        win.style.width = startRect.width - (cx - startX) + 'px';
                        win.style.left = startRect.left + (cx - startX) + 'px';
                    }
                    if (dir.includes('t')) {
                        win.style.height = startRect.height - (cy - startY) + 'px';
                        win.style.top = startRect.top + (cy - startY) + 'px';
                    }
                }
            };

            const onEnd = () => {
                iframe.style.pointerEvents = 'auto';
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
        });
    }
})();
window.refreshSpecificWin = (id, btn) => {
    const frame = document.querySelector(`#${id} iframe`);
    if (frame) {
        // 让图标转起来
        const icon = btn.querySelector('.refresh-icon');
        if (icon) icon.classList.add('rotating');
        
        frame.src = frame.src;

        // iframe 加载完成后停止旋转
        frame.onload = () => {
            // 之前的加载中逻辑
            frame.previousElementSibling.style.display = 'none';
            // 停止旋转
            if (icon) icon.classList.remove('rotating');
        };
    }
};