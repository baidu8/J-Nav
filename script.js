/**
 * J-Nav 核心逻辑
 * 修复了返回顶部、气泡通知以及初始化渲染逻辑
 */

// 1. 全局辅助函数 (放在最外面，确保任何时候都能被调用)
window.handleIconError = function(imgElement) {
    if (!imgElement) return;
    const container = imgElement.parentElement;
    if (container && !container.classList.contains('no-icon')) {
        container.classList.add('no-icon');
        imgElement.style.display = 'none';
        const colors = ['#4A90E2', '#50E3C2', '#F5A623', '#D0021B', '#9013FE', '#7ED321', '#FB7299'];
        container.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // --- 元素获取 ---
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    const navList = document.getElementById('nav-list');
    const navDisplay = document.getElementById('nav-display');
    const btnPcTop = document.getElementById('back-to-top-pc');
    const btnMobileTop = document.getElementById('back-to-top-mobile');
    const engineSelector = document.getElementById('engine-selector');
    const engineList = document.getElementById('engine-list');
    const currentEngineIcon = document.getElementById('current-engine-icon');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    // --- 搜索功能 ---
    let currentSearchUrl = "https://www.google.com/search?q=";

    if (engineSelector) {
        engineSelector.addEventListener('click', (e) => {
            e.stopPropagation();
            engineList.classList.toggle('show');
        });
    }

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
        if (query) window.open(currentSearchUrl + encodeURIComponent(query), '_blank');
    }

    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') doSearch(); });
    document.addEventListener('click', () => engineList.classList.remove('show'));

    // --- 导航与侧边栏逻辑 ---
    function scrollToTop() { 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    }
    
    if (btnPcTop) btnPcTop.onclick = scrollToTop;
    if (btnMobileTop) btnMobileTop.onclick = scrollToTop;

    window.addEventListener('scroll', () => {
        if (btnPcTop) {
            btnPcTop.style.display = window.scrollY > 300 ? 'flex' : 'none';
        }
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

    // --- 渲染逻辑 ---
    let folderCounter = 0;

    function createTreeMenu(items, container, level = 0) {
        items.forEach((item, index) => {
            if (item.type === 'folder') {
                const folderId = `folder-sec-${folderCounter++}`;
                const wrapper = document.createElement('div');
                wrapper.className = 'folder-wrapper';
                
                // 入场动画逻辑
                if (level === 0) {
                    wrapper.style.animationDelay = (index * 0.08) + 's';
                    wrapper.classList.add('open'); // 默认展开第一层
                } else {
                    wrapper.style.opacity = "1";
                    wrapper.style.animation = "none";
                }
    
                // 创建标题栏
                const header = document.createElement('div');
                header.className = 'nav-item folder-header';
                const hasSubFolders = item.children && item.children.some(child => child.type === 'folder');
                const hasDirectBookmarks = item.children && item.children.some(child => child.type === 'bookmark' || child.url);
                const arrowHtml = hasSubFolders ? `<span class="arrow">▶</span>` : `<span></span>`;
                header.innerHTML = `<span>${item.name}</span>${arrowHtml}`;
                
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
    
                // --- 结构重建：关键区 ---
                const subMenu = document.createElement('div');
                subMenu.className = 'sub-menu';
                
                const subMenuInner = document.createElement('div'); 
                subMenuInner.className = 'sub-menu-inner'; // 这里是真正装东西的地方
                
                wrapper.appendChild(header);
                wrapper.appendChild(subMenu);    // 外层进 wrapper
                subMenu.appendChild(subMenuInner); // 内层进外层
                container.appendChild(wrapper);
    
                // 渲染右侧内容
                renderSection(item, folderId);
                
                // 递归：必须把 subMenuInner 传下去，子文件夹才会显示在里面
                if (item.children) {
                    createTreeMenu(item.children, subMenuInner, level + 1);
                }
            }
        });
    }

    function renderSection(folder, id) {
        const bookmarks = folder.children.filter(i => i.type === 'bookmark' || i.url);
        if (bookmarks.length === 0) return;

        const section = document.createElement('section');
        section.id = id;
        section.className = 'section';

        const cardsHtml = bookmarks.map((item, index) => { // 注意这里新增了 index 参数
                let domain = "";
                try { domain = new URL(item.url).hostname; } catch(e) { domain = "link"; }
        
                const iconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
                const firstLetter = item.name ? item.name.charAt(0).toUpperCase() : '?';
                const imgId = `img-${Math.random().toString(36).substr(2, 9)}`;
        
                setTimeout(() => {
                    const img = document.getElementById(imgId);
                    if (img && !img.complete) window.handleIconError(img);
                }, 2000);
        
                // --- 核心修改：添加 animation-delay ---
                const delay = (index * 0.05) + 's'; // 每个卡片延迟 0.05 秒
        
                return `
                    <a href="${item.url}" class="card" target="_blank" title="${item.name}" style="animation-delay: ${delay};">
                        <div class="icon-container">
                            <img id="${imgId}" src="${iconUrl}" class="favicon" onload="this.style.opacity=1" onerror="handleIconError(this)">
                            <div class="letter-icon">${firstLetter}</div>
                        </div>
                        <span>${item.name}</span>
                    </a>`;
            }).join('');

        section.innerHTML = `<h3 class="section-title">${folder.name}</h3><div class="grid">${cardsHtml}</div>`;
        navDisplay.appendChild(section);
    }

    // 初始化渲染
    if (window.bookmarkData) {
        navList.innerHTML = '';
        navDisplay.innerHTML = '';
        createTreeMenu(window.bookmarkData, navList, 0);
    }
});

// --- Service Worker 独立逻辑 ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
            const toast = document.getElementById('update-toast');
            if (toast) {
                toast.classList.remove('toast-hidden');
            } else if (confirm('书签数据已更新，是否刷新查看？')) {
                location.reload();
            }
        }
    });

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Failed', err));
    });
}