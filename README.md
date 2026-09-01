# 桌面舱 DesktopDock

DesktopDock 0.2.0 是一款面向 Windows 10/11 的本地桌面整理与效率工具。窗口挂接在 Explorer 桌面宿主层的右侧，不置顶、不占任务栏；打开其他软件时，软件窗口会自然覆盖 DesktopDock。

## 已实现

- 自动读取当前用户桌面、公共桌面和本地保管区中的 `.lnk`、`.url`、`.appref-ms`，显示真实 Windows 图标。
- 启动时安全收纳当前用户桌面的普通快捷方式；此电脑、回收站等系统图标不受影响；公共桌面快捷方式只读。
- 固定“桌面仓”，分类全部由用户创建，可改名和删除；删除分类仅把快捷方式移回桌面仓。
- 支持仓内拖动归类、从 Windows 桌面直接拖入分类，以及“移动到分类”菜单替代操作。
- 待办支持颜色、备注、截止、Windows 通知提醒、每天/每周/每月重复、附件、拖动排序和批量操作。
- 文件支持收藏目录、本地索引、搜索、最近/名称/大小排序、图标/列表布局、图片缩略图、拖入复制、打开、定位、重命名和移到回收站。
- 天气支持手动城市或系统定位、当前实况、逐小时、7 天预报和四种布局；使用 Open-Meteo 并缓存 30 分钟。
- 读取 Windows 当前媒体会话的曲名、艺术家、播放状态、位置和时长；支持上一首、播放/暂停、下一首及系统音量。
- 设置按常规、外观、文件格子、功能格子分组；支持深色、浅色、跟随系统、配置导入导出和开机启动。
- Electron 安全边界：`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`，路径操作全部在主进程校验。
- 支持免安装 x64 单文件便携 EXE。

## 开发与验证

```powershell
pnpm install
pnpm run dev
pnpm run check
pnpm run smoke
pnpm run portable:win
```

- `pnpm run check`：语法检查、12 项服务测试和生产构建。
- `pnpm run smoke`：启动 500px Electron 窗口，验证五个模块、分类/待办 CRUD、安全桥接和无横向溢出；不会移动真实桌面快捷方式。
- `pnpm run portable:win`：生成 `release/DesktopDock-0.2.0-Portable.exe`。

## 快捷键

| 操作 | 首选 | 冲突时备用 |
| --- | --- | --- |
| 聚焦搜索 | `Alt + Space` | `Ctrl + Shift + Space` |
| 显示/隐藏 | `Alt + D` | `Ctrl + Shift + D` |

## 目录

```text
src/main/              Electron 主进程和 Windows 集成
src/main/services/     桌面仓、待办、文件、天气、媒体、设置与图标服务
src/preload/           安全 IPC 白名单
src/renderer/          Vue 壳层
final/                 选定的 Windows 原生 UI 控制器与样式
tests/                 Node 自动测试
scripts/               开发、冒烟、打包和说明书生成脚本
```

完整产品、操作、数据、安全、架构、测试和运维说明见 `DesktopDock_完整项目说明书.docx`。

## 数据与边界

运行数据保存在当前用户 Electron `userData` 目录，不写入便携 EXE。天气是唯一主动联网模块；分类、待办、快捷方式和文件索引均留在本机。公共桌面快捷方式因共享权限只读展示。系统定位、通知和媒体元数据取决于 Windows 权限及具体播放器能力。
