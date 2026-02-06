document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    const navList = document.getElementById('nav-list');
    const navDisplay = document.getElementById('nav-display');
    const btnPcTop = document.getElementById('back-to-top-pc');
    const btnMobileTop = document.getElementById('back-to-top-mobile');

    // --- 搜索功能逻辑 ---
    const engineSelector = document.getElementById('engine-selector');
    const engineList = document.getElementById('engine-list');
    const currentEngineIcon = document.getElementById('current-engine-icon');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    let currentSearchUrl = "https://www.google.com/search?q=";

    engineSelector.addEventListener('click', (e) => {
        e.stopPropagation();
        engineList.classList.toggle('show');
    });

    engineList.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', (e) => {
            e.stopPropagation();
            currentSearchUrl = li.getAttribute('data-url');
            currentEngineIcon.src = li.getAttribute('data-icon');
            engineList.classList.remove('show');
            searchInput.focus();
        });
    });

    function doSearch() {
        const query = searchInput.value.trim();
        if (query) {
            window.open(currentSearchUrl + encodeURIComponent(query), '_blank');
        }
    }

    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') doSearch(); });
    document.addEventListener('click', () => engineList.classList.remove('show'));

    // --- 导航逻辑 ---
    function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
    btnPcTop.addEventListener('click', scrollToTop);
    btnMobileTop.addEventListener('click', scrollToTop);

    window.addEventListener('scroll', () => {
        btnPcTop.style.display = window.scrollY > 300 ? 'flex' : 'none';
    });

    function toggleSidebar(show) {
        if (show) {
            sidebar.classList.add('open');
            document.body.classList.add('no-scroll');
        } else {
            sidebar.classList.remove('open');
            document.body.classList.remove('no-scroll');
        }
    }

    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar(!sidebar.classList.contains('open'));
    });

    overlay.addEventListener('click', () => toggleSidebar(false));

    // --- 核心：图标加载失败或超时处理函数 ---
    window.handleIconError = function(imgElement) {
        if (!imgElement) return;
        const container = imgElement.parentElement;
        // 如果已经处理过（有了 no-icon 类），就跳过
        if (container && !container.classList.contains('no-icon')) {
            container.classList.add('no-icon');
            imgElement.style.display = 'none';
            // 随机一个好看的背景色
            const colors = ['#4A90E2', '#50E3C2', '#F5A623', '#D0021B', '#9013FE', '#7ED321', '#FB7299'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            container.style.backgroundColor = randomColor;
        }
    };

    let folderCounter = 0;
    function createTreeMenu(items, container, level = 0) {
        items.forEach((item) => {
            if (item.type === 'folder') {
                const folderId = `folder-sec-${folderCounter++}`;
                const wrapper = document.createElement('div');
                wrapper.className = 'folder-wrapper';
                if (level === 0) wrapper.classList.add('open');

                const header = document.createElement('div');
                header.className = 'nav-item folder-header';
                
                const hasSubFolders = item.children && item.children.some(child => child.type === 'folder');
                const hasDirectBookmarks = item.children && item.children.some(child => child.type === 'bookmark' || child.url);
                const arrowHtml = hasSubFolders ? `<span class="arrow">▶</span>` : `<span></span>`;
                
                header.innerHTML = `<span>📂 ${item.name}</span>${arrowHtml}`;
                
                header.onclick = (e) => {
                    e.stopPropagation();
                    if (hasSubFolders) wrapper.classList.toggle('open');
                    if (hasDirectBookmarks) {
                        const targetSec = document.getElementById(folderId);
                        if (targetSec) {
                            targetSec.scrollIntoView({ behavior: 'smooth' });
                            if (window.innerWidth <= 768) toggleSidebar(false);
                        }
                    }
                };

                const subMenu = document.createElement('div');
                subMenu.className = 'sub-menu';
                wrapper.appendChild(header);
                wrapper.appendChild(subMenu);
                container.appendChild(wrapper);

                renderSection(item, folderId);
                if (item.children) createTreeMenu(item.children, subMenu, level + 1);
            }
        });
    }

    function renderSection(folder, id) {
        const bookmarks = folder.children.filter(i => i.type === 'bookmark' || i.url);
        if (bookmarks.length === 0) return;

        const section = document.createElement('section');
        section.id = id;
        section.className = 'section';

        const cardsHtml = bookmarks.map(item => {
            let domain = "";
            try { domain = new URL(item.url).hostname; } catch(e) { domain = "link"; }

            const iconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
            const firstLetter = item.name ? item.name.charAt(0).toUpperCase() : '?';
            const imgId = `img-${Math.random().toString(36).substr(2, 9)}`;

            // 设置 2 秒超时：如果 2 秒没加载完，强制切换到文字头像
            setTimeout(() => {
                const img = document.getElementById(imgId);
                if (img && !img.complete) {
                    handleIconError(img);
                }
            }, 2000);

            return `
                <a href="${item.url}" class="card" target="_blank" title="${item.name}">
                    <div class="icon-container">
                        <img id="${imgId}" 
                             src="${iconUrl}" 
                             class="favicon"
                             onload="this.style.opacity=1"
                             onerror="handleIconError(this)">
                        <div class="letter-icon">${firstLetter}</div>
                    </div>
                    <span>${item.name}</span>
                </a>`;
        }).join('');

        section.innerHTML = `<h3 class="section-title">📂 ${folder.name}</h3><div class="grid">${cardsHtml}</div>`;
        navDisplay.appendChild(section);
    }

    if (window.bookmarkData) {
        navList.innerHTML = '';
        navDisplay.innerHTML = '';
        createTreeMenu(window.bookmarkData, navList, 0);
    }
});
// --- Service Worker 统一管理 ---
if ('serviceWorker' in navigator) {
    // 1. 先设置监听器：确保 SW 一旦发出“更新”信号，页面能立刻接到
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
            console.log('检测到新数据，正在同步...');
            // 弹出提示，点击确定后刷新页面展示新书签
            if (confirm('书签数据已更新，是否立即刷新查看新内容？')) {
                location.reload();
            }
        }
    });

    // 2. 再注册 SW：让它开始在后台干活
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW 注册成功，范围:', reg.scope))
            .catch(err => console.error('SW 注册失败:', err));
    });
}