# My Markdown — 产品与技术规格说明书

> **目标**：在 Win10 上实现一个类似 Typora 体验的 Markdown 编辑器
> **文档用途**：供 Trae 基于此文档进行开发实现
> **版本**：v1.0 (MVP)
> **日期**：2026-07-31

---

## 1. 项目概述

### 1.1 产品定位
一个 Win10 桌面 Markdown 编辑器，提供类似 Typora 的所见即所得（WYSIWYG）编辑体验，支持多标签页、文件关联、图片本地化、导出等核心功能。

### 1.2 核心体验
- **即时渲染（ir）模式**：输入 Markdown 后光标离开即渲染为最终样式，与 Typora 体验一致
- **多模式切换**：ir（即时渲染）/ sv（分屏预览）/ wysiwyg（所见即所得）三种模式自由切换
- **多标签页**：单窗口同时编辑多个文件
- **文件关联**：双击 .md 文件直接用本应用打开
- **图片本地化**：粘贴图片自动保存到文档同目录的 `assets/` 文件夹

### 1.3 目标平台
- Windows 10 (x64)
- 不需要支持 macOS / Linux（v1）

---

## 2. 技术栈

| 类别 | 选型 | 版本 |
|---|---|---|
| **应用框架** | Electron | ^28.x |
| **构建工具** | electron-vite | ^2.x |
| **打包工具** | electron-builder | ^24.x |
| **前端框架** | React | ^18.x |
| **语言** | TypeScript | ^5.x |
| **编辑器内核** | Vditor | ^3.x |
| **状态管理** | Zustand | ^4.x |
| **UI 组件库** | shadcn/ui | 按需引入 |
| **样式方案** | Tailwind CSS | ^3.x (class 策略 dark mode) |
| **图标库** | lucide-react | ^0.3xx |
| **日志** | electron-log | ^5.x |

### 2.1 依赖原则
- **零业务依赖优先**：能用原生 fs 完成的，不引入第三方包
- **TS 友好**：所有选型必须支持 TypeScript
- **electron-vite 默认集成**：能复用 electron-vite 脚手架的尽量复用

---

## 3. 功能清单（MVP v1.0）

### 3.1 文件操作
- 新建文件（Ctrl+N）
- 打开文件（Ctrl+O）
- 保存文件（Ctrl+S）— 未保存路径则触发另存为
- 另存为（Ctrl+Shift+S）
- 自动保存（防抖 3 秒 + 失焦保存，可在设置中关闭）
- 文件关联（.md / .markdown 后缀）
- 命令行打开文件（`my-markdown.exe <file>`）

### 3.2 编辑器核心
- Markdown 实时渲染（Vditor 内置）
- 三模式切换：ir / sv / wysiwyg（默认 ir）
- 大纲面板（基于 H1-H6，可显示/隐藏）
- 字数统计（字符数 / 词数）
- 撤销/重做（Vditor 内置）
- 查找替换（Vditor 内置）

### 3.3 导入导出
- 导出 HTML（Vditor getHTML + 内联 CSS，单文件自包含）
- 导出 PDF（Electron `webContents.printToPDF`）
- 导出 Markdown（复用另存为逻辑）
- 导出统一走"另存为"对话框，默认文件名 `<原文件名>.html` / `.pdf` / `.md`

### 3.4 图片处理
- 粘贴图片自动本地化到 `<文档同目录>/assets/`
- 拖拽图片支持
- 图片命名格式：`image-YYYYMMDD-HHmmss.png`
- 同名文件追加 `-1`、`-2`
- 新文件未保存时，粘贴图片前弹窗提示"请先保存文档"
- 可在设置中关闭"图片本地化"（保留原 URL/剪贴板临时路径）

### 3.5 外观与主题
- 亮色 / 暗色 / 跟随系统（三选）
- 主题切换实现：`<html class="dark">` + Tailwind `dark:` 前缀 + CSS Variables
- CSS Variables 同时供 Vditor 主题使用，保证编辑器内外一致

### 3.6 应用框架
- 多标签页（顶部水平标签栏）
- 标签页未保存提示（标题前圆点 `●`）
- 关闭未保存文件时弹窗：保存 / 不保存 / 取消
- 退出应用时批量弹窗列出所有未保存文件
- 标签右键菜单：关闭 / 关闭其他 / 关闭所有 / 复制路径 / 在资源管理器中打开
- 编辑器右键菜单：剪切 / 复制 / 粘贴 / 插入图片 / 插入表格 / 在资源管理器中打开
- 启动恢复上次会话（记住上次打开的文件，文件丢失则跳过）
- 快捷键系统（详见第 7 章）
- 设置面板（模态对话框，详见第 8 章）

### 3.7 不在 v1 范围
- 系统托盘
- 自动更新
- 国际化（仅中文）
- 自定义 CSS 主题
- 最近文件列表（v1.1）
- 标签拖拽重排序（v1.1）
- 嵌入 Base64 图片
- HTML 导入
- 图片导出 PNG
- 代码签名
- Microsoft Store 上架

---

## 4. 系统架构

### 4.1 进程模型

```
┌─────────────────────────────────────────┐
│  主进程 (main)                          │
│  - 窗口创建与生命周期                    │
│  - 菜单构建                              │
│  - 文件读写 (fs)                        │
│  - 对话框 (dialog)                      │
│  - 配置持久化 (userData/config.json)    │
│  - 日志 (electron-log)                  │
│  - 单实例锁 + 第二实例文件转发          │
│  - 文件关联启动                         │
│  - PDF 导出 (printToPDF)                │
└──────────────┬──────────────────────────┘
               │ contextBridge (严格隔离)
               │ contextIsolation: true
               │ nodeIntegration: false
               │ sandbox: true
┌──────────────┴──────────────────────────┐
│  预加载脚本 (preload)                    │
│  - 暴露 window.api 给渲染进程           │
│  - ipcRenderer.invoke 封装               │
└──────────────┬──────────────────────────┘
               │ IPC (ipcMain / ipcRenderer)
┌──────────────┴──────────────────────────┐
│  渲染进程 (renderer) - React            │
│  - UI 渲染                              │
│  - Vditor 编辑器                        │
│  - 状态管理 (Zustand)                   │
│  - 快捷键监听                           │
└─────────────────────────────────────────┘
```

### 4.2 安全配置（必须严格遵守）

```typescript
// 主进程 BrowserWindow 配置
new BrowserWindow({
  webPreferences: {
    contextIsolation: true,    // 必须 true
    nodeIntegration: false,     // 必须 false
    sandbox: true,             // 必须 true
    preload: path.join(__dirname, '../preload/index.js'),
    webSecurity: true,         // 默认 true，不要关闭
  }
})
```

**CSP 设置**（在 index.html 的 meta 标签中）：
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: file: https:; 
               font-src 'self' data:;">
```

- 禁用 `<webview>` 标签
- 禁用 `webSecurity: false`
- preload 中仅暴露必要 API，不暴露 fs / child_process

### 4.3 IPC 通道命名规范
- 主进程 → 渲染进程：`on:xxx`（如 `on:file-opened`）
- 渲染进程 → 主进程：`invoke:xxx`（如 `invoke:file-open`）
- 所有 IPC 通道在 preload 中通过 contextBridge 暴露，渲染进程不直接使用 ipcRenderer

---

## 5. 目录结构

```
my-markdown/
├── electron.vite.config.ts          # electron-vite 配置
├── electron-builder.yml              # 打包配置（NSIS + Portable）
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── resources/
│   ├── icon.ico                     # 应用图标（临时占位 "M" 字母图标）
│   └── md-icon.ico                  # .md 文件关联图标
└── src/
    ├── main/                        # 主进程
    │   ├── index.ts                 # 应用入口、窗口创建、单实例锁
    │   ├── menu.ts                  # 应用菜单构建
    │   ├── ipc/
    │   │   ├── file.ts              # 文件读写、另存为对话框
    │   │   ├── dialog.ts            # 打开/保存对话框
    │   │   ├── config.ts            # 配置读写 IPC
    │   │   ├── export.ts            # HTML/PDF/MD 导出
    │   │   ├── image.ts             # 图片本地化
    │   │   └── window.ts            # 窗口控制、会话恢复
    │   ├── lib/
    │   │   ├── fileSystem.ts        # fs 封装（原子写入）
    │   │   ├── config.ts           # config.json 读写（deepMerge 默认值）
    │   │   ├── logger.ts            # electron-log 封装
    │   │   └── session.ts          # 上次会话记录与恢复
    │   └── singleInstance.ts        # 单实例锁与文件转发
    ├── preload/
    │   ├── index.ts                 # contextBridge 暴露 window.api
    │   └── api.d.ts                 # 渲染进程可用的 API 类型定义
    └── renderer/
        ├── index.html               # 含 CSP meta
        └── src/
            ├── main.tsx             # React 入口
            ├── App.tsx              # 根组件（标签栏 + 编辑器 + 大纲）
            ├── components/
            │   ├── Editor/
            │   │   ├── VditorEditor.tsx       # Vditor 封装
            │   │   └── EditorContextMenu.tsx  # 编辑器右键菜单
            │   ├── Tabs/
            │   │   ├── FileTabs.tsx           # 顶部标签栏
            │   │   ├── TabItem.tsx            # 单个标签
            │   │   └── TabContextMenu.tsx     # 标签右键菜单
            │   ├── Outline/
            │   │   └── OutlinePanel.tsx       # 大纲面板
            │   ├── Settings/
            │   │   └── SettingsDialog.tsx     # 设置对话框
            │   ├── Export/
            │   │   └── ExportDialog.tsx       # 导出进度对话框（PDF 异步）
            │   └── ui/                         # shadcn/ui 组件
            │       ├── dialog.tsx
            │       ├── dropdown-menu.tsx
            │       ├── tabs.tsx
            │       ├── select.tsx
            │       ├── slider.tsx
            │       ├── switch.tsx
            │       ├── input.tsx
            │       └── context-menu.tsx
            ├── hooks/
            │   ├── useVditor.ts                # Vditor 实例管理
            │   ├── useFileSystem.ts            # 文件读写 hook
            │   ├── useTabs.ts                  # 多标签状态
            │   ├── useAutoSave.ts              # 自动保存（防抖 + 失焦）
            │   ├── useShortcut.ts              # 快捷键监听
            │   └── useTheme.ts                 # 主题切换 + 跟随系统
            ├── store/
            │   ├── fileStore.ts               # 打开的文件列表、当前激活标签
            │   └── settingsStore.ts            # 设置状态（与主进程 config 同步）
            ├── types/
            │   ├── file.ts                    # FileTab、FileStatus 类型
            │   ├── config.ts                  # AppConfig 类型
            │   └── vite-env.d.ts
            ├── utils/
            │   ├── ipc.ts                     # window.api 封装
            │   ├── path.ts                    # 路径工具
            │   └── fileName.ts                # 图片命名生成器
            └── styles/
                ├── global.css                 # 全局样式 + Tailwind 指令
                └── themes/
                    ├── light.css              # 亮色主题变量
                    ├── dark.css               # 暗色主题变量
                    └── vditor-theme.css        # Vditor 主题适配
```

---

## 6. 数据模型

### 6.1 FileTab（标签页数据）

```typescript
// src/renderer/src/types/file.ts
export interface FileTab {
  id: string                  // 唯一 ID（uuid 或 timestamp）
  path: string | null         // 文件绝对路径，未保存则为 null
  content: string             // 当前编辑器内容（Markdown 源码）
  originalContent: string     // 上次保存的内容，用于判断是否修改
  name: string                // 标签显示名（文件名或"新建文档"）
  isDirty: boolean            // 是否有未保存修改（content !== originalContent）
  mode: VditorMode            // 当前编辑模式
  scrollPosition: number      // 滚动位置（切换标签时恢复）
  cursorPosition?: object     // 光标位置（可选）
}

export type VditorMode = 'ir' | 'sv' | 'wysiwyg'
```

### 6.2 AppConfig（配置数据）

```typescript
// src/renderer/src/types/config.ts
export interface AppConfig {
  editor: {
    defaultMode: 'ir' | 'sv' | 'wysiwyg'
    fontSize: number              // 12-24
    fontFamily: string
    codeTheme: string             // github / dark / monokai...
    tabSize: 2 | 4 | 8
    showLineNumber: boolean       // sv 模式行号
  }
  save: {
    autoSave: boolean
    autoSaveInterval: number      // 1-60 秒
    saveOnBlur: boolean
  }
  image: {
    localize: boolean
    directory: string             // 默认 "assets"
    namingPattern: string         // 默认 "image-YYYYMMDD-HHmmss"
  }
  appearance: {
    theme: 'light' | 'dark' | 'auto'
    windowSize: { width: number; height: number }
  }
  session: {
    restoreOnStartup: boolean
    lastOpenFiles: string[]       // 上次打开的文件路径列表
  }
}

// 默认配置
export const DEFAULT_CONFIG: AppConfig = {
  editor: {
    defaultMode: 'ir',
    fontSize: 16,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
    codeTheme: 'github',
    tabSize: 4,
    showLineNumber: true,
  },
  save: {
    autoSave: true,
    autoSaveInterval: 3,
    saveOnBlur: true,
  },
  image: {
    localize: true,
    directory: 'assets',
    namingPattern: 'image-YYYYMMDD-HHmmss',
  },
  appearance: {
    theme: 'auto',
    windowSize: { width: 1200, height: 800 },
  },
  session: {
    restoreOnStartup: true,
    lastOpenFiles: [],
  },
}
```

### 6.3 配置文件存储
- 路径：`app.getPath('userData')/config.json`
- 写入策略：原子写入（临时文件 + rename）
- 读取策略：读取后与 DEFAULT_CONFIG deepMerge，补充新增字段

---

## 7. 快捷键清单

### 7.1 快捷键完整列表

| 分类 | 功能 | 快捷键 | 实现方 |
|---|---|---|---|
| 文件 | 新建 | `Ctrl+N` | 渲染进程 |
| 文件 | 打开 | `Ctrl+O` | 主进程 dialog |
| 文件 | 保存 | `Ctrl+S` | 主进程 fs |
| 文件 | 另存为 | `Ctrl+Shift+S` | 主进程 dialog + fs |
| 文件 | 关闭标签 | `Ctrl+W` | 渲染进程 |
| 文件 | 退出 | `Ctrl+Q` / `Alt+F4` | 主进程 |
| 编辑 | 撤销 | `Ctrl+Z` | Vditor 内置 |
| 编辑 | 重做 | `Ctrl+Y` / `Ctrl+Shift+Z` | Vditor 内置 |
| 编辑 | 查找 | `Ctrl+F` | Vditor 内置 |
| 编辑 | 替换 | `Ctrl+H` | Vditor 内置 |
| 模式 | 切换 ir/sv/wysiwyg | `Ctrl+/` | 渲染进程 |
| 视图 | 主题切换 | `Ctrl+Alt+T` | 渲染进程 |
| 视图 | 大纲面板开关 | `Ctrl+Shift+O` | 渲染进程 |
| 视图 | 全屏 | `F11` | Electron 内置 |
| 视图 | 放大 | `Ctrl+=` | Electron 内置 zoom |
| 视图 | 缩小 | `Ctrl+-` | Electron 内置 zoom |
| 视图 | 重置缩放 | `Ctrl+0` | Electron 内置 zoom |
| 插入 | 粗体 | `Ctrl+B` | Vditor 内置 |
| 插入 | 斜体 | `Ctrl+I` | Vditor 内置 |
| 插入 | 链接 | `Ctrl+K` | Vditor 内置 |
| 插入 | 图片 | `Ctrl+Shift+I` | Vditor + 图片本地化 |
| 插入 | 代码块 | `Ctrl+Shift+K` | Vditor 内置 |
| 插入 | 表格 | `Ctrl+T` | Vditor 内置 |
| 插入 | 公式 | `Ctrl+Shift+M` | Vditor 内置 |
| 导出 | 导出 HTML | `Ctrl+Shift+E` | 主进程 |
| 导出 | 导出 PDF | `Ctrl+Shift+P` | 主进程 |
| 导出 | 导出 Markdown | 无快捷键（菜单触发） | 主进程 |

### 7.2 实现说明
- 渲染进程快捷键：用 `mousetrap` 或原生 `keydown` 监听
- Vditor 内置快捷键：通过 Vditor 配置项开启
- 主进程快捷键：菜单 accelerator 注册
- **不使用 globalShortcut**（避免影响其他应用）

---

## 8. 设置面板

### 8.1 UI 形式
- 模态对话框（shadcn/ui Dialog）
- 居中弹出，遮罩背景
- 关闭后返回编辑

### 8.2 配置项分组

**编辑器**
- 默认编辑模式：Select（ir / sv / wysiwyg）
- 字号：Slider（12-24）
- 字体族：Input
- 代码主题：Select（github / dark / monokai...）
- Tab 空格数：Select（2 / 4 / 8）
- 显示行号（sv 模式）：Switch

**保存**
- 自动保存：Switch
- 自动保存间隔：Slider（1-60 秒，自动保存关闭时禁用）
- 失焦自动保存：Switch

**图片**
- 图片本地化：Switch
- 图片存放目录名：Input（默认 "assets"）
- 图片命名格式：Input

**外观**
- 主题：Select（亮色 / 暗色 / 跟随系统）
- （窗口大小不可在设置中改，仅记住上次状态）

**会话**
- 启动恢复上次会话：Switch

### 8.3 保存策略
- 设置变更实时保存到主进程 config.json
- 主题变更立即生效（切换 `<html>` 的 dark class）
- 字号变更立即生效（更新 Vditor 配置）

---

## 9. 应用菜单结构

```
文件 (File)
├── 新建                          Ctrl+N
├── 打开                          Ctrl+O
├── 保存                          Ctrl+S
├── 另存为                        Ctrl+Shift+S
├── ─────────────
├── 导出
│   ├── HTML                      Ctrl+Shift+E
│   ├── PDF                       Ctrl+Shift+P
│   └── Markdown
├── ─────────────
└── 退出                          Ctrl+Q

编辑 (Edit)
├── 撤销                          Ctrl+Z
├── 重做                          Ctrl+Y
├── ─────────────
├── 查找                          Ctrl+F
└── 替换                          Ctrl+H

视图 (View)
├── 编辑模式
│   ├── 即时渲染 (ir)
│   ├── 分屏预览 (sv)
│   └── 所见即所得 (wysiwyg)
├── ─────────────
├── 主题
│   ├── 亮色
│   ├── 暗色
│   └── 跟随系统
├── ─────────────
├── 大纲面板                      Ctrl+Shift+O
├── ─────────────
├── 放大                          Ctrl+=
├── 缩小                          Ctrl+-
└── 重置缩放                      Ctrl+0

插入 (Insert)
├── 粗体                          Ctrl+B
├── 斜体                          Ctrl+I
├── 链接                          Ctrl+K
├── 图片                          Ctrl+Shift+I
├── 代码块                        Ctrl+Shift+K
├── 表格                          Ctrl+T
└── 公式                          Ctrl+Shift+M

帮助 (Help)
├── 快捷键参考
└── 关于
```

### 实现说明
- 菜单由主进程 `Menu.buildFromTemplate` 构建
- 菜单项点击通过 IPC 转发到渲染进程执行
- "关于"用 `dialog.showMessageBox` 显示版本号、Electron 版本、Vditor 版本
- "快捷键参考"v1 用 `dialog.showMessageBox` 列出，v1.1 可做 HTML 页面

---

## 10. 文件关联与启动行为

### 10.1 文件关联注册
通过 electron-builder.yml 配置：

```yaml
fileAssociations:
  - ext: md
    name: Markdown
    description: Markdown 文件
    role: Editor
    icon: resources/md-icon.ico
  - ext: markdown
    name: Markdown
    role: Editor
    icon: resources/md-icon.ico
```

### 10.2 单实例 + 新标签
- 使用 `app.requestSingleInstanceLock()` 实现单实例
- 第二实例启动时，将文件路径通过 `second-instance` 事件发给主实例
- 主实例收到文件路径后，在现有窗口中打开新标签
- 实现：`src/main/singleInstance.ts`

### 10.3 命令行启动
```bash
my-markdown.exe C:\path\to\note.md    # 打开指定文件
```
- 监听 `app.on('open-file')` 事件（macOS）和 `process.argv`（Win10）
- 仅支持文件参数，不支持 `--new` / `--version` 等命令

### 10.4 启动会话恢复
- 退出时记录打开的文件路径列表到 `config.session.lastOpenFiles`
- 启动时若 `config.session.restoreOnStartup === true`，依次打开这些文件
- 文件被移动/删除时优雅降级：跳过该文件，不报错，记录日志

---

## 11. 图片本地化流程

### 11.1 流程
```
用户粘贴图片
    ↓
渲染进程检测当前文件是否已保存
    ↓
未保存 → 弹窗提示"请先保存文档" → 中止
    ↓
已保存
    ↓
读取 config.image.localize
    ↓
localize === false → 保留原 URL/临时路径，插入 Markdown
    ↓
localize === true
    ↓
计算目标目录：path.dirname(currentFilePath) + '/' + config.image.directory
    ↓
若目录不存在，创建
    ↓
生成图片名：image-YYYYMMDD-HHmmss.png
    ↓
若同名文件已存在，追加 -1、-2...
    ↓
写入图片文件
    ↓
插入 Markdown 引用：![image](assets/xxx.png)
```

### 11.2 图片来源
- 剪贴板粘贴（截图）
- 拖拽图片文件到编辑器
- 拖拽图片文件到应用窗口（自动复制到 assets）

---

## 12. 导出实现

### 12.1 HTML 导出
1. 调用 `vditor.getHTML()` 获取渲染后 HTML
2. 读取当前主题 CSS（亮色 / 暗色）
3. 模板拼接：`<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`
4. 弹"另存为"对话框，默认文件名 `<原文件名>.html`
5. 写入文件

### 12.2 PDF 导出
1. 在主进程创建隐藏 BrowserWindow
2. 加载渲染后的 HTML（复用 HTML 导出结果）
3. 注入打印样式 CSS：`@media print` 控制分页，避免代码块被截断
4. 调用 `webContents.printToPDF({ pageSize: 'A4', marginType: 0 })`
5. 弹"另存为"对话框，默认文件名 `<原文件名>.pdf`
6. 写入文件
7. 显示进度对话框（PDF 生成可能耗时 1-2 秒）

### 12.3 Markdown 导出
1. 调用 `vditor.getValue()` 获取 Markdown 源码
2. 弹"另存为"对话框，默认文件名 `<原文件名>.md`
3. 写入文件

---

## 13. 主题实现

### 13.1 CSS Variables 定义

```css
/* styles/themes/light.css */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e8e8e8;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --border-color: #e0e0e0;
  --accent: #0066cc;
  --code-bg: #f8f8f8;
  --editor-bg: #ffffff;
  --editor-text: #1a1a1a;
}

/* styles/themes/dark.css */
html.dark {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d2d;
  --text-primary: #d4d4d4;
  --text-secondary: #888888;
  --border-color: #3c3c3c;
  --accent: #4daafc;
  --code-bg: #1e1e1e;
  --editor-bg: #1e1e1e;
  --editor-text: #d4d4d4;
}
```

### 13.2 Tailwind dark mode 配置

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class',  // class 策略
  content: ['./src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
        },
      },
    },
  },
}
```

### 13.3 Vditor 主题适配
- Vditor 主题切换通过 `vditor.setTheme('dark')` / `'classic'`
- 自定义 CSS 覆盖 Vditor 变量，使其使用应用的 CSS Variables
- 文件：`styles/themes/vditor-theme.css`

### 13.4 主题切换逻辑
```typescript
// useTheme.ts
function applyTheme(theme: 'light' | 'dark' | 'auto') {
  if (theme === 'auto') {
    const isDark = nativeTheme.shouldUseDarkColors
    document.documentElement.classList.toggle('dark', isDark)
    vditor.setTheme(isDark ? 'dark' : 'classic')
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    vditor.setTheme(theme === 'dark' ? 'dark' : 'classic')
  }
}
```

---

## 14. 打包配置

### 14.1 electron-builder.yml

```yaml
appId: com.my-markdown.app
productName: My Markdown
copyright: Copyright © 2026
directories:
  output: dist
  buildResources: resources
files:
  - out/**/*
win:
  target:
    - target: nsis
    - target: portable
  icon: resources/icon.ico
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: My Markdown
portable:
  artifactName: MyMarkdown-Portable-${version}.exe
fileAssociations:
  - ext: md
    name: Markdown
    description: Markdown 文件
    role: Editor
    icon: resources/md-icon.ico
  - ext: markdown
    name: Markdown
    role: Editor
    icon: resources/md-icon.ico
```

### 14.2 应用元信息

| 字段 | 值 |
|---|---|
| 应用名称 | My Markdown |
| 产品名称 | My Markdown |
| 应用 ID | com.my-markdown.app |
| 版本号 | 0.1.0 |
| 描述 | 类似 Typora 的 Markdown 编辑器 |
| 版权 | Copyright © 2026 |

### 14.3 签名
- v1 不签名
- Win10 SmartScreen 首次运行会提示，用户点击"仍要运行"即可
- 在 README 中说明此现象

---

## 15. 开发任务分解

### Phase 1：项目脚手架（必须先完成）
1. 初始化 electron-vite 项目
2. 配置 TypeScript（tsconfig.json / tsconfig.node.json / tsconfig.web.json）
3. 配置 Tailwind CSS + dark mode
4. 初始化 shadcn/ui（添加所需组件：dialog / dropdown-menu / tabs / select / slider / switch / input / context-menu）
5. 配置 electron-builder.yml
6. 配置 electron-log
7. 创建目录结构骨架
8. 准备 resources/icon.ico（临时 "M" 图标）和 resources/md-icon.ico

### Phase 2：主进程基础
9. 实现 `src/main/index.ts`：应用入口、窗口创建、安全配置
10. 实现 `src/main/lib/config.ts`：config.json 读写（原子写入 + deepMerge 默认值）
11. 实现 `src/main/lib/fileSystem.ts`：fs 封装（readFile / writeFile 原子写入）
12. 实现 `src/main/lib/logger.ts`：electron-log 封装
13. 实现 `src/main/singleInstance.ts`：单实例锁
14. 实现 `src/main/menu.ts`：应用菜单构建

### Phase 3：IPC 与 Preload
15. 实现 `src/preload/index.ts`：contextBridge 暴露 window.api
16. 实现 `src/preload/api.d.ts`：API 类型定义
17. 实现 `src/main/ipc/file.ts`：文件读写 IPC
18. 实现 `src/main/ipc/dialog.ts`：打开/保存对话框 IPC
19. 实现 `src/main/ipc/config.ts`：配置读写 IPC
20. 实现 `src/main/ipc/image.ts`：图片本地化 IPC
21. 实现 `src/main/ipc/export.ts`：HTML/PDF/MD 导出 IPC
22. 实现 `src/main/ipc/window.ts`：窗口控制、会话恢复 IPC

### Phase 4：渲染进程基础
23. 实现 `src/renderer/src/main.tsx`：React 入口
24. 实现 `src/renderer/src/App.tsx`：根组件布局（标签栏 + 编辑器 + 大纲）
25. 实现 `src/renderer/src/store/fileStore.ts`：Zustand 文件状态
26. 实现 `src/renderer/src/store/settingsStore.ts`：Zustand 设置状态
27. 实现 `src/renderer/src/hooks/useFileSystem.ts`：文件读写 hook
28. 实现 `src/renderer/src/utils/ipc.ts`：window.api 封装

### Phase 5：编辑器集成
29. 实现 `src/renderer/src/hooks/useVditor.ts`：Vditor 实例管理
30. 实现 `src/renderer/src/components/Editor/VditorEditor.tsx`：Vditor 组件封装
31. 配置 Vditor：三模式（默认 ir）、工具栏、主题、字号、代码高亮
32. 实现 `src/renderer/src/hooks/useTheme.ts`：主题切换 + 跟随系统
33. 实现 `styles/themes/light.css` 和 `dark.css`：CSS Variables
34. 实现 `styles/themes/vditor-theme.css`：Vditor 主题适配

### Phase 6：多标签页
35. 实现 `src/renderer/src/components/Tabs/FileTabs.tsx`：顶部标签栏
36. 实现 `src/renderer/src/components/Tabs/TabItem.tsx`：单个标签（含未保存圆点提示）
37. 实现 `src/renderer/src/hooks/useTabs.ts`：标签状态管理
38. 实现 `src/renderer/src/components/Tabs/TabContextMenu.tsx`：标签右键菜单
39. 实现关闭未保存拦截：单标签关闭弹窗 + 退出批量弹窗

### Phase 7：编辑器交互
40. 实现 `src/renderer/src/components/Outline/OutlinePanel.tsx`：大纲面板
41. 实现 `src/renderer/src/hooks/useAutoSave.ts`：防抖 + 失焦自动保存
42. 实现 `src/renderer/src/hooks/useShortcut.ts`：快捷键监听
43. 实现 `src/renderer/src/components/Editor/EditorContextMenu.tsx`：编辑器右键菜单
44. 实现图片粘贴本地化：剪贴板粘贴 + 拖拽
45. 实现 `src/renderer/src/utils/fileName.ts`：图片命名生成器

### Phase 8：设置与导出
46. 实现 `src/renderer/src/components/Settings/SettingsDialog.tsx`：设置面板
47. 实现设置实时保存到 config.json
48. 实现 `src/renderer/src/components/Export/ExportDialog.tsx`：导出进度对话框
49. 实现 HTML 导出
50. 实现 PDF 导出（隐藏窗口 + printToPDF）
51. 实现 Markdown 导出

### Phase 9：收尾
52. 实现文件关联启动（open-file 事件 / argv）
53. 实现启动会话恢复
54. 实现"关于"对话框
55. 实现"快捷键参考"对话框
56. 全量测试快捷键
57. 打包测试（NSIS + Portable）
58. 测试文件关联、双击打开
59. 测试 SmartScreen 提示行为

---

## 16. 验收标准

### 16.1 功能验收
- [ ] 双击 .md 文件能用本应用打开
- [ ] 已打开应用时，双击 .md 在新标签中打开
- [ ] 三模式切换正常，ir 模式体验接近 Typora
- [ ] 多标签页正常工作，未保存有圆点提示
- [ ] 关闭未保存文件弹窗询问
- [ ] 退出应用时批量处理未保存文件
- [ ] 自动保存（防抖 + 失焦）生效
- [ ] 粘贴图片自动保存到 assets/
- [ ] 导出 HTML 单文件可独立打开
- [ ] 导出 PDF 格式正确
- [ ] 主题切换（亮/暗/跟随系统）实时生效
- [ ] 大纲面板显示标题并可跳转
- [ ] 字数统计正确
- [ ] 设置面板所有项可配置且持久化
- [ ] 启动恢复上次会话
- [ ] 所有快捷键生效

### 16.2 非功能验收
- [ ] 安装包体积 < 150MB
- [ ] 启动时间 < 3 秒
- [ ] Win10 1903+ 兼容
- [ ] 无控制台报错
- [ ] 日志文件正常写入 userData/logs/

---

## 17. 开发约定

### 17.1 代码规范
- TypeScript strict mode
- ESLint + Prettier（electron-vite 默认配置）
- 函数注释使用中文
- 变量命名使用英文

### 17.2 提交规范
- Conventional Commits
- feat: 新功能
- fix: 修复
- docs: 文档
- refactor: 重构
- chore: 杂项

### 17.3 分支策略
- main：稳定分支
- dev：开发分支
- feature/xxx：功能分支

---

## 18. 已确认的决策汇总

| # | 决策项 | 选择 |
|---|---|---|
| 1 | 技术栈 | Electron + React + TypeScript |
| 2 | 编辑器内核 | Vditor |
| 3 | 编辑模式 | 多模式可切换，默认 ir |
| 4 | MVP 范围 | 文件读写 + 编辑器核心 + 导出 + 图片本地化 + 多标签 + 设置 |
| 5 | 图片本地化 | 同目录 `assets/` 文件夹 |
| 6 | 项目结构 | electron-vite + 单仓库 |
| 7 | UI 库 | shadcn/ui + Tailwind + lucide-react |
| 8 | IPC 架构 | 严格隔离（contextIsolation + sandbox） |
| 9 | 多标签 | 圆点提示 + 关闭拦截 + 批量弹窗 + 防抖自动保存 |
| 10 | 快捷键 | 见第 7 章，已解决冲突 |
| 11 | 导出 | HTML 内联 CSS / PDF printToPDF / MD 复用另存为 |
| 12 | 设置 | 原生 fs + userData / 模态对话框 / auto 跟随系统 |
| 13 | 菜单 | 主进程菜单 + 标签/编辑器右键菜单 / 无托盘 |
| 14 | 文件关联 | electron-builder 自动注册 / 单实例 + 新标签 / 仅文件参数 |
| 15 | 打包 | electron-builder / NSIS + Portable / 不签名 / 无自动更新 |
| 16 | 启动行为 | 恢复上次会话 / 仅中文 / 1200x800 / electron-log |

---

## 19. Trae 开发指引

### 19.1 开发顺序
严格按第 15 章 Phase 1-9 顺序开发，每个 Phase 完成后再进入下一个。

### 19.2 关键文件优先级
1. **Phase 1 完成后**：项目能 `pnpm dev` 启动空白窗口
2. **Phase 3 完成后**：渲染进程能调用 `window.api` 进行文件读写
3. **Phase 5 完成后**：Vditor 编辑器能加载并编辑
4. **Phase 6 完成后**：多标签页可用
5. **Phase 8 完成后**：所有核心功能完成

### 19.3 验证命令
```bash
pnpm install          # 安装依赖
pnpm dev             # 启动开发环境
pnpm build           # 构建生产版本
pnpm build:win       # 打包 Win10 安装包
```

### 19.4 注意事项
- **安全配置不可妥协**：contextIsolation / nodeIntegration / sandbox 必须按第 4.2 章配置
- **Vditor 模式切换**：通过 `vditor.changeMode` API，不要销毁重建实例
- **图片本地化**：新文件未保存时必须拦截，提示用户先保存
- **自动保存**：仅对已保存路径的文件生效，新文件不自动保存
- **会话恢复**：文件丢失时优雅降级，不报错
- **PDF 导出**：在隐藏窗口中渲染，避免影响主窗口
- **主题切换**：CSS Variables 是单一数据源，Vditor 主题也读取这套变量

---

**文档结束**

本规格说明书已覆盖 v1.0 MVP 的全部需求与实现细节。Trae 可基于此文档从 Phase 1 开始逐步实现。
