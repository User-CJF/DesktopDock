const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, nativeTheme, Notification, screen, shell, Tray } = require('electron');
const { createAppIndex } = require('./services/app-index.cjs');
const { createIconCache } = require('./services/icon-cache.cjs');
const { createFileIndex } = require('./services/file-index.cjs');
const { createDesktopOrganizer } = require('./services/desktop-organizer.cjs');
const { createSettingsStore } = require('./services/settings-store.cjs');
const { createWeatherService } = require('./services/weather-service.cjs');
const { controlMedia, mediaStatus } = require('./services/media-control.cjs');
const { createShortcutBoard } = require('./services/shortcut-board.cjs');
const { createTodoService } = require('./services/todo-service.cjs');

if (process.env.DESKTOPDOCK_SMOKE_TEST === '1') {
  app.disableHardwareAcceleration();
  const smokeData = path.join(os.tmpdir(), `desktopdock-smoke-${process.pid}`);
  fs.mkdirSync(smokeData, { recursive: true });
  app.setPath('userData', smokeData);
}

let mainWindow = null;
let tray = null;
let isQuitting = false;
let appIndex = null;
let iconCache = null;
let shortcutIconCache = null;
let fileIndex = null;
let desktopOrganizer = null;
let settingsStore = null;
let weatherService = null;
let shortcutBoard = null;
let todoService = null;
let reminderTimer = null;
const shortcutRegistration = {
  search: { requested: 'Alt+Space', active: null },
  toggleWindow: { requested: 'Alt+D', active: null },
};

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();
app.on('second-instance', () => {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
});

function expandWindowsEnvironment(value) {
  return value.replace(/%([^%]+)%/g, (match, key) => process.env[key] || match);
}

function normalizedIconPath(value) {
  if (typeof value !== 'string') return null;
  const cleaned = expandWindowsEnvironment(value.trim().replace(/^"|"$/g, '')).replace(/,\s*-?\d+$/, '');
  return cleaned ? path.resolve(cleaned) : null;
}

async function resolvedFileIcon(target) {
  const candidates = [];
  const extension = path.extname(target).toLowerCase();
  if (extension === '.lnk') {
    try {
      const details = shell.readShortcutLink(target);
      const explicitIcon = normalizedIconPath(details.icon);
      const resolvedTarget = normalizedIconPath(details.target);
      if (explicitIcon) candidates.push({ path: explicitIcon, directImage: path.extname(explicitIcon).toLowerCase() === '.ico' });
      if (resolvedTarget) candidates.push({ path: resolvedTarget, directImage: false });
    } catch {
      // Invalid shortcuts fall back to the shortcut file itself.
    }
  } else if (extension === '.url') {
    try {
      const contents = await fs.promises.readFile(target, 'utf8');
      const explicitIcon = normalizedIconPath(contents.match(/^IconFile=(.+)$/mi)?.[1]);
      if (explicitIcon) candidates.push({ path: explicitIcon, directImage: path.extname(explicitIcon).toLowerCase() === '.ico' });
    } catch {
      // URL files without an icon declaration use the Shell fallback.
    }
  }
  candidates.push({ path: target, directImage: path.extname(target).toLowerCase() === '.ico' });
  const seen = new Set();
  for (const candidate of candidates) {
    const key = candidate.path.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      await fs.promises.access(candidate.path, fs.constants.R_OK);
      const image = candidate.directImage
        ? nativeImage.createFromPath(candidate.path)
        : await app.getFileIcon(candidate.path, { size: 'large' });
      if (image && !image.isEmpty()) return image;
    } catch {
      // Try the next trustworthy icon source.
    }
  }
  return null;
}

async function runSmokeTest(window) {
  try {
    const result = await window.webContents.executeJavaScript(`(async () => {
      const appRoot = document.querySelector('#desktopApp');
      const overlay = document.querySelector('#searchOverlay');
      const navButtons = [...document.querySelectorAll('#primaryNav [data-nav]')];
      document.querySelector('[data-action="open-search"]')?.click();
      const searchOpened = overlay?.hidden === false && appRoot?.inert === true;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const searchClosed = overlay?.hidden === true && appRoot?.inert === false;
      navButtons.find((button) => button.dataset.nav === 'categories')?.click();
      const indexedApps = await window.desktopDock.apps.list();
      const indexStatus = await window.desktopDock.index.getStatus();
      const initialCategories = await window.desktopDock.categories.list();
      const fileRoots = await window.desktopDock.files.roots();
      const fileScan = await window.desktopDock.files.rescan();
      const fileStatus = await window.desktopDock.files.status();
      const desktopPreview = await window.desktopDock.desktop.scan();
      const shortcutTarget = desktopPreview.shortcutItems?.[0];
      const shortcutIcon = shortcutTarget ? await window.desktopDock.desktop.shortcutIcon(shortcutTarget.id) : null;
      const originalSettings = await window.desktopDock.settings.get();
      const settingMutation = await window.desktopDock.settings.set('searchResultCount', 11);
      const settingPersisted = (await window.desktopDock.settings.get()).searchResultCount === 11;
      await window.desktopDock.settings.set('searchResultCount', originalSettings.searchResultCount);
      const about = await window.desktopDock.about.get();
      const targetApp = indexedApps[0];
      const iconStartedAt = performance.now();
      const firstIcon = await window.desktopDock.apps.icon(targetApp.id);
      const firstIconMs = Math.round((performance.now() - iconStartedAt) * 10) / 10;
      const cachedIconStartedAt = performance.now();
      const cachedIcon = await window.desktopDock.apps.icon(targetApp.id);
      const cachedIconMs = Math.round((performance.now() - cachedIconStartedAt) * 10) / 10;
      const pinned = await window.desktopDock.apps.setPinned(targetApp.id, true);
      const created = await window.desktopDock.categories.create({ name: '冒烟分类', icon: '🧪', color: '#7953c6' });
      const moved = await window.desktopDock.apps.setCategory(targetApp.id, created.category.id);
      const updated = await window.desktopDock.categories.update({ id: created.category.id, name: '冒烟更新', icon: '📚', color: '#4f6bff' });
      const categoryPersisted = (await window.desktopDock.apps.list()).find((app) => app.id === targetApp.id)?.category === '冒烟更新';
      const deleted = await window.desktopDock.categories.delete(created.category.id);
      const returnedToOther = (await window.desktopDock.apps.list()).find((app) => app.id === targetApp.id)?.category === '其他';
      await window.desktopDock.apps.setPinned(targetApp.id, false);
      return {
        bridge: window.desktopDock?.isElectron === true,
        navCount: navButtons.length,
        searchOpened,
        searchClosed,
        categoriesRendered: location.hash === '#categories' && document.querySelector('#commandbar h1')?.textContent === '分类',
        noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        indexedApps: indexedApps.length,
        indexStatusMatches: indexStatus.totalApps === indexedApps.length,
        uiCategoryCount: document.querySelectorAll('#pageContent .category-grid [data-category]').length,
        categoryCountMatches: document.querySelectorAll('#pageContent .category-grid [data-category]').length === initialCategories.length,
        categoryCrud: pinned.success && created.success && moved.success && updated.success && deleted.success && categoryPersisted && returnedToOther,
        fileBridge: fileRoots.length >= 5 && fileStatus.totalRoots === fileRoots.length && fileScan.total === fileStatus.totalFiles,
        organizerPreviewSafe: Number.isInteger(desktopPreview.total) && Number.isInteger(desktopPreview.folders),
        shortcutBridgeSafe: Array.isArray(desktopPreview.shortcutItems)
          && desktopPreview.shortcutItems.every((item) => !('fullPath' in item) && !('fileName' in item)),
        shortcutIconAvailable: !shortcutTarget || (typeof shortcutIcon === 'string' && shortcutIcon.startsWith('data:image/png;base64,')),
        settingsPersistence: settingMutation.success && settingPersisted,
        aboutVersion: about.version === '0.1.0' && about.updateSourceConfigured === false,
        iconDataAvailable: typeof firstIcon === 'string' && firstIcon.startsWith('data:image/png;base64,'),
        iconCacheStable: firstIcon === cachedIcon,
        iconTimingsMs: { first: firstIconMs, cached: cachedIconMs },
      };
    })()`);
    result.realIconRendered = await window.webContents.executeJavaScript(`new Promise((resolve) => {
      const started = performance.now();
      const check = () => {
        if (document.querySelector('.app-icon.has-image img')) return resolve(true);
        if (performance.now() - started > 4000) return resolve(false);
        setTimeout(check, 40);
      };
      check();
    })`);
    result.categoryForm = await window.webContents.executeJavaScript(`(() => {
      document.querySelector('[data-action="new-category"]')?.click();
      return document.querySelector('#dialogTitle')?.textContent === '新建分类'
        && document.querySelectorAll('[data-category-symbol]').length === 5;
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 120));
    const categoryFormScreenshot = await window.webContents.capturePage();
    fs.writeFileSync(path.join(process.cwd(), 'dist', 'electron-category-form.png'), categoryFormScreenshot.toPNG());
    result.categoryPicker = await window.webContents.executeJavaScript(`(() => {
      document.querySelector('[data-action="close-modal"]')?.click();
      document.querySelector('#primaryNav [data-nav="home"]')?.click();
      const tile = document.querySelector('[data-app]');
      tile?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 300, clientY: 220 }));
      document.querySelector('[data-menu-action="move"]')?.click();
      return document.querySelectorAll('[data-category-target]').length === 7;
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 120));
    const categoryPickerScreenshot = await window.webContents.capturePage();
    fs.writeFileSync(path.join(process.cwd(), 'dist', 'electron-category-picker.png'), categoryPickerScreenshot.toPNG());
    await window.webContents.executeJavaScript("document.body.click()");
    result.filesPage = await window.webContents.executeJavaScript(`(() => {
      document.querySelector('#primaryNav [data-nav="files"]')?.click();
      return document.querySelector('#commandbar h1')?.textContent === '文件'
        && document.querySelectorAll('#pageContent [data-folder]').length >= 5
        && !document.querySelector('#pageContent')?.textContent.includes('演示状态');
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 180));
    const filesScreenshot = await window.webContents.capturePage();
    fs.writeFileSync(path.join(process.cwd(), 'dist', 'electron-files.png'), filesScreenshot.toPNG());
    result.organizePage = await window.webContents.executeJavaScript(`(() => {
      document.querySelector('#primaryNav [data-nav="organize"]')?.click();
      return document.querySelector('#commandbar h1')?.textContent === '桌面整理'
        && document.querySelectorAll('#pageContent .organize-row').length === 5
        && Boolean(document.querySelector('#pageContent .shortcut-section'))
        && document.querySelector('#pageContent')?.textContent.includes('只移动当前用户桌面的快捷方式');
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 180));
    const organizeScreenshot = await window.webContents.capturePage();
    fs.writeFileSync(path.join(process.cwd(), 'dist', 'electron-organize.png'), organizeScreenshot.toPNG());
    result.settingsPage = await window.webContents.executeJavaScript(`(() => {
      document.querySelector('#primaryNav [data-nav="settings"]')?.click();
      document.querySelector('[data-settings-section="data"]')?.click();
      return Boolean(document.querySelector('#commandbar h1')?.textContent === '设置'
        && document.querySelector('#pageContent')?.textContent.includes('重建文件索引')
        && document.querySelector('[data-action="export-config"]'));
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 180));
    const settingsScreenshot = await window.webContents.capturePage();
    fs.writeFileSync(path.join(process.cwd(), 'dist', 'electron-settings.png'), settingsScreenshot.toPNG());
    window.setSize(720, 520);
    await new Promise((resolve) => setTimeout(resolve, 120));
    result.minimumWindowNoOverflow = await window.webContents.executeJavaScript(
      'document.documentElement.scrollWidth <= document.documentElement.clientWidth',
    );
    result.shortcuts = shortcutRegistration;
    const passed = result.bridge && result.navCount === 5 && result.searchOpened && result.searchClosed
      && result.categoriesRendered && result.noHorizontalOverflow && result.minimumWindowNoOverflow
      && result.indexedApps > 0 && result.indexStatusMatches
      && result.categoryCountMatches && result.categoryCrud
      && result.fileBridge && result.organizerPreviewSafe && result.shortcutBridgeSafe && result.shortcutIconAvailable
      && result.settingsPersistence && result.aboutVersion
      && result.categoryForm && result.categoryPicker
      && result.filesPage && result.organizePage && result.settingsPage
      && result.iconDataAvailable && result.iconCacheStable && result.realIconRendered
      && result.shortcuts.search.active && result.shortcuts.toggleWindow.active;
    console.log(`DesktopDock smoke test: ${JSON.stringify(result)}`);
    if (process.env.DESKTOPDOCK_SMOKE_RESULT) {
      fs.writeFileSync(process.env.DESKTOPDOCK_SMOKE_RESULT, JSON.stringify({ passed, result }, null, 2), 'utf8');
    }
    app.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('DesktopDock smoke test failed:', error);
    if (process.env.DESKTOPDOCK_SMOKE_RESULT) {
      fs.writeFileSync(process.env.DESKTOPDOCK_SMOKE_RESULT, JSON.stringify({ passed: false, error: error.message }, null, 2), 'utf8');
    }
    app.exit(1);
  }
}

function smokeArtifactPath(fileName) {
  const directory = process.env.DESKTOPDOCK_SMOKE_RESULT
    ? path.dirname(process.env.DESKTOPDOCK_SMOKE_RESULT)
    : path.join(process.cwd(), 'dist');
  fs.mkdirSync(directory, { recursive: true });
  return path.join(directory, fileName);
}

async function runSidebarSmokeTest(window) {
  try {
    const result = await window.webContents.executeJavaScript(`(async () => {
      const waitUntil = async (predicate, timeout = 12000) => {
        const started = performance.now();
        while (!predicate()) {
          if (performance.now() - started > timeout) return false;
          await new Promise((resolve) => setTimeout(resolve, 60));
        }
        return true;
      };
      const loaded = await waitUntil(() => document.querySelector('#dockStatus')?.textContent.includes('已就绪'));
      const root = document.querySelector('.dock-shell');
      const board = await window.desktopDock.board.get();
      const files = await window.desktopDock.files.list(30);
      const settings = await window.desktopDock.settings.get();
      const originalLayout = settings.fileLayout;
      const mutation = await window.desktopDock.settings.set('fileLayout', originalLayout === 'grid' ? 'list' : 'grid');
      const persisted = (await window.desktopDock.settings.get()).fileLayout !== originalLayout;
      await window.desktopDock.settings.set('fileLayout', originalLayout);
      const roots = await window.desktopDock.files.roots();
      const created = await window.desktopDock.board.createCategory({ name: '冒烟分类', color: '#1677ff' });
      const categoryPersisted = (await window.desktopDock.board.get()).categories.some((item) => item.id === created.category.id);
      const deleted = await window.desktopDock.board.deleteCategory(created.category.id);
      const todoCreated = await window.desktopDock.todo.create({ title: '冒烟任务', color: 'blue', recurrence: 'none' });
      const todoUpdated = await window.desktopDock.todo.update({ id: todoCreated.todo.id, title: '冒烟任务', completed: true });
      const todoDeleted = await window.desktopDock.todo.delete(todoCreated.todo.id);
      document.querySelector('[data-action="new-category"]')?.click();
      const categoryEditor = Boolean(document.querySelector('#categoryForm'));
      document.querySelector('[data-action="close-dialog"]')?.click();
      document.querySelector('[data-nav="todo"]')?.click();
      const todoView = document.querySelector('.todo-list');
      document.querySelector('[data-nav="files"]')?.click();
      const filesView = document.querySelector('.file-collection');
      document.querySelector('[data-nav="widgets"]')?.click();
      await waitUntil(() => Boolean(document.querySelector('.weather-panel')), 4000);
      const widgetsView = document.querySelector('.media-panel') && document.querySelector('.weather-panel');
      document.querySelector('[data-nav="settings"]')?.click();
      const settingsView = document.querySelectorAll('.settings-section').length === 4;
      return {
        loaded,
        bridge: window.desktopDock?.isElectron === true,
        dockWidth: Math.abs((root?.getBoundingClientRect().width || 0) - document.documentElement.clientWidth) < 1,
        noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        boardBridgeSafe: Array.isArray(board.shortcuts) && board.shortcuts.every((item) => !('fullPath' in item) && !('fileName' in item)),
        filesBridge: Array.isArray(files),
        settingsPersistence: mutation.success && persisted,
        categoryCrud: created.success && categoryPersisted && deleted.success,
        todoCrud: todoCreated.success && todoUpdated.todo.completed && todoDeleted.success,
        desktopView: Boolean(document.querySelector('[data-nav="desktop"]')),
        todoView: Boolean(todoView),
        filesView: Boolean(filesView),
        widgetsView: Boolean(widgetsView),
        settingsView,
        categoryEditor,
        rootsBridge: Array.isArray(roots),
      };
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 220));
    const settingsScreenshot = await window.webContents.capturePage();
    fs.writeFileSync(smokeArtifactPath('electron-widget-settings.png'), settingsScreenshot.toPNG());
    await window.webContents.executeJavaScript("document.querySelector('[data-nav=\"desktop\"]')?.click()");
    await new Promise((resolve) => setTimeout(resolve, 180));
    const desktopScreenshot = await window.webContents.capturePage();
    fs.writeFileSync(smokeArtifactPath('electron-widget-dock.png'), desktopScreenshot.toPNG());
    const passed = Object.values(result).every(Boolean);
    console.log(`DesktopDock sidebar smoke test: ${JSON.stringify(result)}`);
    if (process.env.DESKTOPDOCK_SMOKE_RESULT) {
      fs.writeFileSync(process.env.DESKTOPDOCK_SMOKE_RESULT, JSON.stringify({ passed, result }, null, 2), 'utf8');
    }
    app.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('DesktopDock sidebar smoke test failed:', error);
    if (process.env.DESKTOPDOCK_SMOKE_RESULT) {
      fs.writeFileSync(process.env.DESKTOPDOCK_SMOKE_RESULT, JSON.stringify({ passed: false, error: error.message }, null, 2), 'utf8');
    }
    app.exit(1);
  }
}

function createMainWindow() {
  const isSmokeTest = process.env.DESKTOPDOCK_SMOKE_TEST === '1';
  const workArea = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const width = 500;
  const height = workArea.height;
  mainWindow = new BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width,
    y: workArea.y,
    minWidth: width,
    minHeight: Math.min(560, height),
    maxWidth: width,
    show: false,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    movable: false,
    skipTaskbar: !isSmokeTest,
    alwaysOnTop: false,
    backgroundColor: isSmokeTest ? '#f3f3f3' : '#00000000',
    backgroundMaterial: process.platform === 'win32' && !isSmokeTest ? 'mica' : 'none',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
  if (isSmokeTest) {
    console.log('DesktopDock smoke: window created');
    mainWindow.webContents.on('did-finish-load', () => console.log('DesktopDock smoke: renderer loaded'));
    mainWindow.webContents.on('did-fail-load', (_event, code, description) => console.error(`DesktopDock smoke: load failed ${code} ${description}`));
    mainWindow.webContents.on('render-process-gone', (_event, details) => console.error(`DesktopDock smoke: renderer gone ${JSON.stringify(details)}`));
  }

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isDevOrigin = devServerUrl && url.startsWith(devServerUrl);
    const isLocalBuild = !devServerUrl && url.startsWith('file:');
    if (!isDevOrigin && !isLocalBuild) event.preventDefault();
  });

  mainWindow.once('ready-to-show', () => {
    const requestedHiddenStart = process.argv.includes('--hidden');
    const reveal = () => { if ((!settingsStore?.get().startMinimized && !requestedHiddenStart) || process.env.DESKTOPDOCK_SMOKE_TEST === '1') mainWindow?.show(); };
    if (process.platform === 'win32' && process.env.DESKTOPDOCK_SMOKE_TEST !== '1') void attachWindowToDesktop().finally(reveal);
    else reveal();
    if (process.env.DESKTOPDOCK_SMOKE_TEST === '1' && mainWindow) void runSidebarSmokeTest(mainWindow);
  });
  mainWindow.on('close', (event) => {
    if (!isQuitting && process.env.DESKTOPDOCK_SMOKE_TEST !== '1') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function attachWindowToDesktop() {
  if (!mainWindow || process.platform !== 'win32') return Promise.resolve(false);
  const handle = mainWindow.getNativeWindowHandle();
  const hwnd = handle.length >= 8 ? handle.readBigUInt64LE(0).toString() : String(handle.readUInt32LE(0));
  const command = `$code=@'\nusing System;\nusing System.Runtime.InteropServices;\npublic static class DesktopDockHost {\n public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);\n [DllImport("user32.dll")] public static extern IntPtr FindWindow(string c,string n);\n [DllImport("user32.dll")] public static extern IntPtr FindWindowEx(IntPtr p,IntPtr a,string c,string n);\n [DllImport("user32.dll")] public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint f,uint t,out IntPtr r);\n [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb,IntPtr p);\n [DllImport("user32.dll",SetLastError=true)] public static extern IntPtr SetParent(IntPtr child,IntPtr parent);\n}\n'@; Add-Type $code; $prog=[DesktopDockHost]::FindWindow('Progman',$null); $out=[IntPtr]::Zero; [void][DesktopDockHost]::SendMessageTimeout($prog,0x052C,[IntPtr]::Zero,[IntPtr]::Zero,0,1000,[ref]$out); $script:worker=[IntPtr]::Zero; [void][DesktopDockHost]::EnumWindows({param($top,$p) $view=[DesktopDockHost]::FindWindowEx($top,[IntPtr]::Zero,'SHELLDLL_DefView',$null); if($view -ne [IntPtr]::Zero){$script:worker=[DesktopDockHost]::FindWindowEx([IntPtr]::Zero,$top,'WorkerW',$null)}; return $true},[IntPtr]::Zero); if($script:worker -eq [IntPtr]::Zero){$script:worker=$prog}; $result=[DesktopDockHost]::SetParent([IntPtr]${hwnd},$script:worker); if($result -eq [IntPtr]::Zero -and [Runtime.InteropServices.Marshal]::GetLastWin32Error() -ne 0){exit 1}`;
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, stdio: 'ignore' });
    child.once('error', () => resolve(false));
    child.once('exit', (code) => resolve(code === 0));
  });
}

function currentWindow(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

function positionDockWindow() {
  if (!mainWindow) return;
  const workArea = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const [width, height] = mainWindow.getSize();
  mainWindow.setBounds({ x: workArea.x + workArea.width - width, y: workArea.y, width, height: workArea.height }, true);
  if (process.platform === 'win32' && process.env.DESKTOPDOCK_SMOKE_TEST !== '1') void attachWindowToDesktop();
}

async function createTray() {
  if (tray || process.env.DESKTOPDOCK_SMOKE_TEST === '1') return;
  let image = await app.getFileIcon(process.execPath, { size: 'small' }).catch(() => nativeImage.createEmpty());
  if (image.isEmpty()) image = nativeImage.createFromPath(process.execPath);
  tray = new Tray(image.resize({ width: 16, height: 16 }));
  tray.setToolTip('桌面舱 DesktopDock');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示桌面舱', click: () => { positionDockWindow(); mainWindow?.show(); mainWindow?.focus(); } },
    { label: '隐藏桌面舱', click: () => mainWindow?.hide() },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit(); } },
  ]));
  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else {
      positionDockWindow();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function registerIpc() {
  const mutation = (operation) => {
    try {
      return { success: true, ...operation() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  ipcMain.handle('dd:window:minimize', (event) => currentWindow(event)?.minimize());
  ipcMain.handle('dd:window:maximize', (event) => {
    const window = currentWindow(event);
    if (!window) return false;
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
    return window.isMaximized();
  });
  ipcMain.handle('dd:window:close', (event) => currentWindow(event)?.close());
  ipcMain.handle('dd:window:hide', (event) => currentWindow(event)?.hide());
  ipcMain.handle('dd:window:quit', () => {
    isQuitting = true;
    app.quit();
  });
  ipcMain.handle('dd:theme:get', () => nativeTheme.themeSource);
  ipcMain.handle('dd:theme:set', (_event, theme) => {
    if (!['light', 'dark', 'system'].includes(theme)) throw new Error('Unsupported theme value');
    nativeTheme.themeSource = theme;
    return nativeTheme.themeSource;
  });
  ipcMain.handle('dd:shortcuts:get', () => shortcutRegistration);
  ipcMain.handle('dd:app:list', (_event, options = {}) => appIndex.list(options.size));
  ipcMain.handle('dd:app:rescan', async () => {
    const result = await appIndex.rescan();
    mainWindow?.webContents.send('dd:index:updated', appIndex.status());
    return result;
  });
  ipcMain.handle('dd:app:launch', (_event, payload = {}) => appIndex.launch(payload.appId, (target) => shell.openPath(target)));
  ipcMain.handle('dd:app:reveal', (_event, payload = {}) => {
    const item = appIndex.resolveApp(payload.appId);
    if (!item) return { success: false, error: '应用已不在索引中' };
    shell.showItemInFolder(item.launchPath);
    return { success: true };
  });
  ipcMain.handle('dd:app:icon', (_event, payload = {}) => iconCache.get(payload.appId));
  ipcMain.handle('dd:app:set-pinned', (_event, payload = {}) => mutation(() => appIndex.setPinned(payload.appId, payload.pinned)));
  ipcMain.handle('dd:app:set-category', (_event, payload = {}) => mutation(() => appIndex.setCategory(payload.appId, payload.categoryId)));
  ipcMain.handle('dd:category:list', () => appIndex.categoryList());
  ipcMain.handle('dd:category:create', (_event, payload = {}) => mutation(() => ({ category: appIndex.createCategory(payload) })));
  ipcMain.handle('dd:category:update', (_event, payload = {}) => mutation(() => ({ category: appIndex.updateCategory(payload.id, payload) })));
  ipcMain.handle('dd:category:delete', (_event, payload = {}) => mutation(() => appIndex.deleteCategory(payload.id)));
  ipcMain.handle('dd:index:status', () => appIndex.status());
  ipcMain.handle('dd:file:list', (_event, payload = {}) => fileIndex.listRecent(payload.limit));
  ipcMain.handle('dd:file:search', (_event, payload = {}) => fileIndex.search(payload.query, payload.limit));
  ipcMain.handle('dd:file:rescan', async () => {
    const result = await fileIndex.rescan();
    mainWindow?.webContents.send('dd:file-index:updated', fileIndex.status());
    return result;
  });
  ipcMain.handle('dd:file:open', (_event, payload = {}) => fileIndex.open(payload.fileId, (target) => shell.openPath(target)));
  ipcMain.handle('dd:file:thumbnail', async (_event, payload = {}) => {
    const item = fileIndex.resolveFile(payload.fileId);
    if (!item || !['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(path.extname(item.fullPath).toLowerCase())) return null;
    try {
      const image = await nativeImage.createThumbnailFromPath(item.fullPath, { width: 128, height: 128 });
      return image?.isEmpty() ? null : image.toDataURL();
    } catch { return null; }
  });
  ipcMain.handle('dd:file:reveal', (_event, payload = {}) => {
    const item = fileIndex.resolveFile(payload.fileId);
    if (!item) return { success: false, error: '文件已不在索引中' };
    shell.showItemInFolder(item.fullPath);
    return { success: true };
  });
  ipcMain.handle('dd:file:clear-recent', () => fileIndex.clearRecent());
  ipcMain.handle('dd:file:roots', () => fileIndex.roots());
  ipcMain.handle('dd:file:add-root', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { title: '选择要索引的文件夹', properties: ['openDirectory'] });
    if (result.canceled || !result.filePaths[0]) return { success: false, canceled: true };
    const root = fileIndex.addRoot(result.filePaths[0]);
    return { success: true, root };
  });
  ipcMain.handle('dd:file:remove-root', (_event, payload = {}) => mutation(() => fileIndex.removeRoot(payload.rootId)));
  ipcMain.handle('dd:file:open-root', (_event, payload = {}) => {
    const root = fileIndex.resolveRoot(payload.rootId);
    if (!root) return { success: false, error: '收藏目录不存在' };
    return shell.openPath(root.path).then((error) => ({ success: !error, error: error || undefined }));
  });
  ipcMain.handle('dd:file:status', () => fileIndex.status());
  ipcMain.handle('dd:file:rename', async (_event, payload = {}) => {
    const item = fileIndex.resolveFile(payload.fileId);
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!item || !name || name.length > 240 || name !== path.basename(name) || /[<>:"/\\|?*\u0000]/u.test(name)) return { success: false, error: '文件名无效' };
    const destination = path.join(path.dirname(item.fullPath), name);
    try { await fs.promises.rename(item.fullPath, destination); await fileIndex.rescan(); return { success: true }; }
    catch (error) { return { success: false, error: error.code === 'EEXIST' ? '同名文件已存在' : error.message }; }
  });
  ipcMain.handle('dd:file:delete', async (_event, payload = {}) => {
    const item = fileIndex.resolveFile(payload.fileId);
    if (!item) return { success: false, error: '文件已不在索引中' };
    try { await shell.trashItem(item.fullPath); await fileIndex.rescan(); return { success: true }; }
    catch (error) { return { success: false, error: error.message }; }
  });
  ipcMain.handle('dd:file:import', async (_event, payload = {}) => {
    const root = fileIndex.resolveRoot(payload.rootId);
    const paths = Array.isArray(payload.paths) ? payload.paths.slice(0, 100) : [];
    if (!root) return { success: false, error: '目标文件夹不存在' };
    let imported = 0;
    const skipped = [];
    for (const sourceValue of paths) {
      try {
        const source = path.resolve(sourceValue);
        const stat = await fs.promises.stat(source);
        if (!stat.isFile()) throw new Error('仅支持文件');
        let destination = path.join(root.path, path.basename(source));
        for (let suffix = 1; suffix < 1000; suffix += 1) {
          try { await fs.promises.access(destination); const parsed = path.parse(source); destination = path.join(root.path, `${parsed.name} (${suffix})${parsed.ext}`); }
          catch { break; }
        }
        await fs.promises.copyFile(source, destination, fs.constants.COPYFILE_EXCL);
        imported += 1;
      } catch (error) { skipped.push({ name: path.basename(String(sourceValue)), reason: error.message }); }
    }
    await fileIndex.rescan();
    return { success: true, imported, skipped };
  });
  ipcMain.handle('dd:desktop:scan', () => desktopOrganizer.scan());
  ipcMain.handle('dd:desktop:organize', async () => desktopOrganizer.organize());
  ipcMain.handle('dd:desktop:restore-last', async () => desktopOrganizer.restoreLast());
  ipcMain.handle('dd:desktop:restore-points', async () => desktopOrganizer.restorePoints());
  ipcMain.handle('dd:desktop:shortcut-icon', (_event, payload = {}) => shortcutIconCache.get(payload.shortcutId));
  ipcMain.handle('dd:desktop:shortcut-launch', (_event, payload = {}) => desktopOrganizer.launchShortcut(payload.shortcutId, (target) => shell.openPath(target)));
  ipcMain.handle('dd:desktop:shortcut-stow', async () => {
    const result = await desktopOrganizer.stowShortcuts();
    appIndex.relocatePaths(result.movements, 'desktop_vault');
    await appIndex.rescan();
    mainWindow?.webContents.send('dd:index:updated', appIndex.status());
    return { success: true, stowed: result.stowed };
  });
  ipcMain.handle('dd:desktop:shortcut-restore', async () => {
    const result = await desktopOrganizer.restoreShortcuts();
    appIndex.relocatePaths(result.movements, 'desktop_user');
    await appIndex.rescan();
    mainWindow?.webContents.send('dd:index:updated', appIndex.status());
    return { success: true, restored: result.restored, conflicts: result.conflicts };
  });
  ipcMain.handle('dd:board:get', async () => {
    const shortcuts = shortcutBoard.annotate(await desktopOrganizer.listShortcuts());
    return { shortcuts, categories: shortcutBoard.categories(shortcuts) };
  });
  ipcMain.handle('dd:board:category-create', (_event, payload = {}) => mutation(() => ({ category: shortcutBoard.create(payload) })));
  ipcMain.handle('dd:board:category-update', (_event, payload = {}) => mutation(() => ({ category: shortcutBoard.update(payload.id, payload) })));
  ipcMain.handle('dd:board:category-delete', (_event, payload = {}) => mutation(() => shortcutBoard.remove(payload.id)));
  ipcMain.handle('dd:board:assign', async (_event, payload = {}) => {
    const shortcuts = await desktopOrganizer.listShortcuts();
    if (!shortcuts.some((item) => item.id === payload.shortcutId)) return { success: false, error: '快捷方式不存在' };
    return mutation(() => shortcutBoard.assign(payload.shortcutId, payload.categoryId ?? null));
  });
  ipcMain.handle('dd:board:import', async (_event, payload = {}) => {
    const result = await desktopOrganizer.importShortcuts(payload.paths);
    for (const item of result.imported) shortcutBoard.assign(item.id, payload.categoryId ?? null);
    await appIndex.rescan();
    return { ...result, board: { shortcuts: shortcutBoard.annotate(await desktopOrganizer.listShortcuts()) } };
  });
  ipcMain.handle('dd:board:pick', async (_event, payload = {}) => {
    const picked = await dialog.showOpenDialog(mainWindow, { title: '选择要收纳的快捷方式', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Windows 快捷方式', extensions: ['lnk', 'url', 'appref-ms'] }] });
    if (picked.canceled) return { success: false, canceled: true };
    const result = await desktopOrganizer.importShortcuts(picked.filePaths);
    for (const item of result.imported) shortcutBoard.assign(item.id, payload.categoryId ?? null);
    await appIndex.rescan();
    return result;
  });
  ipcMain.handle('dd:weather:get', (_event, payload = {}) => {
    if (process.env.DESKTOPDOCK_SMOKE_TEST === '1') {
      return {
        city: payload.city || '深圳', locationName: '深圳 · 广东', updatedAt: new Date().toISOString(),
        current: { temperature: 31, apparentTemperature: 34, relativeHumidity: 69, precipitationProbability: 18, weatherCode: 2, windSpeed: 9 },
        hourly: Array.from({ length: 6 }, (_item, index) => ({ time: new Date(Date.now() + index * 3600000).toISOString(), temperature: 31 - Math.floor(index / 2), weatherCode: index < 3 ? 2 : 1, precipitationProbability: 18 })),
      };
    }
    return weatherService.get(payload.city || settingsStore.get().weatherCity, { force: Boolean(payload.force) });
  });
  ipcMain.handle('dd:weather:get-coordinates', (_event, payload = {}) => {
    if (process.env.DESKTOPDOCK_SMOKE_TEST === '1') return weatherService.get(payload.city || settingsStore.get().weatherCity).catch(() => ({ city: '当前位置', locationName: '当前位置', current: { temperature: 26, apparentTemperature: 27, relativeHumidity: 60, precipitationProbability: 10, weatherCode: 1, windSpeed: 7, pressure: 1012 }, hourly: [], daily: [] }));
    return weatherService.getByCoordinates(Number(payload.latitude), Number(payload.longitude), { force: Boolean(payload.force) });
  });
  ipcMain.handle('dd:media:control', (_event, payload = {}) => controlMedia(payload.action));
  ipcMain.handle('dd:media:status', () => process.env.DESKTOPDOCK_SMOKE_TEST === '1'
    ? { available: true, title: 'Windows 媒体会话', artist: 'DesktopDock 测试', status: 'Playing', position: 92, duration: 236 }
    : mediaStatus());
  ipcMain.handle('dd:todo:list', () => todoService.list());
  ipcMain.handle('dd:todo:create', (_event, payload = {}) => mutation(() => ({ todo: todoService.create(payload) })));
  ipcMain.handle('dd:todo:update', (_event, payload = {}) => mutation(() => ({ todo: todoService.update(payload.id, payload) })));
  ipcMain.handle('dd:todo:delete', (_event, payload = {}) => mutation(() => todoService.remove(payload.id)));
  ipcMain.handle('dd:todo:reorder', (_event, payload = {}) => mutation(() => todoService.reorder(payload.ids)));
  ipcMain.handle('dd:todo:pick-attachments', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { title: '选择任务附件', properties: ['openFile', 'multiSelections'] });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle('dd:settings:get', () => settingsStore.get());
  ipcMain.handle('dd:settings:set', (_event, payload = {}) => mutation(() => {
    const result = settingsStore.set(payload.key, payload.value);
    applySetting(payload.key, payload.value);
    return result;
  }));
  ipcMain.handle('dd:settings:export', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出桌面舱配置',
      defaultPath: `DesktopDock-config-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON 配置', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { success: false, canceled: true };
    return settingsStore.exportTo(result.filePath, { favoriteFolders: fileIndex.roots().filter((root) => !root.isSystem).map((root) => ({ name: root.name, path: root.path })) });
  });
  ipcMain.handle('dd:settings:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { title: '导入桌面舱配置', properties: ['openFile'], filters: [{ name: 'JSON 配置', extensions: ['json'] }] });
    if (result.canceled || !result.filePaths[0]) return { success: false, canceled: true };
    const imported = await settingsStore.importFrom(result.filePaths[0]);
    for (const folder of imported.favoriteFolders) {
      try {
        if (fs.statSync(folder.path).isDirectory()) fileIndex.addRoot(folder.path, folder.name);
      } catch {
        // Missing imported folders are skipped; the rest of the configuration remains valid.
      }
    }
    applyAllSettings(imported.settings);
    mainWindow?.webContents.send('dd:settings:changed', imported.settings);
    return imported;
  });
  ipcMain.handle('dd:settings:clear-stats', () => mutation(() => {
    appIndex.clearUsage();
    fileIndex.clearUsage();
    return { success: true };
  }));
  ipcMain.handle('dd:about', () => ({ version: app.getVersion(), updateSourceConfigured: false }));
}

function applySetting(key, value) {
  if (key === 'theme') nativeTheme.themeSource = value;
  if (key === 'autoStart' && process.env.DESKTOPDOCK_SMOKE_TEST !== '1') {
    app.setLoginItemSettings(loginItemSettings(value, settingsStore.get().startMinimized));
  }
  if (key === 'startMinimized' && process.env.DESKTOPDOCK_SMOKE_TEST !== '1') {
    app.setLoginItemSettings(loginItemSettings(settingsStore.get().autoStart, value));
  }
  if (key === 'hotkeySearch' || key === 'hotkeyMain') registerShortcuts();
  if (key === 'autoStowShortcuts' && value && desktopOrganizer) {
    void desktopOrganizer.stowShortcuts().then(async () => {
      await appIndex.rescan();
      mainWindow?.webContents.send('dd:index:updated', appIndex.status());
    }).catch((error) => console.error('DesktopDock shortcut stow failed:', error));
  }
}

function applyAllSettings(settings) {
  nativeTheme.themeSource = settings.theme;
  if (process.env.DESKTOPDOCK_SMOKE_TEST !== '1') {
    app.setLoginItemSettings(loginItemSettings(settings.autoStart, settings.startMinimized));
  }
  registerShortcuts();
}

function loginItemSettings(openAtLogin, startMinimized) {
  const portableExecutable = process.env.PORTABLE_EXECUTABLE_FILE;
  if (portableExecutable) {
    return {
      openAtLogin,
      path: portableExecutable,
      args: startMinimized ? ['--hidden'] : [],
    };
  }
  return { openAtLogin, openAsHidden: startMinimized };
}

function applicationRoots(shortcutVaultDirectory) {
  const roots = [
    { source: 'start_menu_user', directory: path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs') },
    { source: 'start_menu_public', directory: path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs') },
    { source: 'desktop_user', directory: app.getPath('desktop') },
    { source: 'desktop_public', directory: path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Desktop') },
    { source: 'desktop_vault', directory: shortcutVaultDirectory },
  ];
  const seen = new Set();
  return roots.filter((root) => {
    const key = path.resolve(root.directory).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fileRoots() {
  return [
    { id: 'desktop', name: '桌面', directory: app.getPath('desktop'), isSystem: true },
    { id: 'downloads', name: '下载', directory: app.getPath('downloads'), isSystem: true },
    { id: 'documents', name: '文档', directory: app.getPath('documents'), isSystem: true },
    { id: 'pictures', name: '图片', directory: app.getPath('pictures'), isSystem: true },
    { id: 'videos', name: '视频', directory: app.getPath('videos'), isSystem: true },
  ];
}

function showSearch() {
  if (!mainWindow) createMainWindow();
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('dd:search:show');
}

function registerShortcuts() {
  globalShortcut.unregisterAll();
  const settings = settingsStore?.get();
  shortcutRegistration.search.requested = settings?.hotkeySearch || 'Alt+Space';
  shortcutRegistration.toggleWindow.requested = settings?.hotkeyMain || 'Alt+D';
  const registerFirstAvailable = (candidates, handler) => candidates.find((accelerator) => {
    try {
      return globalShortcut.register(accelerator, handler);
    } catch {
      return false;
    }
  }) || null;

  shortcutRegistration.search.active = registerFirstAvailable(
    [...new Set([shortcutRegistration.search.requested, 'CommandOrControl+Shift+Space'])],
    showSearch,
  );
  shortcutRegistration.toggleWindow.active = registerFirstAvailable(
    [...new Set([shortcutRegistration.toggleWindow.requested, 'CommandOrControl+Shift+D'])],
    () => {
      if (!mainWindow) createMainWindow();
      if (!mainWindow) return;
      if (mainWindow.isVisible()) mainWindow.hide();
      else {
        mainWindow.show();
        mainWindow.focus();
      }
    },
  );
}

app.whenReady().then(async () => {
  if (process.env.DESKTOPDOCK_SMOKE_TEST === '1') console.log('DesktopDock smoke: app ready');
  const databasePath = path.join(app.getPath('userData'), 'data.db');
  const shortcutVaultDirectory = path.join(app.getPath('userData'), 'desktop-shortcuts');
  appIndex = createAppIndex(databasePath, applicationRoots(shortcutVaultDirectory));
  fileIndex = createFileIndex(databasePath, fileRoots());
  settingsStore = createSettingsStore(databasePath);
  shortcutBoard = createShortcutBoard(databasePath);
  todoService = createTodoService(databasePath);
  weatherService = createWeatherService(path.join(app.getPath('userData'), 'weather-cache.json'));
  desktopOrganizer = createDesktopOrganizer({
    desktopDirectory: app.getPath('desktop'),
    additionalScanDirectories: [path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Desktop')],
    restoreDirectory: path.join(app.getPath('userData'), 'restore-points'),
    shortcutVaultDirectory,
    destinations: {
      documents: path.join(app.getPath('documents'), '桌面整理'),
      images: path.join(app.getPath('pictures'), '桌面整理'),
      videos: path.join(app.getPath('videos'), '桌面整理'),
      archives: path.join(app.getPath('downloads'), '桌面整理'),
      other: path.join(app.getPath('documents'), '桌面整理', '其他'),
    },
  });
  iconCache = createIconCache(
    path.join(app.getPath('userData'), 'icon-cache-v3'),
    resolvedFileIcon,
    (appId) => appIndex.iconSource(appId),
  );
  shortcutIconCache = createIconCache(
    path.join(app.getPath('userData'), 'shortcut-icon-cache-v2'),
    resolvedFileIcon,
    (shortcutId) => desktopOrganizer.shortcutIconSource(shortcutId),
    { idPattern: /^shortcut_[a-f0-9]{20}$/ },
  );
  registerIpc();
  try {
    if (process.env.DESKTOPDOCK_SMOKE_TEST !== '1' && settingsStore.get().autoStowShortcuts) await desktopOrganizer.stowShortcuts();
    await appIndex.rescan();
    await desktopOrganizer.listShortcuts();
  } catch (error) {
    console.error('DesktopDock application scan failed:', error);
  }
  if (process.env.DESKTOPDOCK_SMOKE_TEST === '1') console.log('DesktopDock smoke: application index ready');
  createMainWindow();
  await createTray();
  applyAllSettings(settingsStore.get());
  if (process.env.DESKTOPDOCK_SMOKE_TEST !== '1') {
    const notifyTodos = () => {
      for (const todo of todoService.dueReminders()) {
        if (Notification.isSupported()) new Notification({ title: '桌面舱待办提醒', body: todo.title }).show();
      }
    };
    notifyTodos();
    reminderTimer = setInterval(notifyTodos, 30_000);
  }
  void fileIndex.rescan().then(() => mainWindow?.webContents.send('dd:file-index:updated', fileIndex.status())).catch((error) => {
    console.error('DesktopDock file scan failed:', error);
  });

  nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('dd:theme:changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else {
      positionDockWindow();
      mainWindow?.show();
    }
  });
  screen.on('display-metrics-changed', () => positionDockWindow());
});

app.on('before-quit', () => { isQuitting = true; });
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = null;
  appIndex?.close();
  fileIndex?.close();
  settingsStore?.close();
  appIndex = null;
  iconCache = null;
  shortcutIconCache = null;
  fileIndex = null;
  desktopOrganizer = null;
  settingsStore = null;
  weatherService = null;
  shortcutBoard?.close();
  todoService?.close();
  shortcutBoard = null;
  todoService = null;
  tray?.destroy();
  tray = null;
});
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') app.quit();
});
