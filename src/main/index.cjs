const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { app, BrowserWindow, dialog, globalShortcut, ipcMain, nativeTheme, shell } = require('electron');
const { createAppIndex } = require('./services/app-index.cjs');
const { createIconCache } = require('./services/icon-cache.cjs');
const { createFileIndex } = require('./services/file-index.cjs');
const { createDesktopOrganizer } = require('./services/desktop-organizer.cjs');
const { createSettingsStore } = require('./services/settings-store.cjs');

if (process.env.DESKTOPDOCK_SMOKE_TEST === '1') {
  app.disableHardwareAcceleration();
  const smokeData = path.join(os.tmpdir(), `desktopdock-smoke-${process.pid}`);
  fs.mkdirSync(smokeData, { recursive: true });
  app.setPath('userData', smokeData);
}

let mainWindow = null;
let appIndex = null;
let iconCache = null;
let fileIndex = null;
let desktopOrganizer = null;
let settingsStore = null;
const shortcutRegistration = {
  search: { requested: 'Alt+Space', active: null },
  toggleWindow: { requested: 'Alt+D', active: null },
};

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
        && document.querySelectorAll('#pageContent .organize-row').length === 6
        && document.querySelector('#pageContent')?.textContent.includes('文件夹和快捷方式不会被移动');
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
      && result.fileBridge && result.organizerPreviewSafe && result.settingsPersistence && result.aboutVersion
      && result.categoryForm && result.categoryPicker
      && result.filesPage && result.organizePage && result.settingsPage
      && result.iconDataAvailable && result.iconCacheStable && result.realIconRendered
      && result.shortcuts.search.active && result.shortcuts.toggleWindow.active;
    console.log(`DesktopDock smoke test: ${JSON.stringify(result)}`);
    app.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('DesktopDock smoke test failed:', error);
    app.exit(1);
  }
}

function createMainWindow() {
  const isSmokeTest = process.env.DESKTOPDOCK_SMOKE_TEST === '1';
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 720,
    minHeight: 520,
    show: false,
    frame: false,
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
    if (!settingsStore?.get().startMinimized || process.env.DESKTOPDOCK_SMOKE_TEST === '1') mainWindow?.show();
    if (process.env.DESKTOPDOCK_SMOKE_TEST === '1' && mainWindow) void runSmokeTest(mainWindow);
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function currentWindow(event) {
  return BrowserWindow.fromWebContents(event.sender);
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
  ipcMain.handle('dd:desktop:scan', () => desktopOrganizer.scan());
  ipcMain.handle('dd:desktop:organize', async () => desktopOrganizer.organize());
  ipcMain.handle('dd:desktop:restore-last', async () => desktopOrganizer.restoreLast());
  ipcMain.handle('dd:desktop:restore-points', async () => desktopOrganizer.restorePoints());
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
    app.setLoginItemSettings({ openAtLogin: value, openAsHidden: settingsStore.get().startMinimized });
  }
  if (key === 'startMinimized' && process.env.DESKTOPDOCK_SMOKE_TEST !== '1') {
    app.setLoginItemSettings({ openAtLogin: settingsStore.get().autoStart, openAsHidden: value });
  }
  if (key === 'hotkeySearch' || key === 'hotkeyMain') registerShortcuts();
}

function applyAllSettings(settings) {
  nativeTheme.themeSource = settings.theme;
  if (process.env.DESKTOPDOCK_SMOKE_TEST !== '1') {
    app.setLoginItemSettings({ openAtLogin: settings.autoStart, openAsHidden: settings.startMinimized });
  }
  registerShortcuts();
}

function applicationRoots() {
  const roots = [
    { source: 'start_menu_user', directory: path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs') },
    { source: 'start_menu_public', directory: path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs') },
    { source: 'desktop_user', directory: app.getPath('desktop') },
    { source: 'desktop_public', directory: path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Desktop') },
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
  appIndex = createAppIndex(databasePath, applicationRoots());
  fileIndex = createFileIndex(databasePath, fileRoots());
  settingsStore = createSettingsStore(databasePath);
  desktopOrganizer = createDesktopOrganizer({
    desktopDirectory: app.getPath('desktop'),
    additionalScanDirectories: [path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Desktop')],
    restoreDirectory: path.join(app.getPath('userData'), 'restore-points'),
    destinations: {
      documents: path.join(app.getPath('documents'), '桌面整理'),
      images: path.join(app.getPath('pictures'), '桌面整理'),
      videos: path.join(app.getPath('videos'), '桌面整理'),
      archives: path.join(app.getPath('downloads'), '桌面整理'),
      other: path.join(app.getPath('documents'), '桌面整理', '其他'),
    },
  });
  iconCache = createIconCache(
    path.join(app.getPath('userData'), 'icon-cache'),
    (target) => app.getFileIcon(target, { size: 'large' }),
    (appId) => appIndex.iconSource(appId),
  );
  registerIpc();
  try {
    await appIndex.rescan();
  } catch (error) {
    console.error('DesktopDock application scan failed:', error);
  }
  if (process.env.DESKTOPDOCK_SMOKE_TEST === '1') console.log('DesktopDock smoke: application index ready');
  createMainWindow();
  applyAllSettings(settingsStore.get());
  void fileIndex.rescan().then(() => mainWindow?.webContents.send('dd:file-index:updated', fileIndex.status())).catch((error) => {
    console.error('DesktopDock file scan failed:', error);
  });

  nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('dd:theme:changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  appIndex?.close();
  fileIndex?.close();
  settingsStore?.close();
  appIndex = null;
  iconCache = null;
  fileIndex = null;
  desktopOrganizer = null;
  settingsStore = null;
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
