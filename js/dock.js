(function() {
    const dock = document.getElementById('bottom-dock');
    const items = document.querySelectorAll('.dock-item');
    const trigger = document.getElementById('dock-trigger');

    // --- PC端鱼眼缩放 ---
    const isMobile = () => window.innerWidth <= 768;

    if (dock) {
        dock.addEventListener('mousemove', (e) => {
            if (isMobile()) return; // 手机端禁用缩放逻辑

            const mouseX = e.clientX;
            const range = 120; // 感应范围
            const maxScale = 1.5; // 最大倍率

            items.forEach(item => {
                const rect = item.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const distance = Math.abs(mouseX - centerX);

                if (distance < range) {
                    // 使用余弦函数平滑曲线
                    const cosFactor = Math.cos((distance / range) * (Math.PI / 2));
                    const scale = 1 + (maxScale - 1) * cosFactor;
                    item.style.transform = `scale(${scale}) translateY(-${(scale - 1) * 15}px)`;
                } else {
                    item.style.transform = "scale(1) translateY(0)";
                }
            });
        });

        dock.addEventListener('mouseleave', () => {
            items.forEach(item => {
                item.style.transform = "scale(1) translateY(0)";
            });
        });
    }

    // --- 手机端切换逻辑 ---
    window.toggleDock = function() {
        if (!dock) return;
        dock.classList.toggle('active');
    };

    // 点击外部自动收起
    document.addEventListener('click', (e) => {
        if (isMobile() && dock.classList.contains('active')) {
            if (!dock.contains(e.target) && !trigger.contains(e.target)) {
                dock.classList.remove('active');
            }
        }
    });
})();