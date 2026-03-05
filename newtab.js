document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 基础元素与变量 ---
    const featuredContainer = document.getElementById('nt-featured-content');
    const sidebarContainer = document.getElementById('nt-sidebar-content');
    const menuBtn = document.getElementById('nt-menu-btn');
    const sidebar = document.getElementById('nt-sidebar');
    const overlay = document.getElementById('nt-overlay');
    const edgeTrigger = document.getElementById('nt-edge-trigger'); 
    const body = document.body;
    const WORKER_BASE = "https://9.828111.xyz/icon?domain=";

    let isSidebarTransitioning = false;
    let hoverTimer;

    // --- 2. 侧边栏逻辑 ---
    function toggleSidebar(isOpen) {
        // 1. 状态锁：无论是开还是关，动画期间都不允许再次触发
        if (isSidebarTransitioning) return;
        
        const currentOpen = sidebar.classList.contains('open');
        if (isOpen === currentOpen) return;
    
        // 2. 删掉这一行，因为我们要废弃 hover 逻辑了
        // clearTimeout(hoverTimer); 
    
        isSidebarTransitioning = true; // ✨ 开启状态锁
    
        if (isOpen) {
            sidebar.classList.add('open');
            overlay.classList.add('show');
            body.classList.add('sidebar-open');
            menuBtn.innerText = '✕';
            
            // 打开动画结束后解锁
            setTimeout(() => { isSidebarTransitioning = false; }, 350);
        } else {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
            menuBtn.innerText = '☰';
            
            // 按钮暂时禁用，防止连点
            menuBtn.style.pointerEvents = 'none'; 
            
            setTimeout(() => {
                body.classList.remove('sidebar-open');
                menuBtn.style.pointerEvents = 'auto';
                isSidebarTransitioning = false; // ✨ 关闭动画结束后解锁
            }, 350); 
        }
    }

    const handleEdgeEnter = (e) => {
        if (e.pointerType === 'touch' || isSidebarTransitioning) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => toggleSidebar(true), 10);
    };

    const handleEnter = (e) => {
        if (isSidebarTransitioning || e.pointerType === 'touch') return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => toggleSidebar(true), 50);
    };

    const handleLeave = (e) => {
        if ((e && e.pointerType === 'touch') || isSidebarTransitioning || !sidebar.classList.contains('open')) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => toggleSidebar(false), 400); 
    };

    if (edgeTrigger) edgeTrigger.addEventListener('pointerenter', handleEdgeEnter);
    menuBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleSidebar(!sidebar.classList.contains('open'));
    };
    menuBtn.addEventListener('pointerenter', handleEnter);
    sidebar.addEventListener('pointerenter', handleEnter);
    menuBtn.addEventListener('pointerleave', handleLeave);
    sidebar.addEventListener('pointerleave', handleLeave);
    overlay.addEventListener('click', () => toggleSidebar(false));

    // --- 3. 图标处理逻辑 ---
    function handleIconError(img, name) {
        const firstChar = name ? name.trim().charAt(0).toUpperCase() : '?';
        const div = document.createElement('div');
        div.className = 'nt-icon-text';
        div.innerText = firstChar;
        const colors = ['#4285f4', '#34a853', '#fbbc05', '#ea4335'];
        div.style.backgroundColor = colors[firstChar.charCodeAt(0) % colors.length];
        img.replaceWith(div);
    }

    window.loadFolderIcons = function(container) {
        const imgs = container.querySelectorAll('img[data-src]:not([data-loaded])');
        imgs.forEach(img => {
            const src = img.getAttribute('data-src');
            const name = img.getAttribute('data-name');
            img.setAttribute('data-loaded', 'true'); // 立即打标防止重复扫描
            
            if (!src) { handleIconError(img, name); return; }

            const timer = setTimeout(() => {
                if (!img.complete || img.naturalWidth === 0) handleIconError(img, name);
            }, 2000);

            img.onload = () => clearTimeout(timer);
            img.onerror = () => { clearTimeout(timer); handleIconError(img, name); };
            img.src = src;
        });
    };

    // --- 4. 书签树渲染逻辑 ---
    function createTreeHTML(items) {
        let html = '<ul class="nt-tree">';
        items.forEach(item => {
            if (item.type === 'folder') {
                html += `<li class="nt-tree-folder">
                    <div class="folder-label" onclick="event.stopPropagation(); this.parentElement.classList.toggle('active'); loadFolderIcons(this.parentElement)">
                        <span class="arrow">▶</span><span class="folder-icon"></span>${item.name}
                    </div>
                    <div class="folder-children">${createTreeHTML(item.children)}</div>
                </li>`;
            } else {
                let d = ""; try { d = new URL(item.url).hostname; } catch(e) {}
                const iconUrl = d ? `${WORKER_BASE}${d}` : '';
                html += `<li class="nt-tree-item">
                    <a href="${item.url}" target="_blank" title="${item.name}" onclick="event.stopPropagation()">
                        <img loading="lazy" data-src="${iconUrl}" data-name="${item.name}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
                        ${item.name}
                    </a></li>`;
            }
        });
        return html + '</ul>';
    }

    function getAllBookmarks(items, result = []) {
        items.forEach(item => {
            if (item.type === 'bookmark' || item.url) result.push(item);
            else if (item.type === 'folder' && item.children) getAllBookmarks(item.children, result);
        });
        return result;
    }
    // --- 5. 初始化核心逻辑 ---
        function init() {
            const data = window.bookmarkData;
            if (data && data[0].children) {
                const folders = data[0].children;
                const tabsContainer = document.getElementById('nt-category-tabs');
                
                const activeIdx = (() => {
                    const saved = localStorage.getItem('nt-selected-folder-index');
                    // 如果没有缓存，或者缓存的索引超出了当前文件夹长度，就定位到最后一个
                    if (saved === null || parseInt(saved) >= folders.length) {
                        return folders.length - 1; 
                    }
                    return parseInt(saved);
                })();
    
                // 抢跑渲染缓存
                const initialCache = localStorage.getItem('nt_cache_folder_' + activeIdx);
                if (initialCache) {
                    featuredContainer.innerHTML = initialCache;
                    featuredContainer.className = 'nt-grid';
                    setTimeout(() => window.loadFolderIcons(featuredContainer), 0);
                }
    
                const updateTabs = (activeIndex) => {
                    tabsContainer.innerHTML = folders.map((folder, index) => `
                        <div class="nt-tab ${index == activeIndex ? 'active' : ''}" data-index="${index}">${folder.name}</div>
                    `).join('');
                };
                updateTabs(activeIdx);
    
                const renderFolder = (folderIndex, isFirstLoad = false, forceUpdate = false) => {
                    const targetFolder = folders[folderIndex];
                    if (!targetFolder) return;
    
                    const allLinks = getAllBookmarks(targetFolder.children || [targetFolder]);
                    const newHTML = allLinks.map(link => {
                        let d = ""; try { d = new URL(link.url).hostname; } catch(e) {}
                        const iconUrl = d ? `${WORKER_BASE}${d}` : '';
                        return `<a href="${link.url}" class="nt-card" target="_blank" title="${link.name}">
                            <img data-src="${iconUrl}" data-name="${link.name}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
                            <span>${link.name}</span></a>`;
                    }).join('');
    
                    if (!forceUpdate && featuredContainer.innerHTML === newHTML) return;
    
                    if (!featuredContainer.classList.contains('nt-grid')) {
                        featuredContainer.classList.add('nt-grid');
                    }
                    
                    featuredContainer.innerHTML = newHTML;
                    localStorage.setItem('nt_cache_folder_' + folderIndex, newHTML);
                    window.loadFolderIcons(featuredContainer);
                    if (!isFirstLoad) document.getElementById('nt-scroll-area').scrollTop = 0;
                };
    
                tabsContainer.onclick = (e) => {
                    // 1. 明确获取点击的 Tab 元素
                    const tab = e.target.closest('.nt-tab');
                    if (!tab) return;
                    
                    // 2. 这里的 isDragging 判定要严谨，防止滑动分类栏时误触发点击
                    if (window.isDragging) return;
                
                    const newIndex = parseInt(tab.dataset.index);
                    
                    // 3. 获取当前索引（修复 0 的假值问题）
                    const saved = localStorage.getItem('nt-selected-folder-index');
                    const currentIndex = saved !== null ? parseInt(saved) : -1; // 初始化设为 -1 确保第一次必点中
                
                    if (newIndex === currentIndex) return;
                
                    // 4. 计算动画方向
                    let directionClass = newIndex > currentIndex ? 'slide-in-right' : 'slide-in-left';
                
                    // 5. 执行 UI 更新
                    // 先更新 Tab 的激活状态（不重新 innerHTML，防止失去焦点或滚动失效）
                    tabsContainer.querySelectorAll('.nt-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                
                    // 6. 执行内容区动画与渲染
                    featuredContainer.classList.remove('slide-in-right', 'slide-in-left');
                    void featuredContainer.offsetWidth; 
                    featuredContainer.classList.add(directionClass);
                
                    localStorage.setItem('nt-selected-folder-index', newIndex);
                    renderFolder(newIndex, false, false);
                    
                    // 7. ✨ 核心修复：延迟执行滚动，确保 DOM 已经渲染稳固
                    setTimeout(() => {
                        tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }, 50);
                
                    setTimeout(() => {
                        featuredContainer.classList.remove('slide-in-right', 'slide-in-left');
                    }, 400);
                };
    
                renderFolder(activeIdx, true);
                sidebarContainer.innerHTML = createTreeHTML(folders);
    
                // --- ✨ 滑动增强逻辑 (已修复重复累加) ---
                const scrollArea = document.getElementById('nt-scroll-area');
                let touchStartX = 0, touchStartY = 0;
    
                scrollArea.addEventListener('touchstart', (e) => {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                }, { passive: true });
    
                scrollArea.addEventListener('touchend', (e) => {
                    const dx = e.changedTouches[0].clientX - touchStartX;
                    const dy = e.changedTouches[0].clientY - touchStartY;
                
                    if (touchStartX === -9999) return; 
                
                    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
                        let currentIndex = parseInt(localStorage.getItem('nt-selected-folder-index'));
                        if (isNaN(currentIndex)) currentIndex = folders.length - 1;
                
                        let newIndex = currentIndex;
                
                        if (dx < 0) { // 向左划
                            if (currentIndex < folders.length - 1) {
                                newIndex = currentIndex + 1;
                            } else {
                                // ✨ 已到最后，触发右侧抖动
                                featuredContainer.classList.add('edge-shake-right');
                                setTimeout(() => featuredContainer.classList.remove('edge-shake-right'), 400);
                                return;
                            }
                        } else { // 向右划
                            if (currentIndex > 0) {
                                newIndex = currentIndex - 1;
                            } else {
                                // ✨ 已到最前，触发左侧抖动
                                featuredContainer.classList.add('edge-shake-left');
                                setTimeout(() => featuredContainer.classList.remove('edge-shake-left'), 400);
                                return;
                            }
                        }
                
                        // --- 正常切换逻辑 ---
                        let directionClass = newIndex > currentIndex ? 'slide-in-right' : 'slide-in-left';
                        
                        featuredContainer.classList.remove('slide-in-right', 'slide-in-left');
                        void featuredContainer.offsetWidth; 
                        featuredContainer.classList.add(directionClass);
                
                        localStorage.setItem('nt-selected-folder-index', newIndex);
                        updateTabs(newIndex); 
                        renderFolder(newIndex, false, false);
                        
                        const targetTab = document.querySelector(`.nt-tab[data-index="${newIndex}"]`);
                        if (targetTab) targetTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
                        
                        setTimeout(() => featuredContainer.classList.remove('slide-in-right', 'slide-in-left'), 400);
                    }
                }, { passive: true });
    
            } else {
                setTimeout(init, 50);
            }
        }
    init();
});

// --- 6. 搜索引擎逻辑 ---
function initSearchEngine() {
    const engineTrigger = document.getElementById('nt-search-engine-current');
    const engineMenu = document.getElementById('nt-search-menu');
    const currentEngineIcon = document.getElementById('current-engine-icon');
    const searchInput = document.getElementById('nt-search-input');
    const suggestionList = document.getElementById('nt-search-suggestions');
    let menuTimer = null;
    let debounceTimer = null;

    let selectedUrl = localStorage.getItem('nt_search_url') || 'https://cn.bing.com/search?q=';
    let selectedIcon = localStorage.getItem('nt_search_icon') || 'icons/bing.svg';
    if (currentEngineIcon) currentEngineIcon.src = selectedIcon;

    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        clearTimeout(debounceTimer);
        if (!query) { suggestionList.style.display = 'none'; return; }
        debounceTimer = setTimeout(() => {
            const script = document.createElement('script');
            script.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(query)}&cb=window.showSuggestions`;
            document.body.appendChild(script);
            setTimeout(() => document.body.removeChild(script), 500);
        }, 200);
    });

    window.showSuggestions = (data) => {
        if (!data || !Array.isArray(data.s) || data.s.length === 0) {
            suggestionList.style.display = 'none';
            return;
        }
        suggestionList.innerHTML = data.s.map(item => `<li class="suggestion-item">${item}</li>`).join('');
        suggestionList.style.display = 'block';
    };

    suggestionList.onclick = (e) => {
        if (e.target.classList.contains('suggestion-item')) {
            const keyword = e.target.innerText;
            window.location.href = selectedUrl + encodeURIComponent(keyword);
        }
    };

    document.addEventListener('click', (e) => { if (e.target !== searchInput) suggestionList.style.display = 'none'; });

    if (engineTrigger && engineMenu) {
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
        if (isMobile) {
            engineTrigger.onclick = (e) => { e.stopPropagation(); engineMenu.classList.toggle('show'); };
        } else {
            engineTrigger.onmouseenter = () => { clearTimeout(menuTimer); engineMenu.classList.add('show'); };
            engineMenu.onmouseenter = () => clearTimeout(menuTimer);
            engineTrigger.onmouseleave = engineMenu.onmouseleave = () => {
                menuTimer = setTimeout(() => engineMenu.classList.remove('show'), 250);
            };
        }
    }

    document.querySelectorAll('.nt-engine-item').forEach(item => {
        item.onclick = function(e) {
            e.stopPropagation();
            selectedUrl = this.dataset.url;
            selectedIcon = this.dataset.icon;
            currentEngineIcon.src = selectedIcon;
            localStorage.setItem('nt_search_url', selectedUrl);
            localStorage.setItem('nt_search_icon', selectedIcon);
            engineMenu.classList.remove('show');
            searchInput.focus();
        };
    });

    searchInput.onkeypress = (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            window.location.href = selectedUrl + encodeURIComponent(searchInput.value);
        }
    };
}
document.addEventListener('DOMContentLoaded', initSearchEngine);

// --- 7. 时间与滚动逻辑 ---
function updateTime() {
    const now = new Date();
    const clock = document.getElementById('clock');
    if(clock) clock.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
    const dateEl = document.getElementById('date');
    if(dateEl) dateEl.textContent = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
}
setInterval(updateTime, 1000);
updateTime();
// 放穿透
window.addEventListener('wheel', (e) => {
    const scrollArea = document.getElementById('nt-scroll-area');
    
    // 1. 获取所有可能开启的弹窗
    const calendarModal = document.getElementById('calendar-modal');
    const wallpaperModal = document.getElementById('wallpaper-modal');
    const sidebar = document.getElementById('nt-sidebar');

    // 2. 核心判断：只要这三个里面有一个是“打开状态”，就彻底拦截背景滚动
    const isAnyModalOpen = 
        (calendarModal && calendarModal.style.display === 'flex') || 
        (wallpaperModal && wallpaperModal.style.display === 'flex') || 
        (sidebar && sidebar.classList.contains('open'));

    if (isAnyModalOpen) return; // 弹窗开启时，直接无视掉底层的滚动逻辑

    // 3. 原有的正常页面滚动逻辑
    const path = e.composedPath();
    if (path.includes(scrollArea)) return;
    scrollArea.scrollTop += e.deltaY;
}, { passive: true });
// 放穿透
// --- 8. 标签页拖拽惯性逻辑 ---
const tabs = document.getElementById('nt-category-tabs');
let isDown = false, startX, scrollLeft, isDragging = false, velocity = 0, lastX = 0, lastTime = 0, animationId;

const step = () => {
    if (Math.abs(velocity) > 0.5) {
        tabs.scrollLeft += velocity;
        velocity *= 0.95;
        animationId = requestAnimationFrame(step);
    }
};

tabs.addEventListener('mousedown', (e) => {
    isDown = true; isDragging = false; tabs.style.cursor = 'grabbing';
    cancelAnimationFrame(animationId);
    startX = e.pageX - tabs.offsetLeft;
    scrollLeft = tabs.scrollLeft;
    lastX = e.pageX; lastTime = Date.now();
});

window.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const x = e.pageX - tabs.offsetLeft;
    if (Math.abs(x - startX) > 5) isDragging = true;
    if (isDragging) {
        e.preventDefault();
        tabs.scrollLeft = scrollLeft - (x - startX);
        const now = Date.now(), dt = now - lastTime, dx = e.pageX - lastX;
        if (dt > 0) velocity = -dx / dt * 15;
        lastX = e.pageX; lastTime = now;
    }
});

window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false; tabs.style.cursor = 'grab';
    if (isDragging) animationId = requestAnimationFrame(step);
});

tabs.addEventListener('click', (e) => {
    if (isDragging) { e.stopImmediatePropagation(); e.preventDefault(); }
}, true);

// --- 9. 诗词、天气、日历 ---
function initPoem() {
    if (window.jinrishici) {
        window.jinrishici.load(res => {
            if (res?.status === "success") {
                document.getElementById('poem-content').innerText = res.data.content;
                document.getElementById('poem-author').innerText = res.data.origin.author;
                document.getElementById('poem-title').innerText = res.data.origin.title;
            }
        });
    }
}
document.addEventListener('DOMContentLoaded', initPoem);

async function initWeather() {
    const cityMap = { "Coffee": "⁉️你在哪", "Beijing": "北京", "Shanghai": "上海", "Guangzhou": "广州", "Shenzhen": "深圳" };
    try {
        const res = await fetch('https://wttr.in/?format=j1');
        const data = await res.json();
        const current = data.current_condition[0];
        const rawCity = data.nearest_area[0].areaName[0].value;
        document.getElementById('weather-city').innerText = cityMap[rawCity] || rawCity;
        document.getElementById('weather-temp').innerText = current.temp_C + '°C';
        document.getElementById('weather-desc').innerText = current.lang_zh?.[0].value || current.weatherDesc[0].value;
    } catch (e) {
        document.getElementById('weather-city').innerText = "愿你";
        document.getElementById('weather-desc').innerText = "自在晴天";
    }
}
document.addEventListener('DOMContentLoaded', initWeather);

let calendar;
window.openCalendar = function() {
    document.getElementById('calendar-modal').style.display = 'flex';
    if (!calendar) {
        calendar = new FullCalendar.Calendar(document.getElementById('calendar-left'), {
            initialView: 'dayGridMonth', 
												height: '100%',        // 让日历高度跟随父容器
            handleWindowResize: true,
            expandRows: true,
												stickyHeaderDates: false,
            locale: 'zh-cn', // 核心本地化设置
            fixedWeekCount: false,
            // --- 新增：强制覆盖按钮文字为中文 ---
            buttonText: {
                today: '今天',
                month: '月',
                week: '周',
                day: '日',
                list: '日程'
            },
            headerToolbar: { 
                left: 'prev', 
                center: 'title', 
                right: 'today next' // 调整了一下顺序，让“今天”在左边更好看
            },
            dayCellContent: arg => {
                const d = Solar.fromDate(arg.date), l = d.getLunar();
                // 农历显示逻辑保持不变
                const lunarText = l.getFestivals()[0] || l.getJieQi() || l.getDayInChinese();
                const isSpecial = l.getFestivals().length > 0 || l.getJieQi() !== "";
                return { 
                    html: `<div class="fc-daygrid-day-number">${arg.dayNumberText.replace('日', '')}</div><div class="lunar-text ${isSpecial ? 'is-festival' : ''}">${lunarText}</div>` 
                };
            },
            dateClick: info => {
                updateRightPanel(info.date);
                document.querySelectorAll('.fc-daygrid-day').forEach(el => el.style.backgroundColor = '');
                info.dayEl.style.backgroundColor = 'rgba(26, 115, 232, 0.1)';
            }
        });
        calendar.render();
        updateRightPanel(new Date());
    }
}

function updateRightPanel(date) {
    const d = Solar.fromDate(date), l = d.getLunar();
    
    // --- 核心修复：更新右侧面板顶部的年月显示 ---
    const yearMonthEl = document.getElementById('res-year-month');
    if (yearMonthEl) {
        yearMonthEl.innerText = `${d.getYear()}年${d.getMonth()}月`;
    }
    // ------------------------------------------

    document.getElementById('res-date').innerText = d.getDay();
    document.getElementById('res-day').innerText = '星期' + l.getWeekInChinese();
    
    const fest = l.getFestivals().join(' ') || l.getJieQi();
    document.getElementById('res-lunar').innerText = l.getMonthInChinese() + '月' + l.getDayInChinese() + (fest ? ' · ' + fest : '');
    
    document.getElementById('res-gz').innerText = `${l.getYearInGanZhi()}(${l.getYearShengXiao()})年`;
    
    // 宜忌逻辑
    const yiList = l.getDayYi();
    const jiList = l.getDayJi();
    document.getElementById('res-yi').innerText = yiList.length > 0 ? yiList.slice(0, 5).join(' ') : '诸事不宜';
    document.getElementById('res-ji').innerText = jiList.length > 0 ? jiList.slice(0, 5).join(' ') : '诸事皆宜';
}

window.openCalendar = openCalendar;
window.closeCalendar = () => document.getElementById('calendar-modal').style.display = 'none';
document.getElementById('calendar-modal').onclick = (e) => { if(e.target.id === 'calendar-modal') window.closeCalendar(); };
// --- 1. 配置数据：在这里添加你的壁纸库链接 ---
const bgLayer = document.getElementById('nt-bg');
const wpModal = document.getElementById('wallpaper-modal');
const wpGrid = document.getElementById('wallpaper-grid');
const wpSection = document.getElementById('custom-section');
const categoryName = document.getElementById('wp-category-name');

// --- 2. 核心渲染函数：生成右侧预览图 ---
async function renderCategory(type) {
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

    // 设置标题
    if(categoryName) categoryName.innerText = titles[type] || '壁纸库';

    // 1. 处理自定义界面
    if (type === 'custom') {
        wpGrid.style.display = 'none';
        wpGrid.innerHTML = ''; // 清空大网格，防止残留
        wpSection.style.display = 'block';
        return;
    }

    // 2. 显示网格，清空旧内容，显示加载中
    wpGrid.style.display = 'grid';
    wpSection.style.display = 'none';
    wpGrid.innerHTML = '<div style="color:gray; padding:20px;">加载中...</div>';

    let list = [];

    // 3. 核心逻辑：获取数据源
    if (type === 'history') {
        list = await fetchBingHistory();
    } else if (type === 'local') {
        list = JSON.parse(localStorage.getItem('nt_local_history') || '[]');
    } else {
        const source = window.wallpaperLib || {};
        list = source[type] || [];
    }

    // 4. 空数据处理
    if (list.length === 0) {
        const tip = (type === 'local') ? '暂无上传记录，请先在“自定义”中上传。' : '该分类下暂无内容';
        wpGrid.innerHTML = `<div style="padding:20px; color:gray;">${tip}</div>`;
        return;
    }

    // 5. 执行渲染
    wpGrid.innerHTML = list.map(item => {
        const isVideo = /\.(mp4|webm|ogg)$/i.test(item.url) || (item.url && item.url.includes('video'));
        const isEffect = type === 'effects'; 
    
        // 定义删除按钮
        const deleteBtn = (type === 'local') ? `
            <div class="delete-wp" onclick="deleteLocalWp(event, '${item.url}')" 
                 style="position:absolute; top:5px; right:5px; width:18px; height:18px; 
                        background:rgba(255,0,0,0.5); color:white; border-radius:50%; 
                        text-align:center; line-height:16px; cursor:pointer; font-size:14px; 
                        z-index:10; backdrop-filter:blur(4px);">
                 ×
            </div>` : '';
    
        // --- 情况 A: 视频预览 ---
        if (isVideo) {
            return `
                <div class="wp-thumb video-preview" onclick="setWallpaper('${item.url}')">
                    <video src="${item.url}#t=0.1" preload="metadata" muted style="width:100%; height:100%; object-fit:cover; border-radius:12px;"></video>
                    <div class="play-badge">▶</div>
                    <span style="position:absolute; bottom:5px; left:8px; font-size:10px; color:rgba(255,255,255,0.8); text-shadow:0 1px 2px rgba(0,0,0,0.5);">${item.name || ''}</span>
                </div>`;
        } 
        
        // --- 情况 B: 特效预览 ---
        if (isEffect) {
            const gradients = [
                'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)',
                'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
                'linear-gradient(135deg, #2c3e50 0%, #000000 100%)' 
            ];
            const bg = gradients[item.name.length % gradients.length];
            
            return `
                <div class="wp-thumb" onclick="setWallpaper('${item.url}')" 
                     style="overflow:hidden; background:${bg}; display:flex; align-items:center; justify-content:center;">
                    <div style="font-size:24px; opacity:0.3; color:white; font-weight:bold;">${item.icon || 'FX'}</div>
                    <span style="position:absolute; bottom:5px; left:8px; font-size:10px; color:rgba(255,255,255,0.8); text-shadow:0 1px 2px rgba(0,0,0,0.5);">${item.name || ''}</span>
                </div>`;
        }
    
        // --- 情况 C: 普通图片预览 ---
        let thumb = item.thumb || item.url;
        if (thumb.includes('bing.com') && !thumb.includes('&w=')) {
            thumb += '&w=480&h=270&c=7';
        } 
        if (thumb.includes('xiranimg.com') && !thumb.includes('index.php')) {
            thumb = thumb.replace('https://xiranimg.com/', 'https://xiranimg.com/index.php?action=file&file=');
            thumb += '&resize=320';
        }
        const finalWallpaper = item.fullUrl || item.url;
        return `
            <div class="wp-thumb" onclick="setWallpaper('${finalWallpaper}')">
                <img src="${thumb}" 
                     loading="lazy" 
                     onload="this.classList.add('loaded')" 
                     alt="${item.name || ''}">
                ${deleteBtn}
                <span class="wp-thumb-name">${item.name || ''}</span>
            </div>`;
    }).join('');
}

// --- 新增：解析 GitHub README 的函数 ---
async function fetchBingHistory() {
    const PROXY_URL = "https://gcore.jsdelivr.net/gh/niumoo/bing-wallpaper@main/README.md";
    try {
        const res = await fetch(PROXY_URL);
        const text = await res.text();
        
        // 修改正则：更精准地只抓取 id 后面那串核心字符
        const imgRegex = /id=([^&" \)]+).*?(\d{4}-\d{2}-\d{2})/g;
        const historyList = [];
								const seenIds = new Set();
        let match;
        let count = 0;

        while ((match = imgRegex.exec(text)) !== null && count < 24) {
            let rawId = match[1]; 
            const date = match[2];

            // --- 关键修复：清理 ID 尾部的分辨率标识 ---
            // 删掉类似 _1920x1080, _UHD, .jpg 等，只留 OHR.Name_ZH-CN12345
            const cleanId = rawId.split('_')[0] + '_' + rawId.split('_')[1].split('.')[0];
            // --- 核心去重逻辑 ---
            if (seenIds.has(cleanId)) continue; // 如果这个 ID 已经抓过了，直接跳过
            seenIds.add(cleanId); // 记录新 ID
            // ------------------
            // 重新拼接标准 UHD 链接
            const baseUrl = `https://cn.bing.com/th?id=${cleanId}_UHD.jpg`;
            
            historyList.push({ 
                name: date, 
                // 预览图：带上 w=480 保证弹窗加载速度
                url: `${baseUrl}&w=480&h=270&c=7&pid=hp`, 
                // 背景图：强制 3840 采样
                fullUrl: `${baseUrl}&w=3840&h=2160&pid=hp&rs=1&c=4&qlt=100` 
            });
            count++;
        }
        return historyList;
    } catch (e) {
        console.error("抓取失败:", e);
        return [];
    }
}

// --- 3. 侧边栏菜单点击事件 ---
document.querySelectorAll('.sidebar-menu li').forEach(li => {
    li.onclick = function() {
        // 样式切换
        document.querySelector('.sidebar-menu li.active')?.classList.remove('active');
        this.classList.add('active');
        
        // 执行渲染
        renderCategory(this.dataset.type);
    };
});

// --- 4. 核心设置函数 (支持图片视频和特效) ---
window.setWallpaper = (url) => {
    if (!url || !bgLayer) return;

    // --- 1. 彻底重置环境 ---
    bgLayer.innerHTML = ''; // 清空 iframe 或 video
    bgLayer.style.backgroundImage = 'none'; // 清空背景图
    document.body.style.overflow = 'hidden'; // 再次确保 body 不会出现滚动条
    
    // --- 2. 识别类型 ---
    const isImage = /\.(jpg|jpeg|png|gif|webp|base64)/i.test(url) || url.startsWith('data:image');
    const isVideo = /\.(mp4|webm|ogg)/i.test(url) || url.includes('video');
    const isHtml = url.includes('.html') || (url.startsWith('http') && !isImage && !isVideo);

    if (isHtml) {
        // --- 特效网页模式 ---
        bgLayer.innerHTML = `
            <iframe src="${url}" 
                    style="width:100%; height:100%; border:none; display:block; pointer-events:none;"
                    scrolling="no">
            </iframe>`;
    } else if (isVideo) {
        // --- 视频背景 ---
        bgLayer.innerHTML = `
            <video autoplay loop muted playsinline style="
                position: absolute; top: 50%; left: 50%; 
                min-width: 100%; min-height: 100%; 
                width: auto; height: auto; 
                transform: translate(-50%, -50%); 
                object-fit: cover; z-index: -1;">
                <source src="${url}" type="video/mp4">
            </video>`;
    } else {
        // --- 图片背景 ---
        bgLayer.style.transition = "background-image 0.5s ease-in-out";
        bgLayer.style.backgroundImage = `url(${url})`;
        
        // 本地上传记录逻辑
        if (url.startsWith('data:image')) {
            let localHistory = JSON.parse(localStorage.getItem('nt_local_history') || '[]');
            localHistory = localHistory.filter(item => item.url !== url);
            localHistory.unshift({ name: '本地上传 ' + new Date().toLocaleString(), url: url });
            if (localHistory.length > 8) localHistory.pop();
            localStorage.setItem('nt_local_history', JSON.stringify(localHistory));
        }
    }

    // --- 3. 永久保存状态 ---
    try {
        localStorage.setItem('nt_wallpaper', url);
    } catch (e) {
        console.warn("存储已满");
    }
};
window.deleteLocalWp = (event, url) => {
    event.stopPropagation(); // 双重保险，阻止触发设为壁纸
    
    let localHistory = JSON.parse(localStorage.getItem('nt_local_history') || '[]');
    localHistory = localHistory.filter(item => item.url !== url);
    localStorage.setItem('nt_local_history', JSON.stringify(localHistory));

    // 重新渲染当前“本地记录”分类，让图片立刻消失
    renderCategory('local');
};
// --- 5. 初始化 ---
const savedWp = localStorage.getItem('nt_wallpaper');
if (savedWp) setWallpaper(savedWp);
renderCategory('bing'); // 默认加载必应分类

// 弹窗开关逻辑保持不变
window.closeWpModal = () => wpModal.style.display = 'none';
document.getElementById('nt-wallpaper-btn').onclick = () => wpModal.style.display = 'flex';
// --- 6. 自定义功能：链接输入、本地上传、拖拽上传 ---

// 1. 链接输入应用
window.applyCustomWp = () => {
    const input = document.getElementById('wp-input');
    if (input && input.value) setWallpaper(input.value);
};

// 2. 定义【处理文件】的核心逻辑 (先定义)
const wpFileInput = document.getElementById('wp-file');
if (wpFileInput) {
    wpFileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 4 * 1024 * 1024) {
            alert("文件超过4MB，由于浏览器存储限制，可能无法保存。");
        }
        const reader = new FileReader();
        reader.onload = (event) => setWallpaper(event.target.result);
        reader.readAsDataURL(file);
    };
}

// 3. 定义【拖拽】逻辑 (调用上面定义的 wpFileInput)
const dropZone = document.querySelector('.file-upload-label');
if (dropZone && wpFileInput) {
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#007aff';
        dropZone.style.background = 'rgba(0,122,255,0.05)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'rgba(0,0,0,0.1)';
        dropZone.style.background = 'rgba(0,0,0,0.02)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(0,0,0,0.1)';
        dropZone.style.background = 'rgba(0,0,0,0.02)';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            wpFileInput.files = files; // 塞入文件
            wpFileInput.dispatchEvent(new Event('change')); // 触发上面定义的逻辑
        }
    });
}
// 获取弹窗的遮罩层（最外层容器）

if (wpModal) {
    wpModal.onclick = function(e) {
        if (e.target === this) {
            closeWpModal();
        }
    };
}
// --- 10. 沉浸模式逻辑 (纯净版：无遮罩) ---
window.toggleZenMode = function(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 1. 切换 body 的类名
    const isZen = document.body.classList.toggle('zen-mode');
    
    // 2. 【新增】将当前状态存入本地存储，下次打开页面时读取
    localStorage.setItem('zenModeStatus', isZen ? 'on' : 'off');
    
    if (isZen) {
        // 进入时自动关闭弹窗
        if (typeof window.closeCalendar === 'function') window.closeCalendar();
        if (typeof window.closeWpModal === 'function') window.closeWpModal();
        console.log("进入纯净模式，已记录状态");
    } else {
        console.log("退出纯净模式，已更新状态");
    }
};

// 绑定时间点击 (确保能反复点击切换)
const clockBtn = document.getElementById('clock');
if (clockBtn) {
    clockBtn.style.cursor = 'pointer';
    clockBtn.onclick = window.toggleZenMode; 
}

const oldMask = document.getElementById('zen-mask');
if (oldMask) oldMask.remove();

// 3. 统一绑定入口 (直接获取元素绑定，不嵌套多层加载)
(function() {
    const clock = document.getElementById('clock');
    const date = document.getElementById('date');

    if (clock) {
        clock.style.cursor = 'pointer';
        clock.onclick = (e) => {
            if (typeof window.toggleZenMode === 'function') window.toggleZenMode(e);
        };
    }

    if (date) {
        date.style.cursor = 'pointer';
        date.onclick = (e) => {
            e.stopPropagation();
            if (typeof window.openCalendar === 'function') window.openCalendar();
        };
    }
})();

// 4. Esc 键支持：退出沉浸模式、关闭日历、关闭壁纸弹窗
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // 1. 退出沉浸模式
        document.body.classList.remove('zen-mode');

        // 2. 关闭日历 (调用你已有的函数)
        if (typeof window.closeCalendar === 'function') {
            window.closeCalendar();
        } else {
            // 如果找不到函数，暴力隐藏
            const cal = document.getElementById('calendar-modal');
            if (cal) cal.style.display = 'none';
        }

        // 3. 关闭壁纸弹窗 (添加这一段)
        if (typeof window.closeWpModal === 'function') {
            window.closeWpModal();
        } else {
            // 暴力隐藏壁纸弹窗
            const wpModal = document.getElementById('wallpaper-modal');
            if (wpModal) wpModal.style.display = 'none';
        }
        
        console.log("已通过 Esc 键关闭所有弹窗并退出沉浸模式");
    }
});