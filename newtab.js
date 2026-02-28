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
        if (isSidebarTransitioning) return;
        const currentOpen = sidebar.classList.contains('open');
        if (isOpen === currentOpen) return;
        
        clearTimeout(hoverTimer);
        if (isOpen) {
            sidebar.classList.add('open');
            overlay.classList.add('show');
            body.classList.add('sidebar-open');
            menuBtn.innerText = '✕';
        } else {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
            menuBtn.innerText = '☰';
            isSidebarTransitioning = true;
            menuBtn.style.pointerEvents = 'none';
            setTimeout(() => {
                body.classList.remove('sidebar-open');
                menuBtn.style.pointerEvents = 'auto';
                isSidebarTransitioning = false;
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
        hoverTimer = setTimeout(() => toggleSidebar(true), 10);
    };

    const handleLeave = (e) => {
        if ((e && e.pointerType === 'touch') || isSidebarTransitioning || !sidebar.classList.contains('open')) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => toggleSidebar(false), 200); 
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
                        <img data-src="${iconUrl}" data-name="${item.name}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
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
                return saved !== null ? parseInt(saved) : (folders.length - 1);
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

                featuredContainer.className = 'nt-grid'; 
                featuredContainer.innerHTML = newHTML;
                localStorage.setItem('nt_cache_folder_' + folderIndex, newHTML);
                window.loadFolderIcons(featuredContainer);
                if (!isFirstLoad) document.getElementById('nt-scroll-area').scrollTop = 0;
            };

            tabsContainer.onclick = (e) => {
                const tab = e.target.closest('.nt-tab');
                if (!tab || (typeof isDragging !== 'undefined' && isDragging)) return;
                const index = parseInt(tab.dataset.index);
                localStorage.setItem('nt-selected-folder-index', index);
                updateTabs(index); 
                renderFolder(index, false, false); 
            };

            renderFolder(activeIdx, true);
            sidebarContainer.innerHTML = createTreeHTML(folders);
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

window.addEventListener('wheel', (e) => {
    const scrollArea = document.getElementById('nt-scroll-area');
    const calendarModal = document.getElementById('calendar-modal');
    if (calendarModal?.style.display === 'flex') return;
    const path = e.composedPath();
    if (path.includes(scrollArea)) return;
    scrollArea.scrollTop += e.deltaY;
}, { passive: true });

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
function openCalendar() {
    document.getElementById('calendar-modal').style.display = 'flex';
    if (!calendar) {
        calendar = new FullCalendar.Calendar(document.getElementById('calendar-left'), {
            initialView: 'dayGridMonth', locale: 'zh-cn', fixedWeekCount: false,
            headerToolbar: { left: 'prev', center: 'title', right: 'next today' },
            dayCellContent: arg => {
                const d = Solar.fromDate(arg.date), l = d.getLunar();
                const lunarText = l.getFestivals()[0] || l.getJieQi() || l.getDayInChinese();
                const isSpecial = l.getFestivals().length > 0 || l.getJieQi() !== "";
                return { html: `<div class="fc-daygrid-day-number">${arg.dayNumberText}</div><div class="lunar-text ${isSpecial ? 'is-festival' : ''}">${lunarText}</div>` };
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
    document.getElementById('res-date').innerText = d.getDay();
    document.getElementById('res-day').innerText = '星期' + l.getWeekInChinese();
    const fest = l.getFestivals().join(' ') || l.getJieQi();
    document.getElementById('res-lunar').innerText = l.getMonthInChinese() + '月' + l.getDayInChinese() + (fest ? ' · ' + fest : '');
    document.getElementById('res-gz').innerText = `${l.getYearInGanZhi()}(${l.getYearShengXiao()})年`;
    document.getElementById('res-yi').innerText = l.getDayYi().slice(0, 5).join(' ');
    document.getElementById('res-ji').innerText = l.getDayJi().slice(0, 5).join(' ');
}

window.openCalendar = openCalendar;
window.closeCalendar = () => document.getElementById('calendar-modal').style.display = 'none';
document.getElementById('calendar-modal').onclick = (e) => { if(e.target.id === 'calendar-modal') window.closeCalendar(); };