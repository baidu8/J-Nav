# J-Nav | 极简高清个人导航站

J-Nav 是一个基于 HTML/CSS/JS 的轻量级、极简风格个人导航站。它专为追求极致加载速度和高清视觉体验的用户设计，支持 PWA（可安装至桌面）、响应式布局以及多种搜索引擎切换。



## ✨ 特性亮点

- 🚀 **极致速度**：无重度框架，原生 JS 编写，国内环境深度优化，图标秒级加载。
- 💎 **高清视觉**：全矢量 Logo (SVG) 支持，在 4K 屏幕及移动端依然锐利。
- 📱 **全平台适配**：
    - **PC 端**：经典侧边栏导航，支持分类折叠。
    - **移动端**：完美居中布局，支持双栏卡片显示。
- 🛠️ **智能图标**：内置图标加载策略，自动抓取 Favicon，失败时自动切换为彩色文字头像。
- 📦 **PWA 支持**：可作为独立应用安装至 Web 端及手机桌面，拥有原生 App 般的启动体验。
- 🔍 **多引擎搜索**：集成 Google、必应、百度，支持回车一键搜索。

## 🚀 快速开始

1. 克隆项目
```bash
git clone [https://github.com/baidu8/J-Nav.git](https://github.com/baidu8/J-Nav.git)
```
2. 修改配置
打开 data.js，按照现有格式修改为你自己的书签数据：
```js
window.bookmarkData = [
    {
        name: "常用工具",
        type: "folder",
        children: [
            { name: "GitHub", url: "[https://github.com](https://github.com)" },
            // 添加更多链接...
        ]
    }
];
```
3. 本地预览
直接双击 index.html 即可运行。
```Plaintext
J-Nav/
├── icons/               # 图标资源 (SVG Logo, 搜索引擎图标)
├── index.html           # 首页 (建议由 nav.html 更名而来)
├── style.css            # 响应式样式表
├── script.js            # 核心交互逻辑
├── data.js              # 你的书签数据
├── site.webmanifest     # PWA 配置文件
└── README.md            # 项目说明
```
## 🛠️ 技术细节
图标源：默认采用国内稳定的 API 镜像，规避了国外服务（如 DuckDuckGo）加载慢导致标签页转圈的问题。

布局：采用 Flexbox 与 Grid 混合布局，确保在不同分辨率下的兼容性。

性能：优化了图片加载逻辑，设置了 2s 异常自动处理。

📄 开源协议
本项目采用 MIT License 协议。