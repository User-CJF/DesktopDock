# 桌面舱 DesktopDock

DesktopDock 是一款面向 Windows 10/11 的本地桌面启动与整理工具。本项目已选定 **C · Windows 原生** 作为最终 UI 方向，应用启动、文件索引、桌面整理、设置持久化和 Windows 安装包均已接通。

## 当前已完成

- Electron + Vue 3 + Vite 工程骨架
- 无边框 Windows 原生窗口与 Mica 背景材质
- 真实最小化、最大化/还原、关闭窗口控制
- 浅色、深色、跟随系统主题，并同步 Electron `nativeTheme`
- 全局搜索唤起与主窗口显示/隐藏快捷键
- 快捷键被系统占用时自动启用备用组合键，并在设置页显示实际生效值
- 扫描当前用户/公共开始菜单与桌面中的 `.lnk`、`.url`、`.exe`、`.appref-ms`
- 使用 Node 内置 SQLite 保存应用索引、扫描时间和启动次数
- 自动过滤卸载器、帮助/网站链接，并合并桌面与开始菜单中的同名应用
- 首页与全局搜索展示真实应用，点击后通过主进程安全启动
- 设置页支持手动重建应用索引，并反馈新增、更新与移除数量
- 应用右键菜单可真实固定/取消固定，固定应用优先显示在常用区
- 支持创建、重命名和删除自定义分类，以及将应用移动到指定分类
- 默认七个分类受保护；删除自定义分类时其中应用安全回到“其他”
- 用户分类在后续应用重扫中保持不变
- 通过 Windows Shell 提取真实应用/快捷方式图标
- 图标以 PNG 缓存在 Electron `userData/icon-cache`，快捷方式更新后自动失效
- 最多 6 路后台渐进加载，提取失败时保留稳定的字母图标
- 安全 preload 白名单：`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`
- 外部导航和新窗口默认拒绝
- 文件页索引桌面、下载、文档、图片、视频及用户自选目录，仅保存名称、大小和修改时间等元数据
- 文件搜索、最近文件、默认程序打开、资源管理器定位、收藏目录选择与打开
- 桌面整理真实预览：文件夹与快捷方式保持原位，普通文件按文档/图片/视频/压缩包/其他分类移动
- 整理前强制生成还原点；同名文件自动安全改名；失败回滚；还原冲突跳过而不覆盖
- 最多保留 5 个还原点，支持页面按钮和完成提示中的一键撤销
- 设置通过 SQLite 持久化，支持主色、图标大小、网格密度、动画、启动行为和自定义全局快捷键
- 开机自启调用 Windows 登录启动项；配置通过系统对话框导入/导出 JSON
- 应用和文件使用统计可二次确认后清除，分类、收藏与索引不受影响
- 已生成 x64 Windows 可运行目录和 NSIS 安装包

## 本地运行

```powershell
pnpm install
pnpm dev
```

生产构建与验证：

```powershell
pnpm check
pnpm smoke
pnpm test:index
pnpm test:icons
pnpm pack:win
pnpm dist:win
```

- `pnpm check`：检查 Electron 主进程、preload 和最终 UI 语法，运行全部服务测试并生成 `dist/`。
- `pnpm smoke`：短暂启动生产版 Electron，验证安全桥接、真实应用/文件能力、桌面只读预览、设置持久化、原生图标、关键页面和最小窗口布局后自动退出。冒烟测试不执行真实桌面整理。
- `pnpm test:index`：验证应用扫描、去重、SQLite 持久化、启动统计、固定状态、分类事务和失效条目清理。
- `pnpm test:icons`：验证并发去重、PNG 缓存命中、失效刷新和无效 ID 回退。
- `pnpm pack:win`：生成 `release/win-unpacked/DesktopDock.exe`。
- `pnpm dist:win`：生成 `release/DesktopDock-0.1.0-Setup.exe`（开发阶段未使用发行证书签名）。

## 快捷键

| 操作 | 首选组合键 | 系统冲突时备用键 |
| --- | --- | --- |
| 打开搜索 | `Alt + Space` | `Ctrl + Shift + Space` |
| 显示/隐藏主窗口 | `Alt + D` | `Ctrl + Shift + D` |

应用内还可使用 `Ctrl + K` 打开搜索。

## 目录

```text
src/main/       Electron 主进程与原生能力
src/main/services/ 应用/文件索引、设置存储、图标缓存与安全桌面整理
src/preload/    渲染层安全 API 白名单
src/renderer/   Vue 入口与桌面壳层
final/          已选定 C 方案的完整 UI 控制器与样式
prototype/      三套 UI 方案的交互对比原型
dist/           生产构建输出
release/        Windows 可运行目录、安装包和 blockmap
```

产品与设计依据见 `PRODUCT.md`、`DESIGN.md` 和 `UI_COMPARISON.md`。

生产数据写入 Electron 的 `userData/data.db`，应用图标写入 `userData/icon-cache/`，整理快照写入 `userData/restore-points/`。冒烟测试使用系统临时目录，只扫描真实目录的元数据和桌面预览，不移动或改写真实文件。
