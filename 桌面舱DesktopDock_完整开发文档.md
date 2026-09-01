# 桌面舱 DesktopDock — 技术开发文档

> **版本**：v1.0  
> **日期**：2026-08-23  
> **文档类型**：产品需求 + 技术设计 + 开发规范  
> **目标读者**：前端/后端开发工程师  

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术架构](#2-技术架构)
3. [模块详细设计](#3-模块详细设计)
   - 3.1 [全局搜索模块](#31-全局搜索模块)
   - 3.2 [常用软件模块](#32-常用软件模块)
   - 3.3 [分类管理模块](#33-分类管理模块)
   - 3.4 [桌面整理模块](#34-桌面整理模块)
   - 3.5 [快捷唤起模块](#35-快捷唤起模块)
   - 3.6 [个性化设置模块](#36-个性化设置模块)
   - 3.7 [文件管理模块](#37-文件管理模块)
4. [数据库设计](#4-数据库设计)
5. [IPC 通信接口设计](#5-ipc-通信接口设计)
6. [UI 设计规范](#6-ui-设计规范)
7. [目录结构规范](#7-目录结构规范)
8. [开发计划与里程碑](#8-开发计划与里程碑)
9. [非功能性需求](#9-非功能性需求)

---

## 1. 项目概述

### 1.1 产品定位

「桌面舱 DesktopDock」是一款运行于 Windows 平台的轻量级桌面管理器，核心目标是**替代传统桌面图标管理方式**，提供类似手机 Launcher 的整洁体验：统一搜索、智能分类、一键整理。

### 1.2 核心价值

| 痛点 | 解决方案 |
|------|----------|
| 桌面图标杂乱，找软件慢 | 分类文件夹 + 全局搜索，2秒内启动任意软件 |
| 文件散落在各目录，找不到 | 全盘文件索引，关键词即搜即达 |
| 常用软件被淹没 | 基于使用频次智能排序，常用软件一键直达 |
| 桌面越用越乱 | 一键自动归类，桌面恢复整洁 |

### 1.3 目标用户

- 软件安装量 > 30 的重度电脑用户
- 设计师/开发者等需要频繁切换工具的职业人群
- 追求桌面整洁、效率优先的用户

### 1.4 运行环境

- **操作系统**：Windows 10 / Windows 11（64位）
- **最低配置**：4GB 内存，200MB 可用磁盘空间
- **推荐配置**：8GB 内存，SSD 硬盘

---

## 2. 技术架构

### 2.1 技术选型

| 层级 | 技术 | 版本要求 | 选型理由 |
|------|------|----------|----------|
| 应用框架 | Electron | ^28.0.0 | 跨平台桌面应用，前端生态成熟 |
| 前端框架 | Vue 3 | ^3.4.0 | Composition API，性能优秀 |
| 构建工具 | Vite | ^5.0.0 | 热更新快，构建速度快 |
| UI 组件库 | Element Plus | ^2.5.0 | Vue3 生态成熟组件库 |
| 状态管理 | Pinia | ^2.1.0 | Vue3 官方推荐，轻量 |
| 本地数据库 | better-sqlite3 | ^11.0.0 | 同步API，性能好，适合桌面应用 |
| 文件搜索 | Node.js fs + chokidar | - | 原生文件遍历 + 文件监听 |
| 全局快捷键 | Electron globalShortcut | - | 原生支持 |
| 打包工具 | electron-builder | ^24.0.0 | 生成安装包，支持自动更新 |
| 代码规范 | ESLint + Prettier | - | 统一代码风格 |

### 2.2 架构分层

```
┌─────────────────────────────────────────┐
│           Renderer Process (渲染进程)      │
│  ┌─────────┬─────────┬───────────────┐  │
│  │  Vue3   │ Pinia   │ Element Plus  │  │
│  │  视图层  │ 状态管理 │   UI组件      │  │
│  └─────────┴─────────┴───────────────┘  │
│              │ IPC (contextBridge)       │
├─────────────────────────────────────────┤
│            Main Process (主进程)          │
│  ┌──────────┬──────────┬──────────────┐ │
│  │ 窗口管理  │ 全局热键  │ 系统托盘     │ │
│  ├──────────┼──────────┼──────────────┤ │
│  │ 搜索索引  │ 文件监听  │ 软件扫描     │ │
│  ├──────────┴──────────┴──────────────┤ │
│  │         SQLite 数据访问层           │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 2.3 进程职责划分

**主进程（Main Process）**
- 创建和管理应用窗口（主窗口、搜索面板窗口）
- 注册全局快捷键
- 系统托盘图标与菜单
- 软件扫描与索引构建
- 文件系统监听（chokidar）
- SQLite 数据库操作
- 开机自启配置
- 自动更新检查

**渲染进程（Renderer Process）**
- UI 渲染与用户交互
- 搜索结果展示与筛选
- 分类拖拽管理
- 设置面板
- 动画与过渡效果

---

## 3. 模块详细设计

### 3.1 全局搜索模块

#### 3.1.1 功能描述

提供统一的搜索入口，支持搜索**已安装软件、桌面快捷方式、开始菜单程序、指定目录下的文件、系统设置项**。通过全局热键 `Alt+Space` 随时唤起，输入即搜，回车启动。

#### 3.1.2 搜索范围

| 搜索源 | 扫描路径 | 优先级 |
|--------|----------|--------|
| 已固定软件 | 数据库 pinned_apps 表 | 最高（权重 +50） |
| 常用软件 | 数据库 usage_stats 排序 | 高（权重 +30） |
| 开始菜单快捷方式 | `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\` | 中 |
| 用户开始菜单 | `%APPDATA%\Microsoft\Windows\Start Menu\Programs\` | 中 |
| 桌面快捷方式 | `%USERPROFILE%\Desktop\` + `C:\Users\Public\Desktop\` | 中 |
| 快速访问目录 | 下载、文档、图片、视频 | 低 |
| 系统设置 | 预设设置项列表 | 低 |

#### 3.1.3 搜索算法

**匹配规则（按优先级）**

1. **精确匹配**：输入文本与软件名称完全一致 → 权重 +100
2. **前缀匹配**：软件名称以输入文本开头 → 权重 +60
3. **拼音首字母匹配**：如输入 `wx` 匹配「微信」→ 权重 +40
4. **包含匹配**：软件名称包含输入文本 → 权重 +20
5. **模糊匹配**：编辑距离 ≤ 2 → 权重 +10

**排序公式**

```
最终得分 = 匹配权重 + 使用频次分 + 最近使用分 + 固定加分

使用频次分 = min(启动次数, 100) * 0.3
最近使用分 = max(0, 30 - 距今天数) * 1.0
固定加分 = is_pinned ? 50 : 0
```

#### 3.1.4 索引构建策略

| 时机 | 动作 |
|------|------|
| 应用首次启动 | 全量扫描所有搜索源，构建索引，写入 SQLite |
| 应用每次启动 | 增量扫描（对比文件修改时间），更新索引 |
| 运行期间 | chokidar 监听桌面/开始菜单目录变化，实时增删索引 |
| 用户手动触发 | 设置页「重建索引」按钮，全量重建 |

**索引数据结构（内存缓存）**

```javascript
// 搜索索引存储在内存中，启动时从DB加载，搜索时直接查内存
searchIndex = {
  apps: [
    {
      id: 'app_001',
      name: '微信',
      pinyin: 'weixin',
      pinyinInitial: 'wx',
      exePath: 'C:\\Program Files\\Tencent\\WeChat\\WeChat.exe',
      iconPath: 'cached_icon_001.png',
      category: '社交',
      launchCount: 156,
      lastLaunch: '2026-08-23T10:30:00Z',
      isPinned: true
    }
  ],
  files: [
    {
      id: 'file_001',
      name: '项目方案.docx',
      fullPath: 'D:\\Documents\\项目方案.docx',
      ext: '.docx',
      size: 102400,
      modifiedAt: '2026-08-22T15:00:00Z'
    }
  ]
}
```

#### 3.1.5 交互流程

```
用户按下 Alt+Space
    ↓
搜索面板窗口显示（动画：从顶部下拉 + 淡入，200ms）
    ↓
搜索框自动聚焦，光标闪烁
    ↓
用户输入字符（防抖 150ms）
    ↓
执行搜索，结果按得分降序排列
    ↓
结果列表实时更新（最多显示 10 条）
    ↓
用户操作：
  ├── 按 ↑↓ 键切换选中项
  ├── 按 Enter 启动选中项
  ├── 按 Tab 切换「应用/文件/设置」标签
  ├── 按 Esc 关闭面板
  └── 点击结果项启动
    ↓
启动后面板自动关闭，记录使用统计
```

#### 3.1.6 搜索结果项格式

```javascript
{
  type: 'app' | 'file' | 'setting',  // 结果类型
  id: 'app_001',                      // 唯一标识
  name: '微信',                       // 显示名称
  subtitle: '社交 · 最近使用',        // 副标题（分类/路径/描述）
  icon: 'cached_icon_001.png',        // 图标路径或base64
  matchRanges: [[0, 1]],              // 匹配字符位置，用于高亮
  action: 'launch',                   // 执行动作
  actionData: {                       // 动作数据
    exePath: 'C:\\...\\WeChat.exe',
    args: []
  }
}
```

#### 3.1.7 性能要求

- 索引构建：首次全量扫描 ≤ 5秒（100个软件以内）
- 搜索响应：从输入到结果展示 ≤ 50ms
- 内存占用：索引数据 ≤ 50MB
- 搜索面板唤起：从热键按下到窗口显示 ≤ 100ms

---

### 3.2 常用软件模块

#### 3.2.1 功能描述

基于用户使用习惯，自动统计软件启动频次和最近使用时间，智能排序展示最常用的软件。支持手动固定/取消固定，固定软件优先展示。

#### 3.2.2 数据统计规则

**统计维度**

| 维度 | 记录时机 | 存储字段 |
|------|----------|----------|
| 启动次数 | 每次通过本软件启动应用时 +1 | launch_count |
| 最后启动时间 | 每次启动时更新时间戳 | last_launch_at |
| 使用时长（可选） | 启动时记录，进程退出时计算（需监控进程） | total_usage_seconds |
| 固定状态 | 用户手动操作 | is_pinned, pinned_order |

**统计触发点**
- 通过搜索面板启动软件
- 通过主界面分类启动软件
- 通过常用区启动软件
- （不统计）用户从桌面/开始菜单直接启动

#### 3.2.3 排序算法

```
评分 = 固定优先级分 + 频次分 + 最近度分

固定优先级分 = is_pinned ? (1000 - pinned_order) : 0
  （固定软件按固定顺序排列，pinned_order 越小越靠前）

频次分 = min(launch_count, 200) * 0.5
  （最多200次封顶，防止老软件霸榜）

最近度分 = max(0, 14 - 距今天数) * 3
  （两周内用过的有加分，越近分越高）
```

**展示规则**
- 固定软件始终排在最前面，按固定顺序排列
- 非固定软件按评分降序排列
- 总共展示 8 个（4×2 网格）
- 不足 8 个时，用「添加软件」占位符填充

#### 3.2.4 固定功能

**操作方式**
- 右键软件 → 「固定到常用」/「取消固定」
- 拖拽软件到常用区
- 常用区软件右键 → 「调整顺序」（拖拽排序）

**固定数量限制**
- 最多固定 8 个软件
- 超过时提示「常用区最多固定8个，请先取消部分固定」

#### 3.2.5 数据结构

```javascript
// 常用软件项
{
  appId: 'app_001',
  name: '微信',
  icon: 'cached_icon_001.png',
  exePath: 'C:\\...\\WeChat.exe',
  launchCount: 156,
  lastLaunchAt: '2026-08-23T10:30:00Z',
  isPinned: true,
  pinnedOrder: 0,        // 固定顺序，0为最前
  score: 1078.5          // 计算出的排序分
}
```

---

### 3.3 分类管理模块

#### 3.3.1 功能描述

提供类似手机桌面文件夹的分类管理功能。预设常用分类，用户可自定义增删改分类，将软件拖拽归类到不同分类中。点击分类展开查看分类内所有软件。

#### 3.3.2 预设分类

| 分类名称 | 图标 | 颜色 | 自动归类规则 |
|----------|------|------|-------------|
| 办公 | 📄 | #4F6BFF | Word/Excel/PPT/PDF/WPS/钉钉/飞书/Outlook |
| 设计 | 🎨 | #FF6B6B | Photoshop/Illustrator/Figma/Sketch/XD/剪映 |
| 开发 | 💻 | #8B5CF6 | VS Code/IntelliJ/Git/Docker/Postman/Node |
| 娱乐 | 🎮 | #00C9A7 | Steam/Epic/腾讯视频/爱奇艺/网易云/QQ音乐 |
| 社交 | 💬 | #00B4D8 | 微信/QQ/钉钉/飞书/Telegram/Discord |
| 工具 | 🔧 | #FFA500 | 压缩软件/截图工具/杀毒/驱动/系统工具 |
| 其他 | 📁 | #9CA3AF | 未分类的软件默认归入此分类 |

#### 3.3.3 分类数据结构

```javascript
// 分类
{
  id: 'cat_001',
  name: '办公',
  icon: '📄',              // emoji图标或自定义图片路径
  color: '#4F6BFF',        // 主题色
  order: 0,                // 显示顺序
  isPreset: true,          // 是否预设分类（预设不可删除，可重命名）
  appCount: 12,            // 分类内软件数量（冗余字段，便于展示）
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-23T10:00:00Z'
}

// 软件-分类关联
{
  appId: 'app_001',
  categoryId: 'cat_005',   // 社交分类
  addedAt: '2026-08-01T00:00:00Z'
}
```

#### 3.3.4 核心功能

**3.3.4.1 创建分类**
- 入口：分类区「+」按钮 / 右键菜单「新建分类」
- 表单：分类名称（必填，1-10字）、图标选择（emoji选择器）、颜色选择
- 校验：分类名称不可重复
- 创建后：空分类显示「拖拽软件到此处」占位提示

**3.3.4.2 编辑分类**
- 入口：右键分类卡片 → 「编辑」
- 可修改：名称、图标、颜色
- 预设分类可修改名称/图标/颜色，但不可删除

**3.3.4.3 删除分类**
- 入口：右键分类卡片 → 「删除」
- 确认弹窗：「删除分类后，分类内的软件将移至「其他」分类，确定删除？」
- 预设分类不可删除（按钮置灰）
- 删除后：分类内软件移至「其他」分类

**3.3.4.4 软件归类**
- 方式一：拖拽软件图标到分类卡片上（高亮提示），松开即归入
- 方式二：右键软件 → 「移动到」→ 选择分类
- 方式三：批量选择多个软件 → 右键「移动到分类」
- 一个软件只能属于一个分类（互斥）
- 归入新分类时，自动从旧分类移除

**3.3.4.5 分类排序**
- 拖拽分类卡片调整顺序
- 顺序存储在 `order` 字段

**3.3.4.6 分类展开视图**
- 点击分类卡片 → 弹出面板（或路由切换）展示分类内所有软件
- 展示方式：图标网格（可切换大小）
- 支持搜索当前分类内软件
- 支持在分类内拖拽排序软件

#### 3.3.5 自动归类规则引擎

```javascript
// 规则匹配优先级：精确匹配 > 关键词匹配 > 扩展名匹配
autoCategorize(app) {
  // 1. 精确匹配软件名
  const exactMatch = RULES.exact[app.name];
  if (exactMatch) return exactMatch;

  // 2. 关键词匹配（软件名包含关键词）
  for (const [keyword, category] of RULES.keywords) {
    if (app.name.includes(keyword)) return category;
  }

  // 3. 按可执行文件路径中的公司名匹配
  for (const [company, category] of RULES.companies) {
    if (app.exePath.includes(company)) return category;
  }

  // 4. 默认归入「其他」
  return 'cat_other';
}
```

---

### 3.4 桌面整理模块

#### 3.4.1 功能描述

扫描桌面上的所有快捷方式和文件，按照预设规则自动归类到对应分类中，并可选择隐藏桌面图标，实现桌面一键整洁。支持还原操作。

#### 3.4.2 扫描范围

| 路径 | 说明 |
|------|------|
| `%USERPROFILE%\Desktop\` | 当前用户桌面 |
| `C:\Users\Public\Desktop\` | 公共桌面（所有用户可见） |

**扫描内容**
- `.lnk` 快捷方式文件（指向应用、文件、文件夹）
- 桌面直接存放的文件（文档、图片、压缩包等）
- 桌面文件夹（不自动处理，仅统计）

#### 3.4.3 整理策略

**策略一：快捷方式入库（推荐）**
- 解析 `.lnk` 文件，获取目标程序路径和名称
- 将软件信息录入数据库，自动归类
- 原桌面快捷方式：可选「保留」或「移至备份文件夹」

**策略二：文件归类**
- 桌面上的文档/图片/压缩包等，按扩展名移动到对应目录
- 文档 → `%USERPROFILE%\Documents\桌面整理\`
- 图片 → `%USERPROFILE%\Pictures\桌面整理\`
- 视频 → `%USERPROFILE%\Videos\桌面整理\`
- 压缩包 → `%USERPROFILE%\Downloads\桌面整理\`
- 其他 → `%USERPROFILE%\Documents\桌面整理\其他\`

#### 3.4.4 一键整理流程

```
用户点击「一键整理」
    ↓
弹出确认窗口，展示预览：
  - 发现 24 个桌面快捷方式
  - 将自动归类到：办公(5)、开发(3)、娱乐(8)、工具(4)、其他(4)
  - 发现 6 个桌面文件
  - 将移动到：文档(3)、图片(2)、压缩包(1)
  - [ ] 整理后隐藏桌面图标
  - [ ] 创建还原点（默认勾选）
    ↓
用户确认
    ↓
执行整理（显示进度条）：
  1. 创建还原点（记录原始位置快照到JSON文件）
  2. 解析快捷方式，录入数据库并归类
  3. 移动桌面文件到对应目录
  4. （可选）隐藏桌面图标
    ↓
整理完成，提示「已整理 30 个项目」
```

#### 3.4.5 还原功能

- 入口：设置页 → 桌面整理 → 「还原上一次整理」
- 读取还原点 JSON，将文件移回原始位置
- 从数据库移除本次整理录入的软件（仅移除归类，不删除软件记录）
- 最多保留 5 个还原点，超出自动删除最早的

**还原点数据结构**

```json
{
  "id": "restore_20260823_103000",
  "createdAt": "2026-08-23T10:30:00Z",
  "items": [
    {
      "type": "shortcut",
      "originalPath": "C:\\Users\\xxx\\Desktop\\微信.lnk",
      "targetPath": "C:\\Program Files\\Tencent\\WeChat\\WeChat.exe",
      "action": "moved_to_backup",
      "backupPath": "C:\\Users\\xxx\\Documents\\DesktopDock\\backup\\微信.lnk"
    },
    {
      "type": "file",
      "originalPath": "C:\\Users\\xxx\\Desktop\\报告.docx",
      "newPath": "C:\\Users\\xxx\\Documents\\桌面整理\\报告.docx"
    }
  ]
}
```

#### 3.4.6 桌面图标隐藏/显示

- 通过修改 Windows 注册表实现：
  - 隐藏：`HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced` → `HideIcons` = 1
  - 显示：`HideIcons` = 0
- 修改后需刷新桌面（发送 `WM_SETTINGCHANGE` 消息或重启 explorer）
- 提供独立开关，不依赖整理操作

---

### 3.5 快捷唤起模块

#### 3.5.1 功能描述

支持全局热键随时唤起搜索面板和主界面，热键可自定义。唤起/隐藏有平滑动画，失焦自动隐藏。

#### 3.5.2 默认热键

| 功能 | 默认热键 | 说明 |
|------|----------|------|
| 唤起/隐藏搜索面板 | `Alt + Space` | 核心功能，最常用 |
| 唤起/隐藏主界面 | `Alt + D` | 完整分类管理界面 |
| 快速截图（可选） | `Alt + S` | 预留扩展 |

#### 3.5.3 热键自定义

- 入口：设置页 → 快捷键
- 每个功能可单独设置热键
- 录制方式：点击输入框 → 按下组合键 → 自动捕获
- 校验：
  - 不可与系统热键冲突（如 `Alt+Tab`、`Ctrl+Alt+Del`）
  - 不可与本软件其他热键重复
  - 必须包含修饰键（Ctrl/Alt/Shift/Win）+ 普通键
- 热键存储在数据库 settings 表，修改后即时生效（重新注册）

#### 3.5.4 窗口唤起动画

**搜索面板**
- 位置：屏幕顶部居中，距顶部 15% 屏幕高度
- 入场动画：从上方下移 20px + 透明度 0→1，时长 200ms，缓动 `cubic-bezier(0.16, 1, 0.3, 1)`
- 出场动画：上移 20px + 透明度 1→0，时长 150ms

**主界面**
- 位置：屏幕居中，宽 900px，高 600px（可调整）
- 入场动画：缩放 0.95→1.0 + 透明度 0→1，时长 200ms
- 出场动画：缩放 1.0→0.95 + 透明度 1→0，时长 150ms

#### 3.5.5 自动隐藏规则

| 触发条件 | 动作 |
|----------|------|
| 按下 `Esc` 键 | 隐藏当前窗口 |
| 点击窗口外区域（失焦） | 隐藏搜索面板（主界面不自动隐藏） |
| 再次按下唤起热键 | 切换显示/隐藏 |
| 启动软件后 | 自动隐藏搜索面板 |
| 最小化到托盘 | 关闭窗口但保留后台进程 |

#### 3.5.6 系统托盘

- 托盘图标：应用 Logo（彩色/灰度随主题）
- 左键点击：显示主界面
- 右键菜单：
  - 打开主界面
  - 搜索面板
  - 一键整理桌面
  - 设置
  - 检查更新
  - 退出

---

### 3.6 个性化设置模块

#### 3.6.1 功能描述

提供主题、外观、行为等个性化配置，所有设置实时生效，持久化存储。

#### 3.6.2 设置项清单

| 分类 | 设置项 | 类型 | 默认值 | 选项/范围 |
|------|--------|------|--------|-----------|
| **外观** | 主题模式 | 单选 | 跟随系统 | 浅色 / 深色 / 跟随系统 |
| | 主色调 | 颜色选择 | #4F6BFF | 预设8色 + 自定义取色器 |
| | 毛玻璃效果 | 开关 | 开 | 开 / 关 |
| | 图标大小 | 单选 | 中 | 小(32px) / 中(48px) / 大(64px) |
| | 网格密度 | 单选 | 标准 | 紧凑 / 标准 / 宽松 |
| | 窗口圆角 | 滑块 | 16px | 0-24px |
| **行为** | 开机自启 | 开关 | 关 | 开 / 关 |
| | 启动时最小化到托盘 | 开关 | 关 | 开 / 关 |
| | 搜索面板失焦自动隐藏 | 开关 | 开 | 开 / 关 |
| | 启动软件后关闭面板 | 开关 | 开 | 开 / 关 |
| | 动画效果 | 开关 | 开 | 开 / 关 |
| **搜索** | 搜索文件范围 | 多选 | 桌面+下载 | 桌面 / 下载 / 文档 / 图片 / 自定义目录 |
| | 搜索结果数量 | 滑块 | 10 | 5-20 |
| | 索引扫描间隔 | 单选 | 实时 | 实时 / 每小时 / 每天 / 手动 |
| **快捷键** | 搜索面板热键 | 热键录制 | Alt+Space | 自定义 |
| | 主界面热键 | 热键录制 | Alt+D | 自定义 |
| **数据** | 重建索引 | 按钮 | - | 点击触发全量扫描 |
| | 清除使用统计 | 按钮 | - | 二次确认后清空 |
| | 导出配置 | 按钮 | - | 导出JSON文件 |
| | 导入配置 | 按钮 | - | 选择JSON文件导入 |
| **关于** | 版本号 | 文本 | - | 显示当前版本 |
| | 检查更新 | 按钮 | - | 手动检查 |

#### 3.6.3 主题切换机制

```javascript
// 主题变量定义（CSS Variables）
:root {
  --bg-primary: #F5F7FA;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #EEF0F5;
  --text-primary: #1A1A2E;
  --text-secondary: #6B7280;
  --text-tertiary: #9CA3AF;
  --border-color: #E5E7EB;
  --accent-color: #4F6BFF;
  --shadow-color: rgba(0, 0, 0, 0.08);
  --glass-bg: rgba(255, 255, 255, 0.7);
  --glass-blur: 20px;
}

[data-theme='dark'] {
  --bg-primary: #0F0F1A;
  --bg-secondary: #1A1A2E;
  --bg-tertiary: #252536;
  --text-primary: #E8E8F0;
  --text-secondary: #A0A0B8;
  --text-tertiary: #6B6B80;
  --border-color: #2D2D44;
  --shadow-color: rgba(0, 0, 0, 0.3);
  --glass-bg: rgba(26, 26, 46, 0.7);
}
```

- 切换主题时，给 `html` 标签添加/移除 `data-theme='dark'`
- 跟随系统：监听 `window.matchMedia('(prefers-color-scheme: dark)')`
- 主色调：动态设置 `--accent-color` 变量

---

### 3.7 文件管理模块

#### 3.7.1 功能描述

提供最近文件、收藏文件夹、快速访问系统目录的功能，作为软件搜索的补充，方便用户快速找到近期工作文件。

#### 3.7.2 最近文件

**数据来源**
- Windows 最近文件：`%APPDATA%\Microsoft\Windows\Recent\`
- 本软件搜索打开过的文件（记录到数据库）

**展示规则**
- 按最后访问时间降序
- 最多展示 20 条
- 分组：今天 / 昨天 / 本周 / 更早
- 文件图标：使用系统关联图标
- 点击：用默认程序打开文件
- 右键：打开文件所在位置 / 复制路径 / 固定到收藏

#### 3.7.3 收藏文件夹

- 用户可将常用文件夹添加到收藏
- 入口：文件页「+ 添加文件夹」→ 选择目录
- 展示：文件夹卡片，显示名称和路径
- 点击：在资源管理器中打开该文件夹
- 支持拖拽排序
- 预设快捷入口（不可删除）：桌面、下载、文档、图片、视频

#### 3.7.4 文件预览（搜索结果中）

- 图片文件：鼠标悬停显示缩略图预览
- 文本文件：显示前几行内容预览
- 其他文件：显示文件大小、修改时间、类型

---

## 4. 数据库设计

### 4.1 数据库概览

- **数据库类型**：SQLite（通过 better-sqlite3）
- **文件位置**：`%APPDATA%\DesktopDock\data.db`
- **字符编码**：UTF-8

### 4.2 表结构

#### 4.2.1 apps（软件信息表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | 软件唯一ID，格式 `app_xxx` |
| name | TEXT | NOT NULL | 软件显示名称 |
| exe_path | TEXT | NOT NULL, UNIQUE | 可执行文件完整路径 |
| icon_path | TEXT | | 缓存图标路径（相对数据目录） |
| pinyin | TEXT | | 拼音全拼，用于搜索 |
| pinyin_initial | TEXT | | 拼音首字母，用于搜索 |
| install_path | TEXT | | 安装目录 |
| publisher | TEXT | | 发布者/公司名 |
| version | TEXT | | 版本号 |
| source | TEXT | NOT NULL | 来源：start_menu / desktop / custom |
| created_at | TEXT | NOT NULL | 录入时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

**索引**
- `idx_apps_name` ON `name`
- `idx_apps_pinyin` ON `pinyin`
- `idx_apps_pinyin_initial` ON `pinyin_initial`

#### 4.2.2 categories（分类表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | 分类ID，格式 `cat_xxx` |
| name | TEXT | NOT NULL, UNIQUE | 分类名称 |
| icon | TEXT | NOT NULL | 图标（emoji或路径） |
| color | TEXT | NOT NULL | 主题色（HEX） |
| order | INTEGER | NOT NULL DEFAULT 0 | 显示顺序 |
| is_preset | INTEGER | NOT NULL DEFAULT 0 | 是否预设（1是/0否） |
| created_at | TEXT | NOT NULL | 创建时间 |
| updated_at | TEXT | NOT NULL | 更新时间 |

#### 4.2.3 app_categories（软件分类关联表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| app_id | TEXT | NOT NULL, FOREIGN KEY | 软件ID |
| category_id | TEXT | NOT NULL, FOREIGN KEY | 分类ID |
| sort_order | INTEGER | DEFAULT 0 | 分类内排序 |
| added_at | TEXT | NOT NULL | 加入时间 |
| **PRIMARY KEY** | | (app_id) | 一个软件只能属于一个分类 |

#### 4.2.4 usage_stats（使用统计表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| app_id | TEXT | PRIMARY KEY, FOREIGN KEY | 软件ID |
| launch_count | INTEGER | NOT NULL DEFAULT 0 | 启动次数 |
| last_launch_at | TEXT | | 最后启动时间 |
| total_usage_seconds | INTEGER | DEFAULT 0 | 累计使用秒数（可选） |

#### 4.2.5 pinned_apps（固定软件表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| app_id | TEXT | PRIMARY KEY, FOREIGN KEY | 软件ID |
| sort_order | INTEGER | NOT NULL | 固定顺序（0开始） |
| pinned_at | TEXT | NOT NULL | 固定时间 |

#### 4.2.6 recent_files（最近文件表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | 文件ID |
| name | TEXT | NOT NULL | 文件名 |
| full_path | TEXT | NOT NULL, UNIQUE | 完整路径 |
| ext | TEXT | | 扩展名 |
| size | INTEGER | | 文件大小（字节） |
| last_accessed | TEXT | NOT NULL | 最后访问时间 |
| is_pinned | INTEGER | DEFAULT 0 | 是否固定 |

#### 4.2.7 favorite_folders（收藏文件夹表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | TEXT | PRIMARY KEY | ID |
| name | TEXT | NOT NULL | 显示名称 |
| path | TEXT | NOT NULL, UNIQUE | 文件夹路径 |
| is_system | INTEGER | DEFAULT 0 | 是否系统预设（1是/0否） |
| sort_order | INTEGER | DEFAULT 0 | 排序 |

#### 4.2.8 settings（设置表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| key | TEXT | PRIMARY KEY | 设置键名 |
| value | TEXT | NOT NULL | 设置值（JSON字符串） |
| updated_at | TEXT | NOT NULL | 更新时间 |

**初始设置数据**

```sql
INSERT INTO settings (key, value, updated_at) VALUES
('theme', '"system"', datetime('now')),
('accent_color', '"#4F6BFF"', datetime('now')),
('glass_effect', '1', datetime('now')),
('icon_size', '"medium"', datetime('now')),
('grid_density', '"normal"', datetime('now')),
('auto_start', '0', datetime('now')),
('start_minimized', '0', datetime('now')),
('hotkey_search', '"Alt+Space"', datetime('now')),
('hotkey_main', '"Alt+D"', datetime('now')),
('search_result_count', '10', datetime('now')),
('search_paths', '["desktop","downloads"]', datetime('now'));
```

### 4.3 E-R 关系图

```
apps 1───1 app_categories N───1 categories
  │
  ├──1 usage_stats (1:1)
  │
  └──1 pinned_apps (1:0..1)

recent_files (独立)
favorite_folders (独立)
settings (键值对，独立)
```

---

## 5. IPC 通信接口设计

### 5.1 通信规范

- 渲染进程 → 主进程：`window.electronAPI.invoke(channel, data)`
- 主进程 → 渲染进程：`mainWindow.webContents.send(channel, data)`
- 所有通道统一前缀：`dd:`（DesktopDock）
- 返回格式统一：`{ success: boolean, data?: any, error?: string }`

### 5.2 接口清单

#### 5.2.1 搜索相关

| 通道名 | 方向 | 参数 | 返回 | 说明 |
|--------|------|------|------|------|
| `dd:search` | R→M | `{ query: string, type?: 'app'\|'file'\|'all' }` | `{ results: SearchResult[] }` | 执行搜索 |
| `dd:rebuild-index` | R→M | - | `{ success: true }` | 重建搜索索引 |
| `dd:get-index-status` | R→M | - | `{ totalApps, totalFiles, lastScanAt }` | 获取索引状态 |

#### 5.2.2 软件相关

| 通道名 | 方向 | 参数 | 返回 | 说明 |
|--------|------|------|------|------|
| `dd:app:launch` | R→M | `{ appId: string, args?: string[] }` | `{ success: boolean }` | 启动软件 |
| `dd:app:list` | R→M | `{ categoryId?: string, page?, size? }` | `{ apps: App[], total }` | 获取软件列表 |
| `dd:app:rescan` | R→M | - | `{ added, updated, removed }` | 重新扫描软件 |

#### 5.2.3 分类相关

| 通道名 | 方向 | 参数 | 返回 | 说明 |
|--------|------|------|------|------|
| `dd:category:list` | R→M | - | `{ categories: Category[] }` | 获取所有分类 |
| `dd:category:create` | R→M | `{ name, icon, color }` | `{ category: Category }` | 创建分类 |
| `dd:category:update` | R→M | `{ id, name?, icon?, color? }` | `{ category: Category }` | 更新分类 |
| `dd:category:delete` | R→M | `{ id }` | `{ success: true }` | 删除分类 |
| `dd:category:reorder` | R→M | `{ orders: [{id, order}] }` | `{ success: true }` | 分类排序 |
| `dd:category:move-app` | R→M | `{ appId, categoryId }` | `{ success: true }` | 移动软件到分类 |

#### 5.2.4 常用软件相关

| 通道名 | 方向 | 参数 | 返回 | 说明 |
|--------|------|------|------|------|
| `dd:frequent:list` | R→M | `{ limit?: number }` | `{ apps: FrequentApp[] }` | 获取常用软件 |
| `dd:frequent:pin` | R→M | `{ appId }` | `{ success: true }` | 固定软件 |
| `dd:frequent:unpin` | R→M | `{ appId }` | `{ success: true }` | 取消固定 |
| `dd:frequent:reorder-pinned` | R→M | `{ orders: [{appId, order}] }` | `{ success: true }` | 固定软件排序 |

#### 5.2.5 桌面整理相关

| 通道名 | 方向 | 参数 | 返回 | 说明 |
|--------|------|------|------|------|
| `dd:desktop:scan` | R→M | - | `{ shortcuts, files, total }` | 扫描桌面 |
| `dd:desktop:organize` | R→M | `{ hideIcons?, createRestorePoint? }` | `{ organized, restoreId }` | 一键整理 |
| `dd:desktop:restore` | R→M | `{ restoreId }` | `{ restored: number }` | 还原整理 |
| `dd:desktop:toggle-icons` | R→M | `{ hide: boolean }` | `{ success: true }` | 隐藏/显示桌面图标 |

#### 5.2.6 设置相关

| 通道名 | 方向 | 参数 | 返回 | 说明 |
|--------|------|------|------|------|
| `dd:settings:get` | R→M | - | `{ settings: object }` | 获取所有设置 |
| `dd:settings:set` | R→M | `{ key, value }` | `{ success: true }` | 更新单个设置 |
| `dd:settings:export` | R→M | - | `{ filePath: string }` | 导出配置 |
| `dd:settings:import` | R→M | `{ filePath }` | `{ success: true }` | 导入配置 |

#### 5.2.7 窗口控制相关

| 通道名 | 方向 | 参数 | 返回 | 说明 |
|--------|------|------|------|------|
| `dd:window:show-search` | R→M | - | - | 显示搜索面板 |
| `dd:window:hide-search` | R→M | - | - | 隐藏搜索面板 |
| `dd:window:show-main` | R→M | - | - | 显示主窗口 |
| `dd:window:minimize-to-tray` | R→M | - | - | 最小化到托盘 |
| `dd:window:quit` | R→M | - | - | 退出应用 |

#### 5.2.8 主进程主动推送

| 通道名 | 方向 | 数据 | 说明 |
|--------|------|------|------|
| `dd:index:updated` | M→R | `{ added, updated, removed }` | 索引更新通知 |
| `dd:hotkey:pressed` | M→R | `{ action: 'search'\|'main' }` | 热键按下通知 |
| `dd:update:available` | M→R | `{ version, downloadUrl }` | 发现新版本 |

---

## 6. UI 设计规范

### 6.1 色彩系统

**主色调**

| 名称 | 色值 | 用途 |
|------|------|------|
| 主色-蓝 | `#4F6BFF` | 主按钮、选中态、链接 |
| 主色-紫 | `#8B5CF6` | 渐变、强调元素 |
| 渐变 | `linear-gradient(135deg, #4F6BFF, #8B5CF6)` | 品牌元素、封面 |

**浅色主题**

| 名称 | 色值 |
|------|------|
| 背景主色 | `#F5F7FA` |
| 卡片背景 | `#FFFFFF` |
| 次级背景 | `#EEF0F5` |
| 文字主色 | `#1A1A2E` |
| 文字次色 | `#6B7280` |
| 文字辅助 | `#9CA3AF` |
| 边框 | `#E5E7EB` |
| 分割线 | `#F0F0F5` |

**深色主题**

| 名称 | 色值 |
|------|------|
| 背景主色 | `#0F0F1A` |
| 卡片背景 | `#1A1A2E` |
| 次级背景 | `#252536` |
| 文字主色 | `#E8E8F0` |
| 文字次色 | `#A0A0B8` |
| 文字辅助 | `#6B6B80` |
| 边框 | `#2D2D44` |
| 分割线 | `#252536` |

**状态色**

| 状态 | 色值 |
|------|------|
| 成功 | `#00C9A7` |
| 警告 | `#FFA500` |
| 错误 | `#FF4757` |
| 信息 | `#00B4D8` |

### 6.2 字体规范

| 用途 | 字体 | 字号 | 字重 |
|------|------|------|------|
| 大标题 | 系统默认 sans-serif | 24px | 600 |
| 页面标题 | 系统默认 sans-serif | 20px | 600 |
| 卡片标题 | 系统默认 sans-serif | 16px | 500 |
| 正文 | 系统默认 sans-serif | 14px | 400 |
| 辅助文字 | 系统默认 sans-serif | 12px | 400 |
| 软件名称 | 系统默认 sans-serif | 13px | 400 |

- Windows 优先字体：`'Segoe UI', 'Microsoft YaHei', sans-serif`

### 6.3 间距与圆角

| 名称 | 值 |
|------|-----|
| 页面边距 | 24px |
| 卡片内边距 | 20px |
| 元素间距（小） | 8px |
| 元素间距（中） | 12px |
| 元素间距（大） | 16px |
| 区块间距 | 24px |
| 卡片圆角 | 16px |
| 按钮圆角 | 12px |
| 搜索框圆角 | 24px |
| 输入框圆角 | 10px |
| 小标签圆角 | 6px |

### 6.4 阴影

| 名称 | 值 | 用途 |
|------|-----|------|
| 卡片阴影 | `0 2px 8px rgba(0,0,0,0.06)` | 普通卡片 |
| 悬浮阴影 | `0 8px 24px rgba(0,0,0,0.12)` | 悬停/弹窗 |
| 面板阴影 | `0 16px 48px rgba(0,0,0,0.16)` | 搜索面板 |

### 6.5 图标尺寸

| 用途 | 尺寸 |
|------|------|
| 软件图标（小） | 32×32px |
| 软件图标（中） | 48×48px |
| 软件图标（大） | 64×64px |
| 功能图标 | 20×20px |
| 分类图标 | 28×28px |
| 托盘图标 | 16×16px / 32×32px |

### 6.6 页面布局

**主界面（900×600px，可调整）**

```
┌─────────────────────────────────────────┐
│  [Logo] 桌面舱          [搜索框]  [设置] │  ← 顶部栏 56px
├─────────────────────────────────────────┤
│                                         │
│  常用软件                               │
│  [icon][icon][icon][icon]              │  ← 常用区
│  [icon][icon][icon][icon]              │
│                                         │
├─────────────────────────────────────────┤
│  分类文件夹                    [+ 新建]  │
│                                         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│  │办公│ │设计│ │开发│ │娱乐│ │工具│   │  ← 分类区
│  │12个│ │ 8个│ │15个│ │ 6个│ │ 9个│   │
│  └────┘ └────┘ └────┘ └────┘ └────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**搜索面板（600×自适应，最大500px高）**

```
┌─────────────────────────────────┐
│  🔍 输入搜索...          [esc]   │  ← 搜索框 48px
├─────────────────────────────────┤
│  [应用] [文件] [设置]            │  ← 标签栏
├─────────────────────────────────┤
│  ┌──┐                           │
│  │图标│ 微信        社交 · 常用  │  ← 结果项（高亮匹配字符）
│  └──┘                           │
│  ┌──┐                           │
│  │图标│ 微信文件传输助手         │
│  └──┘                           │
│  ...                            │
└─────────────────────────────────┘
```

---

## 7. 目录结构规范

```
desktop-dock/
├── src/
│   ├── main/                    # 主进程代码
│   │   ├── index.js             # 主进程入口
│   │   ├── window-manager.js    # 窗口管理
│   │   ├── tray.js              # 系统托盘
│   │   ├── hotkeys.js           # 全局热键
│   │   ├── scanner/             # 扫描器
│   │   │   ├── app-scanner.js   # 软件扫描
│   │   │   ├── file-scanner.js  # 文件扫描
│   │   │   └── desktop-scanner.js # 桌面扫描
│   │   ├── search/              # 搜索引擎
│   │   │   ├── index.js         # 搜索入口
│   │   │   ├── indexer.js       # 索引构建
│   │   │   └── matcher.js       # 匹配算法
│   │   ├── db/                  # 数据库
│   │   │   ├── index.js         # 数据库连接
│   │   │   ├── schema.sql       # 建表脚本
│   │   │   └── migrations/      # 数据库迁移
│   │   ├── ipc/                 # IPC 处理器
│   │   │   ├── index.js         # 注册所有IPC通道
│   │   │   ├── search.js        # 搜索相关
│   │   │   ├── apps.js          # 软件相关
│   │   │   ├── categories.js    # 分类相关
│   │   │   ├── desktop.js       # 桌面整理
│   │   │   └── settings.js      # 设置相关
│   │   ├── organizer/           # 桌面整理
│   │   │   ├── index.js
│   │   │   └── restore.js
│   │   └── utils/               # 工具函数
│   │       ├── shortcut.js      # .lnk解析
│   │       ├── icon.js          # 图标提取缓存
│   │       ├── pinyin.js        # 拼音转换
│   │       └── auto-start.js    # 开机自启
│   │
│   ├── renderer/                # 渲染进程代码
│   │   ├── main.js              # 渲染入口
│   │   ├── App.vue              # 根组件
│   │   ├── assets/              # 静态资源
│   │   ├── components/          # 通用组件
│   │   │   ├── AppIcon.vue      # 软件图标
│   │   │   ├── SearchBox.vue    # 搜索框
│   │   │   ├── CategoryCard.vue # 分类卡片
│   │   │   ├── AppGrid.vue      # 软件网格
│   │   │   └── ContextMenu.vue  # 右键菜单
│   │   ├── views/               # 页面视图
│   │   │   ├── MainView.vue     # 主界面
│   │   │   ├── SearchPanel.vue  # 搜索面板
│   │   │   ├── CategoryView.vue # 分类详情
│   │   │   ├── FilesView.vue    # 文件管理
│   │   │   └── SettingsView.vue # 设置页
│   │   ├── stores/              # Pinia 状态
│   │   │   ├── apps.js
│   │   │   ├── categories.js
│   │   │   ├── search.js
│   │   │   └── settings.js
│   │   ├── composables/         # 组合式函数
│   │   │   ├── useSearch.js
│   │   │   ├── useHotkey.js
│   │   │   └── useDrag.js
│   │   ├── styles/              # 全局样式
│   │   │   ├── variables.css    # CSS变量（主题）
│   │   │   ├── global.css       # 全局样式
│   │   │   └── animations.css   # 动画
│   │   └── utils/
│   │       ├── api.js           # IPC调用封装
│   │       └── format.js        # 格式化工具
│   │
│   ├── preload/                 # 预加载脚本
│   │   └── index.js             # contextBridge 暴露 API
│   │
│   └── shared/                  # 主进程/渲染进程共享
│       ├── constants.js         # 常量定义
│       └── types.js             # 类型定义（JSDoc）
│
├── build/                       # 构建资源
│   ├── icon.ico                 # 应用图标
│   └── installer/               # 安装包资源
│
├── electron-builder.yml         # 打包配置
├── vite.config.js               # Vite配置
├── package.json
└── README.md
```

---

## 8. 开发计划与里程碑

### 8.1 版本规划

| 版本 | 内容 | 预计周期 |
|------|------|----------|
| **v0.1 MVP** | 软件扫描 + 分类管理 + 启动功能 | 2周 |
| **v0.2** | 全局搜索（软件）+ 常用排序 + 热键唤起 | 1周 |
| **v0.3** | 文件搜索 + 桌面一键整理 + 还原 | 1周 |
| **v0.4** | 个性化设置 + 深色主题 + 毛玻璃 | 1周 |
| **v0.5** | 文件管理 + 最近文件 + 收藏夹 | 1周 |
| **v1.0 正式版** | 自动更新 + 性能优化 + Bug修复 + 安装包 | 1周 |

**总计：约 7 周**

### 8.2 v0.1 MVP 详细任务拆解

**第1周：基础框架 + 数据层**
- [ ] 初始化 Electron + Vue3 + Vite 项目
- [ ] 配置 ESLint + Prettier
- [ ] 实现 SQLite 数据库连接和建表
- [ ] 实现软件扫描器（开始菜单 + 桌面）
- [ ] 实现图标提取与缓存
- [ ] 实现拼音转换
- [ ] 实现分类 CRUD 的 IPC 接口

**第2周：界面 + 交互**
- [ ] 主界面布局（顶部栏 + 常用区 + 分类区）
- [ ] 软件图标网格组件
- [ ] 分类卡片组件
- [ ] 拖拽归类功能
- [ ] 右键菜单
- [ ] 软件启动功能
- [ ] 系统托盘
- [ ] 打包成 exe 测试

### 8.3 验收标准

**功能验收**
- [ ] 能正确扫描系统中已安装的软件（≥90%准确率）
- [ ] 软件图标正确显示
- [ ] 分类增删改功能正常
- [ ] 拖拽归类正常工作
- [ ] 点击软件能正确启动
- [ ] 托盘菜单功能正常
- [ ] 应用可正常安装和卸载

**性能验收**
- [ ] 应用冷启动 ≤ 3秒
- [ ] 软件扫描 ≤ 5秒
- [ ] 界面操作无明显卡顿（FPS ≥ 50）
- [ ] 内存占用 ≤ 150MB（空闲时）

---

## 9. 非功能性需求

### 9.1 性能要求

| 指标 | 目标值 |
|------|--------|
| 应用冷启动时间 | ≤ 3秒 |
| 搜索响应时间 | ≤ 50ms |
| 搜索面板唤起时间 | ≤ 100ms |
| 软件扫描（100个以内） | ≤ 5秒 |
| 空闲内存占用 | ≤ 150MB |
| 索引内存占用 | ≤ 50MB |
| 界面帧率 | ≥ 50 FPS |

### 9.2 兼容性

- 支持 Windows 10 (1809+) 和 Windows 11
- 支持高 DPI 屏幕（≥200% 缩放）
- 支持中英文系统环境
- 兼容常见安全软件（不被误报为病毒）

### 9.3 数据安全

- 所有数据存储在本地，不上传云端
- 数据库文件权限设置为仅当前用户可读写
- 卸载时可选保留用户数据
- 不收集任何用户隐私信息

### 9.4 异常处理

| 场景 | 处理方式 |
|------|----------|
| 数据库损坏 | 自动备份并重建，提示用户 |
| 软件路径失效（已卸载） | 扫描时自动从数据库移除 |
| 热键注册失败（被占用） | 提示用户并引导修改热键 |
| 文件移动失败（权限不足） | 跳过该文件，整理完成后报告失败项 |
| 索引构建中断 | 下次启动时继续增量构建 |

### 9.5 日志规范

- 日志位置：`%APPDATA%\DesktopDock\logs\`
- 按日期切割：`2026-08-23.log`
- 日志级别：ERROR / WARN / INFO / DEBUG
- 保留最近 30 天日志
- 关键操作必须记录：软件启动、分类变更、桌面整理、设置修改

---

## 附录 A：关键算法伪代码

### A.1 搜索匹配算法

```javascript
function search(query, index) {
  const results = [];
  const q = query.toLowerCase().trim();
  const qPinyin = toPinyin(q);
  const qInitial = getPinyinInitial(q);

  for (const app of index.apps) {
    let score = 0;
    let matchRanges = [];

    const name = app.name.toLowerCase();
    const namePinyin = app.pinyin;
    const nameInitial = app.pinyin_initial;

    // 1. 精确匹配
    if (name === q) {
      score += 100;
      matchRanges.push([0, name.length]);
    }
    // 2. 前缀匹配
    else if (name.startsWith(q)) {
      score += 60;
      matchRanges.push([0, q.length]);
    }
    // 3. 拼音首字母匹配
    else if (nameInitial.startsWith(qInitial)) {
      score += 40;
    }
    // 4. 包含匹配
    else if (name.includes(q)) {
      score += 20;
      const idx = name.indexOf(q);
      matchRanges.push([idx, idx + q.length]);
    }
    // 5. 拼音全拼匹配
    else if (namePinyin.includes(qPinyin)) {
      score += 15;
    }

    if (score > 0) {
      // 加上使用频次和最近度分
      score += Math.min(app.launchCount, 100) * 0.3;
      const daysSince = daysBetween(app.lastLaunch, new Date());
      score += Math.max(0, 30 - daysSince) * 1.0;
      if (app.isPinned) score += 50;

      results.push({ ...app, score, matchRanges });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}
```

### A.2 常用软件排序算法

```javascript
function getFrequentApps(apps, usageStats, pinnedApps, limit = 8) {
  const scored = apps.map(app => {
    const usage = usageStats[app.id] || { launchCount: 0, lastLaunchAt: null };
    const pinned = pinnedApps.find(p => p.appId === app.id);

    let score = 0;

    if (pinned) {
      // 固定软件：优先级分远高于非固定
      score = 1000 - pinned.sortOrder;
    } else {
      // 频次分（200次封顶）
      score += Math.min(usage.launchCount, 200) * 0.5;
      // 最近度分（14天内）
      if (usage.lastLaunchAt) {
        const days = daysBetween(usage.lastLaunchAt, new Date());
        score += Math.max(0, 14 - days) * 3;
      }
    }

    return { ...app, score, isPinned: !!pinned, pinnedOrder: pinned?.sortOrder };
  });

  // 固定软件按 pinnedOrder 排，非固定按 score 排
  scored.sort((a, b) => {
    if (a.isPinned && b.isPinned) return a.pinnedOrder - b.pinnedOrder;
    if (a.isPinned) return -1;
    if (b.isPinned) return 1;
    return b.score - a.score;
  });

  return scored.slice(0, limit);
}
```

---

## 附录 B：第三方依赖清单

| 包名 | 版本 | 用途 |
|------|------|------|
| electron | ^28.0.0 | 桌面应用框架 |
| vue | ^3.4.0 | 前端框架 |
| vite | ^5.0.0 | 构建工具 |
| pinia | ^2.1.0 | 状态管理 |
| element-plus | ^2.5.0 | UI组件库 |
| better-sqlite3 | ^11.0.0 | SQLite数据库 |
| chokidar | ^3.5.0 | 文件监听 |
| pinyin-pro | ^3.19.0 | 中文拼音转换 |
| electron-builder | ^24.0.0 | 应用打包 |
| electron-updater | ^6.1.0 | 自动更新 |
| @electron/remote | ^2.1.0 | 远程对象访问 |
| fs-extra | ^11.2.0 | 文件系统增强 |
| node-window-manager | - | （可选）窗口管理增强 |

---

*文档结束。如有疑问，随时沟通补充。*
