const api = window.desktopDock;
const ICONS = {
  desktop: '&#xE8FC;', apps: '&#xE80A;', files: '&#xE8A5;', settings: '&#xE713;',
  search: '&#xE721;', refresh: '&#xE72C;', organize: '&#xE7C5;', restore: '&#xE7A7;',
  shortcut: '&#xE8A7;', info: '&#xE946;', folder: '&#xE8B7;', check: '&#xE73E;',
  warning: '&#xE7BA;', hide: '&#xE738;', power: '&#xE7E8;', theme: '&#xE771;',
};

const demoShortcuts = [
  { id: 'shortcut_demo_01', name: '浏览器', location: 'desktop' },
  { id: 'shortcut_demo_02', name: '代码编辑器', location: 'desktop' },
  { id: 'shortcut_demo_03', name: '音乐', location: 'stowed' },
  { id: 'shortcut_demo_04', name: '设计工具', location: 'public' },
];
const demoApps = [
  { id: 'app_demo_01', name: 'Visual Studio Code', category: '开发', pinned: 1 },
  { id: 'app_demo_02', name: 'Chrome', category: '工具', pinned: 1 },
  { id: 'app_demo_03', name: '微信', category: '社交', pinned: 0 },
  { id: 'app_demo_04', name: 'Photoshop', category: '设计', pinned: 0 },
];
const demoFiles = [
  { id: 'file_demo_01', name: 'DesktopDock 设计说明.md', extension: '.md', modifiedAt: new Date().toISOString(), rootName: '文档' },
  { id: 'file_demo_02', name: '界面预览.png', extension: '.png', modifiedAt: new Date().toISOString(), rootName: '图片' },
];

const state = {
  active: 'desktop',
  category: '全部',
  showAllShortcuts: false,
  loading: Boolean(api?.isElectron),
  busy: false,
  apps: api?.isElectron ? [] : demoApps,
  shortcuts: api?.isElectron ? [] : demoShortcuts,
  files: api?.isElectron ? [] : demoFiles,
  categories: [],
  organizer: { desktopShortcuts: 3, stowedShortcuts: 1, publicShortcuts: 1, files: 4, folders: 2, restorePoints: [] },
  settings: { theme: 'system', autoStart: false, startMinimized: false, closeAfterLaunch: true, animations: true },
  index: { totalApps: demoApps.length, lastScanAt: null },
  searchIndex: 0,
  searchResults: [],
  error: null,
};

const appIconMemory = new Map();
const shortcutIconMemory = new Map();
let iconGeneration = 0;
let toastTimer;
let searchTimer;
let dialogReturnFocus = null;

const dock = document.querySelector('#desktopApp');
const dockStatus = document.querySelector('#dockStatus');
const dockClock = document.querySelector('#dockClock');
const dockSearch = document.querySelector('#dockSearch');
const dockSearchResults = document.querySelector('#dockSearchResults');
const dockSummary = document.querySelector('#dockSummary');
const dockContent = document.querySelector('#dockContent');
const dockNav = document.querySelector('#dockNav');
const dialogLayer = document.querySelector('#dockDialogLayer');
const dialog = document.querySelector('#dockDialog');
const toast = document.querySelector('#dockToast');

if (api?.isElectron) document.body.classList.add('is-electron');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function icon(glyph) {
  return `<span class="fluent-icon" aria-hidden="true">${glyph}</span>`;
}

function itemMark(name) {
  const clean = String(name || '').trim();
  if (!clean) return '?';
  if (/^[\u3400-\u9fff]/u.test(clean)) return clean.slice(0, 1);
  const words = clean.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.slice(0, 2).map((word) => word[0]).join('') : clean.slice(0, 2)).toUpperCase();
}

function itemIcon(item, kind) {
  const memory = kind === 'shortcut' ? shortcutIconMemory : appIconMemory;
  const image = memory.get(item.id);
  return `<span class="item-icon ${image ? 'has-image' : ''}" data-${kind}-icon="${escapeHtml(item.id)}" aria-hidden="true">${image ? `<img src="${image}" alt="" />` : escapeHtml(itemMark(item.name))}</span>`;
}

function locationLabel(location) {
  return ({ desktop: '当前桌面', stowed: '已收纳', public: '公共桌面' })[location] || '桌面';
}

function fileType(file) {
  const types = { '.md': 'Markdown', '.doc': 'Word', '.docx': 'Word', '.xls': 'Excel', '.xlsx': 'Excel', '.ppt': '演示文稿', '.pptx': '演示文稿', '.pdf': 'PDF', '.png': '图片', '.jpg': '图片', '.zip': '压缩文件' };
  return types[file.extension] || (file.extension ? `${file.extension.slice(1).toUpperCase()} 文件` : '文件');
}

function renderNav() {
  const items = [
    ['desktop', '桌面', ICONS.desktop],
    ['apps', '应用', ICONS.apps],
    ['files', '文件', ICONS.files],
    ['settings', '设置', ICONS.settings],
  ];
  dockNav.innerHTML = items.map(([id, label, glyph]) => `<button type="button" class="${state.active === id ? 'active' : ''}" data-view="${id}" aria-current="${state.active === id ? 'page' : 'false'}">${icon(glyph)}<span>${label}</span></button>`).join('');
}

function renderSummary() {
  const managed = state.organizer.desktopShortcuts + state.organizer.stowedShortcuts;
  dockSummary.innerHTML = `<i class="status-dot ${state.error ? 'error' : ''}" aria-hidden="true"></i><span>${state.error ? escapeHtml(state.error) : state.loading ? '正在同步桌面状态' : `${state.index.totalApps} 个应用 · ${managed} 个个人快捷方式 · 本地运行`}</span>${state.error ? '<button type="button" data-action="refresh-all">重试</button>' : state.active !== 'settings' ? '<button type="button" data-view="settings">管理</button>' : ''}`;
}

function moduleHeader(glyph, title, detail, actions = '') {
  return `<header class="module-header"><div class="module-title">${icon(glyph)}<span><h2>${escapeHtml(title)}</h2><small>${escapeHtml(detail)}</small></span></div>${actions ? `<div class="module-actions">${actions}</div>` : ''}</header>`;
}

function shortcutTile(item) {
  return `<button class="shortcut-tile" type="button" data-shortcut="${escapeHtml(item.id)}" title="打开 ${escapeHtml(item.name)}">${itemIcon(item, 'shortcut')}<b>${escapeHtml(item.name)}</b><small>${locationLabel(item.location)}</small></button>`;
}

function desktopView() {
  const visible = state.showAllShortcuts ? state.shortcuts : state.shortcuts.slice(0, 16);
  const shortcutActions = `<button type="button" data-action="toggle-shortcuts">${state.showAllShortcuts ? '收起' : `全部 ${state.shortcuts.length}`}</button>`;
  const shortcutBody = state.loading
    ? `<div class="empty-state loading-state">${icon(ICONS.refresh)}<b>正在读取桌面快捷方式</b><span>图标会在后台逐步加载。</span></div>`
    : visible.length
      ? `<div class="shortcut-grid">${visible.map(shortcutTile).join('')}</div>`
      : `<div class="empty-state">${icon(ICONS.check)}<b>桌面快捷方式已清空</b><span>系统图标不会被收纳；新的快捷方式会在刷新后出现。</span></div>`;
  const recent = state.files.slice(0, 4);
  return `<section class="module shortcut-module">${moduleHeader(ICONS.desktop, '桌面快捷方式', `当前 ${state.organizer.desktopShortcuts} · 收纳 ${state.organizer.stowedShortcuts} · 公共 ${state.organizer.publicShortcuts}`, shortcutActions)}${shortcutBody}</section>
    <section class="module">${moduleHeader(ICONS.organize, '桌面状态', '文件整理与快捷方式收纳相互独立')}
      <div class="desktop-meter"><span><b>${state.organizer.desktopShortcuts}</b><small>可收纳</small></span><span><b>${state.organizer.files}</b><small>普通文件</small></span><span><b>${state.organizer.folders}</b><small>保留文件夹</small></span></div>
      <div class="desktop-actions"><button type="button" data-action="stow-shortcuts" ${state.busy || !state.organizer.desktopShortcuts ? 'disabled' : ''}>收纳快捷方式</button><button type="button" data-action="restore-shortcuts" ${state.busy || !state.organizer.stowedShortcuts ? 'disabled' : ''}>恢复到桌面</button><button type="button" data-action="organize-files" ${state.busy || !state.organizer.files ? 'disabled' : ''}>整理普通文件</button><button type="button" data-action="restore-files" ${state.busy || !state.organizer.restorePoints?.length ? 'disabled' : ''}>撤销文件整理</button></div>
    </section>
    <section class="module">${moduleHeader(ICONS.files, '继续处理', `${recent.length} 个最近文件`, '<button type="button" data-view="files">查看文件</button>')}${recent.length ? `<div class="file-list">${recent.map(fileRow).join('')}</div>` : `<div class="empty-state">${icon(ICONS.files)}<b>还没有最近文件</b><span>打开过的文件会显示在这里。</span></div>`}</section>`;
}

function appRow(item) {
  return `<button class="app-row" type="button" data-app="${escapeHtml(item.id)}">${itemIcon(item, 'app')}<span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.category || '其他')}${item.pinned ? ' · 已固定' : ''}</small></span></button>`;
}

function appsView() {
  const categoryNames = ['全部', ...new Set(state.categories.map((item) => item.name).filter(Boolean))];
  const filtered = state.category === '全部' ? state.apps : state.apps.filter((item) => item.category === state.category);
  return `<section class="module">${moduleHeader(ICONS.apps, '应用舱', `${filtered.length} 个应用`, '<button type="button" data-action="rescan-apps">重新扫描</button>')}
    <div class="app-groups">${categoryNames.map((name) => `<button type="button" class="${state.category === name ? 'active' : ''}" data-category="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}</div>
    ${state.loading ? `<div class="empty-state loading-state">${icon(ICONS.refresh)}<b>正在建立应用索引</b></div>` : filtered.length ? `<div class="app-grid">${filtered.map(appRow).join('')}</div>` : `<div class="empty-state">${icon(ICONS.apps)}<b>此分类暂无应用</b><span>重新扫描或选择其他分类。</span></div>`}</section>`;
}

function fileRow(file) {
  const activity = file.lastOpenedAt || file.modifiedAt;
  const label = activity ? new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(activity)) : '';
  return `<button class="file-row" type="button" data-file="${escapeHtml(file.id)}"><span class="item-icon" aria-hidden="true">${escapeHtml((file.extension || 'FILE').replace('.', '').slice(0, 3).toUpperCase())}</span><span><b>${escapeHtml(file.name)}</b><small>${escapeHtml(fileType(file))} · ${escapeHtml(file.rootName || '本机')}</small></span><time>${escapeHtml(label)}</time></button>`;
}

function filesView() {
  return `<section class="module">${moduleHeader(ICONS.files, '最近文件', `${state.files.length} 个项目`, '<button type="button" data-action="rescan-files">刷新索引</button>')}
    ${state.loading ? `<div class="empty-state loading-state">${icon(ICONS.refresh)}<b>正在读取文件索引</b></div>` : state.files.length ? `<div class="file-list">${state.files.map(fileRow).join('')}</div>` : `<div class="empty-state">${icon(ICONS.files)}<b>没有最近文件</b><span>文件索引只保存名称、大小和修改时间。</span></div>`}</section>`;
}

function settingToggle(key, title, detail) {
  const checked = Boolean(state.settings[key]);
  return `<div class="setting-row"><span><b>${escapeHtml(title)}</b><small>${escapeHtml(detail)}</small></span><button class="toggle ${checked ? 'on' : ''}" type="button" role="switch" aria-checked="${checked}" data-setting="${key}" aria-label="${escapeHtml(title)}"></button></div>`;
}

function settingsView() {
  const themeLabel = ({ system: '跟随系统', light: '浅色', dark: '深色' })[state.settings.theme] || '跟随系统';
  return `<section class="module">${moduleHeader(ICONS.settings, '状态栏设置', '关闭窗口后继续在系统托盘运行')}
    <div class="settings-list">${settingToggle('autoStart', '开机自动启动', '便携版使用原始 EXE 路径注册')}${settingToggle('startMinimized', '启动时隐藏', '仅在需要时从托盘或快捷键唤起')}${settingToggle('closeAfterLaunch', '启动项目后隐藏', '打开应用、快捷方式或文件后收起状态栏')}</div>
    <div class="setting-row"><span><b>界面主题</b><small>${themeLabel}</small></span><button class="text-action" type="button" data-action="cycle-theme">切换</button></div>
    <div class="settings-actions"><button type="button" data-action="export-config">导出配置</button><button type="button" data-action="import-config">导入配置</button><button type="button" data-action="refresh-all">刷新全部数据</button><button type="button" class="danger-action" data-action="quit-app">退出桌面舱</button></div>
  </section>
  <section class="module">${moduleHeader(ICONS.info, '运行方式', '右侧状态栏 · 托盘常驻 · 本地数据')}<div class="desktop-meter"><span><b>${state.index.totalApps}</b><small>应用</small></span><span><b>${state.shortcuts.length}</b><small>快捷方式</small></span><span><b>${state.files.length}</b><small>最近文件</small></span></div></section>`;
}

function render() {
  renderNav();
  renderSummary();
  const views = { desktop: desktopView, apps: appsView, files: filesView, settings: settingsView };
  dockContent.innerHTML = state.error
    ? `<section class="module"><div class="empty-state">${icon(ICONS.warning)}<b>桌面数据暂时不可用</b><span>${escapeHtml(state.error)}</span><button class="text-action" type="button" data-action="refresh-all">重新连接</button></div></section>`
    : (views[state.active] || desktopView)();
  dockStatus.textContent = state.error ? '桌面数据需要重试' : state.loading ? '正在同步桌面' : '桌面状态已就绪';
  void hydrateIcons();
}

function updateClock() {
  const now = new Date();
  dockClock.textContent = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  dockClock.dateTime = now.toISOString();
}

function applyTheme(theme) {
  const resolved = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = resolved;
}

function showToast(message, tone = 'success') {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('error', tone === 'error');
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}

function openDialog(contents) {
  dialogReturnFocus = document.activeElement;
  dialog.innerHTML = contents;
  dialogLayer.hidden = false;
  dock.inert = true;
  dialog.querySelector('button')?.focus();
}

function closeDialog() {
  dialogLayer.hidden = true;
  dialog.innerHTML = '';
  dock.inert = false;
  dialogReturnFocus?.focus?.();
  dialogReturnFocus = null;
}

function confirmDialog(title, detail, bullets, confirmAction, confirmLabel) {
  openDialog(`<header class="dialog-header"><h2 id="dockDialogTitle">${escapeHtml(title)}</h2><p>${escapeHtml(detail)}</p></header><div class="dialog-body"><ul>${bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div><footer class="dialog-footer"><button type="button" data-action="close-dialog">取消</button><button class="primary" type="button" data-action="${confirmAction}">${escapeHtml(confirmLabel)}</button></footer>`);
}

async function hydrateIcons() {
  if (!api?.isElectron) return;
  const generation = ++iconGeneration;
  const tasks = [
    ...state.shortcuts.filter((item) => !shortcutIconMemory.has(item.id)).map((item) => ({ item, kind: 'shortcut' })),
    ...state.apps.filter((item) => !appIconMemory.has(item.id)).map((item) => ({ item, kind: 'app' })),
  ];
  let cursor = 0;
  const worker = async () => {
    while (cursor < tasks.length && generation === iconGeneration) {
      const task = tasks[cursor++];
      const value = task.kind === 'shortcut'
        ? await api.desktop.shortcutIcon(task.item.id).catch(() => null)
        : await api.apps.icon(task.item.id).catch(() => null);
      if (generation !== iconGeneration) return;
      const safe = typeof value === 'string' && value.startsWith('data:image/png;base64,') ? value : null;
      const memory = task.kind === 'shortcut' ? shortcutIconMemory : appIconMemory;
      memory.set(task.item.id, safe);
      if (!safe) continue;
      document.querySelectorAll(`[data-${task.kind}-icon="${task.item.id}"]`).forEach((container) => {
        const image = document.createElement('img');
        image.src = safe;
        image.alt = '';
        container.replaceChildren(image);
        container.classList.add('has-image');
      });
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, tasks.length) }, worker));
}

async function loadData({ rescan = false } = {}) {
  if (!api?.isElectron) {
    state.loading = false;
    render();
    return;
  }
  state.loading = true;
  state.error = null;
  render();
  try {
    if (rescan) await Promise.all([api.apps.rescan(), api.files.rescan()]);
    const [apps, categories, files, organizer, restorePoints, settings, index] = await Promise.all([
      api.apps.list({ size: 500 }), api.categories.list(), api.files.list(30), api.desktop.scan(),
      api.desktop.restorePoints(), api.settings.get(), api.index.getStatus(),
    ]);
    state.apps = apps;
    state.categories = categories;
    state.files = files;
    state.shortcuts = organizer.shortcutItems || [];
    state.organizer = { ...state.organizer, ...organizer, restorePoints };
    state.settings = { ...state.settings, ...settings };
    state.index = index;
    state.loading = false;
    state.error = null;
    applyTheme(state.settings.theme);
    render();
  } catch (error) {
    state.loading = false;
    state.error = error?.message || '读取失败，请检查桌面访问权限';
    render();
    showToast(error?.message || '桌面数据读取失败，请重试', 'error');
  }
}

async function afterLaunch(result, successMessage) {
  if (!result?.success) return showToast(result?.error || '项目无法打开，请刷新后重试', 'error');
  showToast(successMessage);
  if (state.settings.closeAfterLaunch) await api?.window?.hide?.();
}

async function refreshApps() {
  if (!api?.isElectron || state.busy) return;
  state.busy = true;
  render();
  const result = await api.apps.rescan().catch(() => null);
  state.busy = false;
  await loadData();
  showToast(result ? `应用扫描完成：${result.total} 个` : '应用扫描失败', result ? 'success' : 'error');
}

async function refreshFiles() {
  if (!api?.isElectron || state.busy) return;
  state.busy = true;
  render();
  const result = await api.files.rescan().catch(() => null);
  state.busy = false;
  await loadData();
  showToast(result ? `文件索引已刷新：${result.total} 个` : '文件索引刷新失败', result ? 'success' : 'error');
}

async function stowShortcuts() {
  closeDialog();
  state.busy = true;
  render();
  const result = await api?.desktop?.stowShortcuts().catch(() => null);
  state.busy = false;
  await loadData();
  showToast(result?.success ? `已收纳 ${result.stowed} 个桌面快捷方式` : '收纳失败，请检查桌面访问权限', result?.success ? 'success' : 'error');
}

async function restoreShortcuts() {
  if (state.busy) return;
  state.busy = true;
  render();
  const result = await api?.desktop?.restoreShortcuts().catch(() => null);
  state.busy = false;
  await loadData();
  const conflicts = result?.conflicts?.length || 0;
  showToast(result?.success ? `已恢复 ${result.restored} 个${conflicts ? `，${conflicts} 个冲突已跳过` : ''}` : '快捷方式恢复失败', result?.success && !conflicts ? 'success' : 'error');
}

async function organizeFiles() {
  closeDialog();
  state.busy = true;
  render();
  const result = await api?.desktop?.organize().catch(() => null);
  state.busy = false;
  await loadData();
  showToast(result?.success ? `已整理 ${result.organized} 个普通文件` : '普通文件整理失败', result?.success ? 'success' : 'error');
}

async function restoreFiles() {
  if (state.busy) return;
  state.busy = true;
  render();
  const result = await api?.desktop?.restoreLast().catch(() => null);
  state.busy = false;
  await loadData();
  showToast(result?.success ? `已恢复 ${result.restored} 个普通文件` : (result?.error || '没有可用的文件还原点'), result?.success ? 'success' : 'error');
}

async function saveSetting(key, value) {
  const previous = state.settings[key];
  state.settings[key] = value;
  applyTheme(state.settings.theme);
  render();
  if (!api?.settings) return;
  const result = await api.settings.set(key, value).catch(() => ({ success: false }));
  if (!result.success) {
    state.settings[key] = previous;
    applyTheme(state.settings.theme);
    render();
    showToast('设置保存失败', 'error');
  }
}

function renderSearchResults(results) {
  state.searchResults = results;
  state.searchIndex = Math.min(state.searchIndex, Math.max(0, results.length - 1));
  dockSearchResults.hidden = false;
  dockSearchResults.innerHTML = results.length ? results.map((result, index) => `<button class="search-result ${index === state.searchIndex ? 'selected' : ''}" type="button" data-search-index="${index}">${result.kind === 'shortcut' ? itemIcon(result.item, 'shortcut') : result.kind === 'app' ? itemIcon(result.item, 'app') : `<span class="item-icon" aria-hidden="true">${escapeHtml((result.item.extension || 'FILE').replace('.', '').slice(0, 3).toUpperCase())}</span>`}<span><b>${escapeHtml(result.item.name)}</b><small>${escapeHtml(result.detail)}</small></span><em>打开</em></button>`).join('') : '<div class="search-empty">没有匹配项目</div>';
}

async function search(query) {
  const normalized = query.trim().toLocaleLowerCase('zh-CN');
  if (!normalized) {
    dockSearchResults.hidden = true;
    state.searchResults = [];
    return;
  }
  const local = [
    ...state.shortcuts.filter((item) => item.name.toLocaleLowerCase('zh-CN').includes(normalized)).map((item) => ({ kind: 'shortcut', item, detail: `${locationLabel(item.location)}快捷方式` })),
    ...state.apps.filter((item) => item.name.toLocaleLowerCase('zh-CN').includes(normalized)).map((item) => ({ kind: 'app', item, detail: `${item.category || '其他'}应用` })),
  ];
  let fileResults = state.files.filter((item) => item.name.toLocaleLowerCase('zh-CN').includes(normalized));
  if (api?.files?.search) fileResults = await api.files.search(query, 8).catch(() => fileResults);
  renderSearchResults([...local, ...fileResults.map((item) => ({ kind: 'file', item, detail: fileType(item) }))].slice(0, 12));
}

async function openSearchResult(index) {
  const result = state.searchResults[index];
  if (!result) return;
  dockSearchResults.hidden = true;
  dockSearch.value = '';
  if (!api?.isElectron) return showToast(`网页预览：${result.item.name}`);
  if (result.kind === 'shortcut') await afterLaunch(await api?.desktop?.launchShortcut(result.item.id), `已打开 ${result.item.name}`);
  else if (result.kind === 'app') await afterLaunch(await api?.apps?.launch(result.item.id), `已启动 ${result.item.name}`);
  else await afterLaunch(await api?.files?.open(result.item.id), `已打开 ${result.item.name}`);
}

function handleAction(action, element) {
  if (action === 'hide-dock') void api?.window?.hide?.();
  if (action === 'refresh-all') void loadData({ rescan: true }).then(() => showToast('桌面数据已刷新'));
  if (action === 'toggle-shortcuts') { state.showAllShortcuts = !state.showAllShortcuts; render(); }
  if (action === 'rescan-apps') void refreshApps();
  if (action === 'rescan-files') void refreshFiles();
  if (action === 'stow-shortcuts') confirmDialog('收纳桌面快捷方式', `将 ${state.organizer.desktopShortcuts} 个当前用户快捷方式移入桌面舱。`, ['系统图标、文件夹和普通文件保持原位', '公共桌面快捷方式只显示，不会移动', '收纳后仍可在状态栏启动并随时恢复'], 'confirm-stow', `确认收纳 ${state.organizer.desktopShortcuts} 个`);
  if (action === 'confirm-stow') void stowShortcuts();
  if (action === 'restore-shortcuts') void restoreShortcuts();
  if (action === 'organize-files') confirmDialog('整理普通文件', `将 ${state.organizer.files} 个普通文件移动到对应整理目录。`, ['强制创建安全还原点', '同名文件自动安全改名', '快捷方式和文件夹保持原位'], 'confirm-organize', `整理 ${state.organizer.files} 个文件`);
  if (action === 'confirm-organize') void organizeFiles();
  if (action === 'restore-files') void restoreFiles();
  if (action === 'close-dialog') closeDialog();
  if (action === 'cycle-theme') {
    const values = ['system', 'light', 'dark'];
    void saveSetting('theme', values[(values.indexOf(state.settings.theme) + 1) % values.length]);
  }
  if (action === 'export-config') void api?.settings?.export?.().then((result) => { if (result?.success) showToast('配置已导出'); });
  if (action === 'import-config') void api?.settings?.import?.().then(() => loadData()).then(() => showToast('配置已导入'));
  if (action === 'quit-app') confirmDialog('退出桌面舱', '退出后状态栏和全局快捷键将停止工作。', ['下次仍可直接运行便携 EXE', '已收纳的快捷方式不会丢失'], 'confirm-quit', '确认退出');
  if (action === 'confirm-quit') void api?.window?.quit?.();
  if (element) element.blur();
}

document.addEventListener('click', (event) => {
  const view = event.target.closest('[data-view]');
  if (view) { state.active = view.dataset.view; render(); dockContent.scrollTop = 0; dockContent.focus(); }
  const action = event.target.closest('[data-action]');
  if (action) handleAction(action.dataset.action, action);
  const category = event.target.closest('[data-category]');
  if (category) { state.category = category.dataset.category; render(); }
  const shortcut = event.target.closest('[data-shortcut]');
  if (shortcut) {
    const item = state.shortcuts.find((entry) => entry.id === shortcut.dataset.shortcut);
    if (item && api?.desktop) void api.desktop.launchShortcut(item.id).then((result) => afterLaunch(result, `已打开 ${item.name}`));
    else if (item) showToast(`网页预览：${item.name}`);
  }
  const appButton = event.target.closest('[data-app]');
  if (appButton) {
    const item = state.apps.find((entry) => entry.id === appButton.dataset.app);
    if (item && api?.apps) void api.apps.launch(item.id).then((result) => afterLaunch(result, `已启动 ${item.name}`));
    else if (item) showToast(`网页预览：${item.name}`);
  }
  const fileButton = event.target.closest('[data-file]');
  if (fileButton) {
    const item = state.files.find((entry) => entry.id === fileButton.dataset.file);
    if (item && api?.files) void api.files.open(item.id).then((result) => afterLaunch(result, `已打开 ${item.name}`));
    else if (item) showToast(`网页预览：${item.name}`);
  }
  const setting = event.target.closest('[data-setting]');
  if (setting) void saveSetting(setting.dataset.setting, setting.getAttribute('aria-checked') !== 'true');
  const searchResult = event.target.closest('[data-search-index]');
  if (searchResult) void openSearchResult(Number(searchResult.dataset.searchIndex));
  if (!event.target.closest('.dock-search') && !event.target.closest('.dock-search-results')) dockSearchResults.hidden = true;
});

dockSearch.addEventListener('input', () => {
  clearTimeout(searchTimer);
  state.searchIndex = 0;
  searchTimer = setTimeout(() => void search(dockSearch.value), 120);
});

dockSearch.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    dockSearch.value = '';
    dockSearchResults.hidden = true;
    return;
  }
  if (!state.searchResults.length) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    state.searchIndex = (state.searchIndex + direction + state.searchResults.length) % state.searchResults.length;
    renderSearchResults(state.searchResults);
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    void openSearchResult(state.searchIndex);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !dialogLayer.hidden) closeDialog();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    dockSearch.focus();
  }
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.settings.theme === 'system') applyTheme('system');
});

updateClock();
setInterval(updateClock, 30_000);
render();
void loadData();

api?.onShowSearch?.(() => {
  dockSearch.focus();
  dockSearch.select();
});
api?.index?.onUpdated?.(() => void loadData());
api?.files?.onUpdated?.(() => void loadData());
api?.settings?.onChanged?.((settings) => {
  state.settings = { ...state.settings, ...settings };
  applyTheme(state.settings.theme);
  render();
});
