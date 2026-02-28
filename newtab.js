document.addEventListener('DOMContentLoaded', () => {
    const featuredContainer = document.getElementById('nt-featured-content');
    const sidebarContainer = document.getElementById('nt-sidebar-content');
    const menuBtn = document.getElementById('nt-menu-btn');
    const sidebar = document.getElementById('nt-sidebar');
    const overlay = document.getElementById('nt-overlay');
    const edgeTrigger = document.getElementById('nt-edge-trigger'); // 捕获边缘触发器
    const body = document.body;

    let isSidebarTransitioning = false;
    let hoverTimer; // 确保这个变量在外部
    
    function toggleSidebar(isOpen) {
        if (isSidebarTransitioning) return;
        const currentOpen = sidebar.classList.contains('open');
        if (isOpen === currentOpen) return;
    
        // ✨ 核心修正：不管是打开还是关闭，先清理掉所有的悬停/离开计时器
        // 防止“正要打开”时，“延迟关闭”的定时器还在跑
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

    // --- 交互逻辑整合 ---
        
        // 1. 点击按钮
        menuBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            clearTimeout(hoverTimer);
            const isOpen = sidebar.classList.contains('open');
            toggleSidebar(!isOpen);
        };
    
        // 2. 鼠标进入 (处理悬停)
        const handleEnter = (e) => {
            if (isSidebarTransitioning) return;
            if (e.pointerType === 'touch') return; // 手机触屏不触发悬停
            
            clearTimeout(hoverTimer);
            hoverTimer = setTimeout(() => toggleSidebar(true), 150);
        };
    
        // 3. 鼠标离开 (合并后的唯一版本)
        const handleLeave = (e) => {
            // 如果是触屏抬起，或者是动画中，或者本来就是关着的，则不执行自动关闭
            if ((e && e.pointerType === 'touch') || isSidebarTransitioning || !sidebar.classList.contains('open')) return;
    
            clearTimeout(hoverTimer);
            hoverTimer = setTimeout(() => toggleSidebar(false), 500); 
        };
    
        // 统一绑定监听
        menuBtn.addEventListener('pointerenter', handleEnter);
        sidebar.addEventListener('pointerenter', handleEnter);
        menuBtn.addEventListener('pointerleave', handleLeave);
        sidebar.addEventListener('pointerleave', handleLeave);
    
        // 4. 遮罩层点击 (防穿透)
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar(false);
        });

    // --- 核心优化：处理图标加载失败或超时 ---
    // 修改生成的 div 样式属性，适应大图标
    function handleIconError(img, name) {
        const firstChar = name ? name.trim().charAt(0).toUpperCase() : '?';
        const div = document.createElement('div');
        div.className = 'nt-icon-text';
        div.innerText = firstChar;
        
        const colors = ['#4285f4', '#34a853', '#fbbc05', '#ea4335'];
        div.style.backgroundColor = colors[firstChar.charCodeAt(0) % colors.length];
        
        img.replaceWith(div);
    }

    // --- 核心优化：懒加载图标 ---
    window.loadFolderIcons = function(container) {
        const imgs = container.querySelectorAll('img[data-src]');
        imgs.forEach(img => {
            const src = img.getAttribute('data-src');
            const name = img.getAttribute('data-name');
            if (!src) { handleIconError(img, name); return; }

            const timer = setTimeout(() => {
                if (!img.complete || img.naturalWidth === 0) handleIconError(img, name);
            }, 2000);

            img.onload = () => clearTimeout(timer);
            img.onerror = () => { clearTimeout(timer); handleIconError(img, name); };
            
            img.src = src;
            img.removeAttribute('data-src');
        });
    };

    // 递归生成树状 HTML
    function createTreeHTML(items) {
            let html = '<ul class="nt-tree">';
            items.forEach(item => {
                if (item.type === 'folder') {
                    html += `
                        <li class="nt-tree-folder">
                            <div class="folder-label" onclick="event.stopPropagation(); this.parentElement.classList.toggle('active'); loadFolderIcons(this.parentElement)">
                                <span class="arrow">▶</span>
                                <span class="folder-icon"></span>
                                ${item.name}
                            </div>
                            <div class="folder-children">
                                ${createTreeHTML(item.children)}
                            </div>
                        </li>`;
                } else {
                    // ... 剩下的链接部分逻辑正确 ...
                }
            });
            return html + '</ul>';
        }

    // --- 1. 核心逻辑：获取初始聚焦索引 ---
        const getSavedIndex = (folders) => {
            const saved = localStorage.getItem('nt-selected-folder-index');
            if (saved !== null) return parseInt(saved);
            
            // ✨ 新用户默认逻辑：自动聚焦到最后一个分类 (folders.length - 1)
            // 如果想固定到第2个，就把下面这行改为 return 1;
            return folders ? folders.length - 1 : 0;
        };
    
        function getAllBookmarks(items, result = []) {
            items.forEach(item => {
                if (item.type === 'bookmark' || item.url) result.push(item);
                else if (item.type === 'folder' && item.children) getAllBookmarks(item.children, result);
            });
            return result;
        }
    
        function init() {
            const data = window.bookmarkData;
            if (data && data[0].children) {
                const folders = data[0].children;
                const tabsContainer = document.getElementById('nt-category-tabs');
                
                // 获取最终要显示的索引（记忆值 或 最后一个）
                const activeIdx = getSavedIndex(folders);
    
                // --- 2. 抢跑渲染：利用缓存瞬间出图 ---
                const initialCache = localStorage.getItem('nt_cache_folder_' + activeIdx);
                if (initialCache) {
                    featuredContainer.innerHTML = initialCache;
                    featuredContainer.className = 'nt-grid';
                    setTimeout(() => window.loadFolderIcons(featuredContainer), 0);
                }
    
                // --- 3. 生成分类标签 ---
                const updateTabs = (activeIndex) => {
                    tabsContainer.innerHTML = folders.map((folder, index) => `
                        <div class="nt-tab ${index == activeIndex ? 'active' : ''}" data-index="${index}">
                            ${folder.name}
                        </div>
                    `).join('');
                };
                updateTabs(activeIdx);
    
                // --- 4. 增强版渲染函数 ---
                const renderFolder = (folderIndex, isFirstLoad = false, forceUpdate = false) => {
                    const targetFolder = folders[folderIndex];
                    if (!targetFolder) return;
    
                    const allLinks = getAllBookmarks(targetFolder.children || [targetFolder]);
                    const newHTML = allLinks.map(link => {
                        let d = ""; try { d = new URL(link.url).hostname; } catch(e) {}
                        const iconUrl = d ? `https://icons.duckduckgo.com/ip3/${d}.ico` : '';
                        return `
                            <a href="${link.url}" class="nt-card" target="_blank" title="${link.name}">
                                <img data-src="${iconUrl}" data-name="${link.name}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
                                <span>${link.name}</span>
                            </a>`;
                    }).join('');
    
                    const cacheKey = 'nt_cache_folder_' + folderIndex;
                    const oldHTML = localStorage.getItem(cacheKey);
    
                    if (forceUpdate || newHTML !== oldHTML) {
                        featuredContainer.className = 'nt-grid'; 
                        featuredContainer.innerHTML = newHTML;
                        localStorage.setItem(cacheKey, newHTML);
                        window.loadFolderIcons(featuredContainer);
                    } else if (isFirstLoad) {
                        window.loadFolderIcons(featuredContainer);
                    }
                    
                    if (!isFirstLoad) document.getElementById('nt-scroll-area').scrollTop = 0;
                };
    
                // --- 5. 点击事件 ---
                tabsContainer.onclick = (e) => {
                    const tab = e.target.closest('.nt-tab');
                    if (!tab) return;
                    if (typeof isDragging !== 'undefined' && isDragging) return;
    
                    const index = parseInt(tab.dataset.index);
                    localStorage.setItem('nt-selected-folder-index', index);
                    updateTabs(index); 
                    renderFolder(index, false, true); 
                };
    
                // --- 6. 执行初次渲染 ---
                renderFolder(activeIdx, true);
                sidebarContainer.innerHTML = createTreeHTML(folders);
    
            } else {
                setTimeout(init, 50);
            }
        }
    
        init();
});
function updateTime() {
    const now = new Date();
    const options = { month: 'long', day: 'numeric', weekday: 'long' };
    
    document.getElementById('clock').textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
    document.getElementById('date').textContent = now.toLocaleDateString('zh-CN', options);
}
setInterval(updateTime, 1000);
updateTime();

// --- 搜索引擎切换与联想搜索逻辑 (全能缝合版) ---
function initSearchEngine() {
    const engineTrigger = document.getElementById('nt-search-engine-current');
    const engineMenu = document.getElementById('nt-search-menu');
    const currentEngineIcon = document.getElementById('current-engine-icon');
    const searchInput = document.getElementById('nt-search-input');
    const suggestionList = document.getElementById('nt-search-suggestions');
    let menuTimer = null;

    // 1. 初始化：优先从本地存储读取
    let selectedUrl = localStorage.getItem('nt_search_url') || 'https://cn.bing.com/search?q=';
    let selectedIcon = localStorage.getItem('nt_search_icon') || 'icons/bing.svg';
    
    if (currentEngineIcon) currentEngineIcon.src = selectedIcon;

    // --- 【新增】核心：关联搜索逻辑 ---
    
    // 监听输入框，显示建议
    let debounceTimer = null;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        const suggestionList = document.getElementById('nt-search-suggestions');
    
        // 清除之前的定时器
        clearTimeout(debounceTimer);
    
        if (!query) {
            suggestionList.style.display = 'none';
            return;
        }
    
        // 开启新的定时器：只有停止输入 200ms 后才发请求
        debounceTimer = setTimeout(() => {
            const script = document.createElement('script');
            // 百度 API 有时候对 cb 参数很敏感，确保 window.showSuggestions 已经全局定义
            script.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(query)}&cb=window.showSuggestions`;
            document.body.appendChild(script);
            // 请求发出去后延迟删除 script 标签，保持页面整洁
            setTimeout(() => document.body.removeChild(script), 500);
        }, 200);
    });

    // 定义全局回调函数处理数据
    // 修改后的回调函数
    window.showSuggestions = function(data) {
        // 增加一层安全检查，防止 data 为空或格式不对导致崩溃
        if (!data || !Array.isArray(data.s)) {
            const suggestionList = document.getElementById('nt-search-suggestions');
            if (suggestionList) suggestionList.style.display = 'none';
            return;
        }
    
        const suggestions = data.s; 
        const suggestionList = document.getElementById('nt-search-suggestions');
    
        if (suggestions.length === 0) {
            suggestionList.style.display = 'none';
            return;
        }
    
        // 渲染列表
        suggestionList.innerHTML = suggestions.map(item => 
            `<li class="suggestion-item">${item}</li>`
        ).join('');
        
        suggestionList.style.display = 'block';
    };

    // 点击建议项：获取当前选中的 selectedUrl 进行动态跳转
    suggestionList.addEventListener('click', function(e) {
        if (e.target.classList.contains('suggestion-item')) {
            const keyword = e.target.innerText;
            searchInput.value = keyword;
            suggestionList.style.display = 'none';
            // 【关键修复】：这里不再写死百度，而是使用当前选中的 selectedUrl
            window.location.href = selectedUrl + encodeURIComponent(keyword);
        }
    });

    // 点击页面其他地方隐藏建议列表
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) {
            suggestionList.style.display = 'none';
        }
    });

    // --- 2. 设备判断与菜单触发 ---
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (engineTrigger && engineMenu) {
        if (isMobile) {
            engineTrigger.onclick = (e) => {
                e.stopPropagation();
                engineMenu.classList.toggle('show');
            };
        } else {
            engineTrigger.onmouseenter = () => {
                clearTimeout(menuTimer);
                engineMenu.classList.add('show');
            };
            engineMenu.onmouseenter = () => clearTimeout(menuTimer);
            engineTrigger.onmouseleave = engineMenu.onmouseleave = () => {
                menuTimer = setTimeout(() => engineMenu.classList.remove('show'), 250);
            };
        }
    }

    // --- 3. 菜单内切换引擎 ---
    document.querySelectorAll('.nt-engine-item').forEach(item => {
        item.onclick = function(e) {
            e.stopPropagation();
            // 更新变量，这两个变量在搜索跳转时会被读取
            selectedUrl = this.dataset.url;
            selectedIcon = this.dataset.icon;
            
            if (currentEngineIcon) currentEngineIcon.src = selectedIcon;
            localStorage.setItem('nt_search_url', selectedUrl);
            localStorage.setItem('nt_search_icon', selectedIcon);
            
            engineMenu.classList.remove('show');
            if (searchInput) searchInput.focus();
        };
    });

    // --- 4. 回车搜索跳转 ---
    if (searchInput) {
        searchInput.onkeypress = (e) => {
            if (e.key === 'Enter' && searchInput.value.trim() !== '') {
                suggestionList.style.display = 'none'; // 按回车时隐藏建议列表
                window.location.href = selectedUrl + encodeURIComponent(searchInput.value);
            }
        };
    }
}

document.addEventListener('DOMContentLoaded', initSearchEngine);

window.addEventListener('wheel', (e) => {
    const scrollArea = document.getElementById('nt-scroll-area');
    const sidebar = document.getElementById('nt-sidebar');
    const calendarModal = document.getElementById('calendar-modal'); // 获取日历弹窗

    const path = e.composedPath();

    // ✨ 新增拦截：如果日历弹窗是打开的，直接跳过背景滚动转发
    // 这样你在日历里滚轮时，背景就会纹丝不动
    if (calendarModal && calendarModal.style.display === 'flex') return;

    // 2. 原有拦截逻辑：
    if (path.includes(scrollArea)) return;
    if (sidebar.classList.contains('open') && path.includes(sidebar)) return;

    // 3. 转发滚动量
    scrollArea.scrollTop += e.deltaY;
}, { passive: true });
// --- 方案 C：鼠标拖拽滚动（完美拦截点击版） ---
const tabs = document.getElementById('nt-category-tabs');
let isDown = false;
let startX, scrollLeft;
let isDragging = false;

// 惯性相关变量
let velocity = 0;       // 速度
let lastX = 0;          // 上一次的坐标
let lastTime = 0;       // 上一次的时间
let animationId;        // 动画帧 ID

// 惯性减速函数
const step = () => {
    if (Math.abs(velocity) > 0.5) { // 速度足够大时继续滑动
        tabs.scrollLeft += velocity;
        velocity *= 0.95;           // 摩擦系数，越接近 1 滑得越远
        animationId = requestAnimationFrame(step);
    } else {
        velocity = 0;
    }
};

tabs.addEventListener('mousedown', (e) => {
    isDown = true;
    isDragging = false;
    tabs.style.cursor = 'grabbing';
    cancelAnimationFrame(animationId); // 按下时立刻停止之前的惯性

    startX = e.pageX - tabs.offsetLeft;
    scrollLeft = tabs.scrollLeft;
    
    lastX = e.pageX;
    lastTime = Date.now();
    velocity = 0;
});

window.addEventListener('mousemove', (e) => {
    if (!isDown) return;

    const x = e.pageX - tabs.offsetLeft;
    const distance = Math.abs(x - startX);
    
    if (distance > 5) isDragging = true;

    if (isDragging) {
        e.preventDefault();
        const walk = (x - startX) * 1;
        tabs.scrollLeft = scrollLeft - walk;

        // 计算即时速度
        const now = Date.now();
        const dt = now - lastTime;
        const dx = e.pageX - lastX;
        if (dt > 0) {
            velocity = -dx / dt * 15; // 15 是速度放大系数，可微调
        }
        lastX = e.pageX;
        lastTime = now;
    }
});

window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    tabs.style.cursor = 'grab';

    // 松手后开启惯性动画
    if (isDragging) {
        animationId = requestAnimationFrame(step);
    }
    
    window.getSelection().removeAllRanges();
});

tabs.addEventListener('click', (e) => {
    if (isDragging) {
        e.stopImmediatePropagation();
        e.preventDefault();
    }
}, true);
// 底部诗词
function initPoem() {
    // 检查 SDK 是否加载成功
    if (window.jinrishici) {
        window.jinrishici.load(function(result) {
            // 获取 HTML 元素
            const content = document.getElementById('poem-content');
            const author = document.getElementById('poem-author');
            const title = document.getElementById('poem-title');

            if (result && result.status === "success") {
                // 写入诗词数据
                content.innerHTML = result.data.content;
                author.innerHTML = result.data.origin.author;
                title.innerHTML = result.data.origin.title;
            } else {
                content.innerHTML = "纵有疾风起，人生不言弃。";
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', initPoem);
// 天气
async function initWeather() {
    // 1. 建立中文映射表 (你可以根据需要继续往里添加)
    const cityMap = {
            "Coffee": "⁉️你这是在哪",       // 修正定位乌龙
            "Beijing": "猜你是在👉北京",
            "Shanghai": "猜你是在👉上海",
            "Guangzhou": "猜你是在👉广州",
            "Shenzhen": "猜你是在👉深圳",
            "Hangzhou": "猜你是在👉杭州",
            "Chengdu": "猜你是在👉成都",
            "Nanjing": "猜你是在👉南京",
            "Wuhan": "猜你是在👉武汉",
            "Xi'an": "猜你是在👉西安",
            "Chongqing": "猜你是在👉重庆",
            "Suzhou": "猜你是在👉苏州",
            "Tianjin": "猜你是在👉天津"
        };

    try {
        const response = await fetch('https://wttr.in/?format=j1');
        const data = await response.json();
        
        const current = data.current_condition[0];
        const area = data.nearest_area[0];
        const rawCity = area.areaName[0].value;

        // 2. 查找映射，如果找不到就显示原名
        const chineseCity = cityMap[rawCity] || rawCity;

        // 3. 填入数据
        document.getElementById('weather-city').innerText = chineseCity;
        document.getElementById('weather-temp').innerText = current.temp_C + '°C';
        
        // 这里的逻辑优化：wttr 有时返回的描述很长，我们取个巧
        const desc = current.lang_zh ? current.lang_zh[0].value : current.weatherDesc[0].value;
        document.getElementById('weather-desc').innerText = desc;
        
    } catch (error) {
        console.log('天气获取失败', error);
        document.getElementById('weather-city').innerText = "愿你";
        document.getElementById('weather-desc').innerText = "自在晴天";
    }
}

document.addEventListener('DOMContentLoaded', initWeather);

// 日历
let calendar;

function openCalendar() {
    document.getElementById('calendar-modal').style.display = 'flex';
    if (!calendar) {
        const calendarEl = document.getElementById('calendar-left');
        calendar = new FullCalendar.Calendar(calendarEl, {
									   longPressDelay: 50,      // 缩短长按延迟，让触摸更灵敏
									   fixedWeekCount: false,   // 重要：根据月份自动调整行数，不强制显示6行，省下空间给详情页
									   handleWindowResize: true,
									   aspectRatio: 0.85,       // 在手机端让格子稍微高一点，方便手指点击
            initialView: 'dayGridMonth',
            locale: 'zh-cn',
												buttonHints: {
												        prev: '上个月',
												        next: '下个月',
												        today: '返回今天',
												    },
											 buttonText: {
											         today: '今天'
											     },
            headerToolbar: { left: 'prev', center: 'title', right: 'next today' },
            nowIndicator: true,
            
            // ✨ 新增：自定义格子内容（显示农历和节日）
            dayCellContent: function(arg) {
                // 调用 lunar.js 获取农历信息
                const d = Solar.fromDate(arg.date);
                const l = d.getLunar();

                // 优先顺序：节日 > 节气 > 农历日（如初十）
                let lunarText = l.getFestivals()[0] || l.getJieQi() || l.getDayInChinese();
                
                // 判断是否是节日或节气，如果是，我们待会儿在 CSS 里给它变色
                const isSpecial = l.getFestivals().length > 0 || l.getJieQi() !== "";

                return { 
                    html: `
                        <div class="fc-daygrid-day-number">${arg.dayNumberText}</div>
                        <div class="lunar-text ${isSpecial ? 'is-festival' : ''}">${lunarText}</div>
                    ` 
                };
            },

            dayCellDidMount: function(arg) {
                arg.el.style.cursor = 'pointer';
            },

            dateClick: function(info) {
                updateRightPanel(info.date);
                
                // 增加一个视觉反馈：点击时移除其他格子的选中样式，给当前格子加个色
                document.querySelectorAll('.fc-daygrid-day').forEach(el => el.style.backgroundColor = '');
                info.dayEl.style.backgroundColor = 'rgba(26, 115, 232, 0.1)';
            }
        });
        calendar.render();
    }
}
// 获取遮罩层元素
const modal = document.getElementById('calendar-modal');

// 为遮罩层添加点击事件
modal.addEventListener('click', function(e) {
    // 关键逻辑：判断点击的是否是遮罩层本身
    // 如果点击的是 modal-overlay 而不是它内部的 calendar-card，就关闭
    if (e.target === modal) {
        closeCalendar();
    }
});
function updateRightPanel(date) {
    const d = Solar.fromDate(date);
    const l = d.getLunar();

    // 日期大数字
    document.getElementById('res-date').innerText = d.getDay();
    document.getElementById('res-day').innerText = '星期' + l.getWeekInChinese();
    
    // 农历 & 节日
    const festival = l.getFestivals().join(' ') || l.getJieQi(); // 获取节日或节气
    document.getElementById('res-lunar').innerText = l.getMonthInChinese() + '月' + l.getDayInChinese() + (festival ? ' · ' + festival : '');
    
    // 详细信息：增加生肖和星座
    document.getElementById('res-gz').innerText = `${l.getYearInGanZhi()}(${l.getYearShengXiao()})年 ${l.getMonthInGanZhi()}月`;
    
    // 宜忌
    document.getElementById('res-yi').innerText = l.getDayYi().slice(0, 5).join(' '); // 只取前5个，防止溢出
    document.getElementById('res-ji').innerText = l.getDayJi().slice(0, 5).join(' ');
}

function closeCalendar() {
    document.getElementById('calendar-modal').style.display = 'none';
}