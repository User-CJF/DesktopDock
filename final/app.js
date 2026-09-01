const ICONS = {
  home: '&#xE80F;',
  categories: '&#xE8B7;',
  files: '&#xE8A5;',
  organize: '&#xE7C5;',
  settings: '&#xE713;',
  search: '&#xE721;',
  add: '&#xE710;',
  edit: '&#xE70F;',
  more: '&#xE712;',
  chevron: '&#xE76C;',
  pin: '&#xE718;',
  open: '&#xE8A7;',
  folder: '&#xE8B7;',
  undo: '&#xE7A7;',
  check: '&#xE73E;',
  refresh: '&#xE72C;',
  info: '&#xE946;',
  warning: '&#xE7BA;',
  delete: '&#xE74D;',
  appearance: '&#xE771;',
  behavior: '&#xE7FC;',
  keyboard: '&#xE765;',
  data: '&#xE964;',
};

const desktopApi = window.desktopDock;

const navItems = [
  { id: 'home', label: '常用', icon: ICONS.home },
  { id: 'categories', label: '分类', icon: ICONS.categories },
  { id: 'files', label: '文件', icon: ICONS.files },
  { id: 'organize', label: '桌面整理', icon: ICONS.organize },
  { id: 'settings', label: '设置', icon: ICONS.settings },
];

const demoApps = [
  { id: 'wechat', name: '微信', mark: '微', color: '#209b70', category: '社交', usage: '刚刚', pinned: true },
  { id: 'chrome', name: 'Chrome', mark: 'C', color: '#d95049', category: '工具', usage: '8 分钟前', pinned: true },
  { id: 'vscode', name: 'VS Code', mark: 'VS', color: '#257bb8', category: '开发', usage: '24 分钟前', pinned: true },
  { id: 'figma', name: 'Figma', mark: 'F', color: '#9652e8', category: '设计', usage: '1 小时前', pinned: true },
  { id: 'word', name: 'Word', mark: 'W', color: '#2b579a', category: '办公', usage: '今天', pinned: false },
  { id: 'music', name: '网易云音乐', mark: '音', color: '#cf3830', category: '娱乐', usage: '今天', pinned: false },
  { id: 'powershell', name: 'PowerShell', mark: '>_', color: '#4e6da9', category: '开发', usage: '昨天', pinned: false },
  { id: 'notion', name: 'Notion', mark: 'N', color: '#252525', category: '办公', usage: '昨天', pinned: false },
  { id: 'excel', name: 'Excel', mark: 'X', color: '#217346', category: '办公', usage: '本周', pinned: false },
  { id: 'photoshop', name: 'Photoshop', mark: 'Ps', color: '#2d5fa8', category: '设计', usage: '本周', pinned: false },
  { id: 'docker', name: 'Docker Desktop', mark: 'D', color: '#2386c0', category: '开发', usage: '本周', pinned: false },
  { id: 'steam', name: 'Steam', mark: 'S', color: '#315681', category: '娱乐', usage: '上周', pinned: false },
];

let apps = desktopApi?.isElectron ? [] : demoApps;
const iconMemory = new Map();
let iconLoadGeneration = 0;
const shortcutIconMemory = new Map();
let shortcutIconLoadGeneration = 0;

const demoCategories = [
  { id: 'office', name: '办公', icon: '📄', color: '#4f6bff', count: 12 },
  { id: 'design', name: '设计', icon: '🎨', color: '#d95361', count: 8 },
  { id: 'dev', name: '开发', icon: '💻', color: '#7953c6', count: 15 },
  { id: 'fun', name: '娱乐', icon: '🎮', color: '#168a74', count: 6 },
  { id: 'social', name: '社交', icon: '💬', color: '#087f9b', count: 7 },
  { id: 'tools', name: '工具', icon: '🔧', color: '#a56300', count: 9 },
  { id: 'other', name: '其他', icon: '📁', color: '#697386', count: 4 },
];

let categories = desktopApi?.isElectron ? [] : demoCategories;

const demoFiles = [
  { id: 'f1', name: 'DesktopDock 交互梳理.docx', mark: 'W', color: '#2b579a', type: 'Word 文档', time: '14:32', group: '今天', size: '1.8 MB' },
  { id: 'f2', name: '产品评审会议.pptx', mark: 'P', color: '#bc4c22', type: '演示文稿', time: '10:18', group: '今天', size: '6.4 MB' },
  { id: 'f3', name: '启动器界面.fig', mark: 'F', color: '#9652e8', type: 'Figma 文件', time: '昨天', group: '昨天', size: '12.1 MB' },
  { id: 'f4', name: '搜索索引说明.md', mark: 'MD', color: '#4e6da9', type: 'Markdown', time: '昨天', group: '昨天', size: '48 KB' },
  { id: 'f5', name: '界面图标导出.zip', mark: 'ZIP', color: '#8a672f', type: '压缩文件', time: '周一', group: '本周', size: '23.6 MB' },
  { id: 'f6', name: '开发排期.xlsx', mark: 'X', color: '#217346', type: 'Excel 工作簿', time: '周一', group: '本周', size: '824 KB' },
];

const demoFolders = [
  { id: 'desktop', name: '桌面', path: 'C:\\Users\\CJF\\Desktop', icon: '&#xE8FC;' },
  { id: 'downloads', name: '下载', path: 'C:\\Users\\CJF\\Downloads', icon: '&#xE896;' },
  { id: 'documents', name: '文档', path: 'C:\\Users\\CJF\\Documents', icon: '&#xF000;' },
  { id: 'pictures', name: '图片', path: 'C:\\Users\\CJF\\Pictures', icon: '&#xEB9F;' },
];

let files = desktopApi?.isElectron ? [] : demoFiles;
let folders = desktopApi?.isElectron ? [] : demoFolders;

const settingResults = [
  { id: 's1', name: '外观设置', detail: '主题、主色与图标大小', section: 'appearance', mark: 'UI', color: '#4f6bff' },
  { id: 's2', name: '快捷键设置', detail: '搜索面板：Alt + Space', section: 'keyboard', mark: 'Key', color: '#4e6da9' },
  { id: 's3', name: '搜索设置', detail: '索引范围与结果数量', section: 'search', mark: 'Find', color: '#087f9b' },
  { id: 's4', name: '数据设置', detail: '重建索引、导入与导出', section: 'data', mark: 'DB', color: '#697386' },
];

const settingsSections = [
  { id: 'appearance', label: '外观', icon: ICONS.appearance },
  { id: 'behavior', label: '行为', icon: ICONS.behavior },
  { id: 'search', label: '搜索', icon: ICONS.search },
  { id: 'keyboard', label: '快捷键', icon: ICONS.keyboard },
  { id: 'data', label: '数据', icon: ICONS.data },
  { id: 'about', label: '关于', icon: ICONS.info },
];

const state = {
  view: ['home', 'categories', 'files', 'organize', 'settings'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home',
  theme: localStorage.getItem('desktopdock-theme') || 'system',
  settingsSection: 'appearance',
  searchType: 'apps',
  searchIndex: 0,
  lastFocus: null,
  editMode: false,
  activeCategoryId: null,
  categorySaving: false,
  fileSearchResults: null,
  files: { loading: Boolean(desktopApi?.isElectron), scanning: false, error: null, total: files.length, lastScanAt: null },
  organizer: {
    loading: Boolean(desktopApi?.isElectron), processingShortcuts: false, error: null,
    shortcuts: 0, desktopShortcuts: 0, publicShortcuts: 0, stowedShortcuts: 0,
    shortcutItems: [], files: 0, folders: 0, total: 0, conflicts: 0, groups: {}, restorePoints: [],
  },
  settings: {
    accentColor: '#4f6bff', glassEffect: true, iconSize: 'medium', gridDensity: 'normal',
    autoStart: false, startMinimized: false, autoHideSearch: true, closeAfterLaunch: true,
    animations: true, hotkeySearch: 'Alt+Space', hotkeyMain: 'Alt+D', searchResultCount: 10,
  },
  about: { version: '0.1.0', updateSourceConfigured: false },
  recordingHotkeyKey: null,
  index: {
    loading: Boolean(desktopApi?.isElectron),
    scanning: false,
    error: null,
    totalApps: apps.length,
    lastScanAt: null,
  },
  shortcuts: {
    search: { requested: 'Alt+Space', active: 'Alt+Space' },
    toggleWindow: { requested: 'Alt+D', active: 'Alt+D' },
  },
};

const primaryNav = document.querySelector('#primaryNav');
const commandbar = document.querySelector('#commandbar');
const pageContent = document.querySelector('#pageContent');
const searchOverlay = document.querySelector('#searchOverlay');
const searchInput = document.querySelector('#globalSearch');
const searchTabs = document.querySelector('#searchTabs');
const searchResults = document.querySelector('#searchResults');
const modalOverlay = document.querySelector('#modalOverlay');
const dialog = document.querySelector('#dialog');
const contextMenu = document.querySelector('#contextMenu');
const toast = document.querySelector('#toast');
const applicationRoot = document.querySelector('#desktopApp') || document.querySelector('#app');
const indexState = document.querySelector('#indexState');
const indexStateText = document.querySelector('#indexStateText');
const sidebarItemCount = document.querySelector('#sidebarItemCount');
const sidebarScanTime = document.querySelector('#sidebarScanTime');

if (desktopApi?.isElectron) document.body.classList.add('is-electron');

function icon(glyph, className = '') {
  return `<span class="fluent-icon ${className}" aria-hidden="true">${glyph}</span>`;
}

function appIcon(item, size = '') {
  const image = typeof item.iconData === 'string' && item.iconData.startsWith('data:image/png;base64,')
    ? `<img src="${item.iconData}" alt="" />`
    : escapeHtml(String(item.mark));
  return `<span class="app-icon ${size} ${item.iconData ? 'has-image' : ''}" data-icon-app="${escapeHtml(String(item.id))}" style="--app-color:${item.color}" aria-hidden="true">${image}</span>`;
}

function appMark(name) {
  const clean = name.trim();
  if (!clean) return '?';
  if (/^[\u3400-\u9fff]/u.test(clean)) return clean.slice(0, 1);
  const words = clean.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.slice(0, 2).map((word) => word[0]).join('') : clean.slice(0, 2)).toUpperCase();
}

function nativeAppModel(app) {
  const colors = { 办公: '#2b579a', 设计: '#7953c6', 开发: '#257bb8', 娱乐: '#315681', 社交: '#168a74', 工具: '#a56300', 其他: '#697386' };
  return {
    ...app,
    mark: appMark(app.name),
    color: colors[app.category] || colors.其他,
    pinned: Boolean(app.pinned),
    iconData: iconMemory.get(app.id) || null,
    usage: app.launchCount ? `已启动 ${app.launchCount} 次` : '尚未通过桌面舱启动',
  };
}

function fileGroup(value) {
  const date = new Date(value);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startYesterday = new Date(startToday.getTime() - 86400000);
  const startWeek = new Date(startToday.getTime() - 6 * 86400000);
  if (date >= startToday) return '今天';
  if (date >= startYesterday) return '昨天';
  if (date >= startWeek) return '本周';
  return '更早';
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / 104857.6) / 10} MB`;
  return `${Math.round(bytes / 107374182.4) / 10} GB`;
}

function nativeFileModel(file) {
  const extension = file.extension || '';
  const types = { '.doc': 'Word 文档', '.docx': 'Word 文档', '.xls': 'Excel 工作簿', '.xlsx': 'Excel 工作簿', '.ppt': '演示文稿', '.pptx': '演示文稿', '.pdf': 'PDF 文档', '.md': 'Markdown', '.txt': '文本文件', '.zip': '压缩文件', '.rar': '压缩文件', '.7z': '压缩文件', '.png': '图片', '.jpg': '图片', '.jpeg': '图片' };
  const colors = { '.doc': '#2b579a', '.docx': '#2b579a', '.xls': '#217346', '.xlsx': '#217346', '.ppt': '#bc4c22', '.pptx': '#bc4c22', '.pdf': '#b43b45', '.md': '#4e6da9', '.zip': '#8a672f', '.rar': '#8a672f', '.7z': '#8a672f' };
  const activityAt = file.lastOpenedAt || file.modifiedAt;
  return {
    ...file,
    mark: extension ? extension.slice(1, 4).toUpperCase() : 'FILE',
    color: colors[extension] || '#697386',
    type: types[extension] || (extension ? `${extension.slice(1).toUpperCase()} 文件` : '文件'),
    size: formatFileSize(file.size),
    time: fileGroup(activityAt) === '今天' ? new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(activityAt)) : new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(activityAt)),
    group: fileGroup(activityAt),
    detail: `${types[extension] || '文件'} · ${formatFileSize(file.size)} · ${file.rootName || ''}`,
  };
}

function applyIconData(app) {
  if (!app.iconData) return;
  document.querySelectorAll(`[data-icon-app="${app.id}"]`).forEach((container) => {
    const image = document.createElement('img');
    image.src = app.iconData;
    image.alt = '';
    container.replaceChildren(image);
    container.classList.add('has-image');
  });
}

async function hydrateAppIcons(items) {
  if (!desktopApi?.apps?.icon) return;
  const generation = ++iconLoadGeneration;
  const pending = items.filter((item) => !iconMemory.has(item.id));
  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length && generation === iconLoadGeneration) {
      const item = pending[cursor];
      cursor += 1;
      const data = await desktopApi.apps.icon(item.id).catch(() => null);
      if (generation !== iconLoadGeneration) return;
      const safeData = typeof data === 'string' && data.startsWith('data:image/png;base64,') ? data : null;
      iconMemory.set(item.id, safeData);
      item.iconData = safeData;
      applyIconData(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, pending.length) }, worker));
}

function shortcutIcon(item) {
  const image = typeof item.iconData === 'string' && item.iconData.startsWith('data:image/png;base64,')
    ? `<img src="${item.iconData}" alt="" />`
    : icon(ICONS.open);
  return `<span class="shortcut-icon ${item.iconData ? 'has-image' : ''}" data-icon-shortcut="${escapeHtml(item.id)}" aria-hidden="true">${image}</span>`;
}

async function hydrateShortcutIcons(items) {
  if (!desktopApi?.desktop?.shortcutIcon) return;
  const generation = ++shortcutIconLoadGeneration;
  const pending = items.filter((item) => !shortcutIconMemory.has(item.id));
  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length && generation === shortcutIconLoadGeneration) {
      const item = pending[cursor];
      cursor += 1;
      const data = await desktopApi.desktop.shortcutIcon(item.id).catch(() => null);
      if (generation !== shortcutIconLoadGeneration) return;
      const safeData = typeof data === 'string' && data.startsWith('data:image/png;base64,') ? data : null;
      shortcutIconMemory.set(item.id, safeData);
      item.iconData = safeData;
      if (!safeData) continue;
      document.querySelectorAll(`[data-icon-shortcut="${item.id}"]`).forEach((container) => {
        const image = document.createElement('img');
        image.src = safeData;
        image.alt = '';
        container.replaceChildren(image);
        container.classList.add('has-image');
      });
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, pending.length) }, worker));
}

function scanTimeLabel(value) {
  if (!value) return '尚未扫描';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return '刚刚更新';
  if (minutes < 60) return `${minutes} 分钟前更新`;
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function updateIndexChrome() {
  if (!indexState || !indexStateText || !sidebarItemCount || !sidebarScanTime) return;
  indexState.classList.toggle('loading', state.index.loading || state.index.scanning);
  indexState.classList.toggle('error', Boolean(state.index.error));
  indexStateText.textContent = state.index.error ? '索引需要处理' : state.index.scanning ? '正在扫描' : state.index.loading ? '正在读取索引' : '索引已就绪';
  sidebarItemCount.textContent = `${state.index.totalApps} 个应用`;
  sidebarScanTime.textContent = state.index.error || scanTimeLabel(state.index.lastScanAt);
}

function setTheme(theme, persistToSystem = true) {
  state.theme = theme;
  const resolved = theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : theme === 'system' ? 'light' : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.setProperty('--accent', state.settings.accentColor);
  const red = Number.parseInt(state.settings.accentColor.slice(1, 3), 16);
  const green = Number.parseInt(state.settings.accentColor.slice(3, 5), 16);
  const blue = Number.parseInt(state.settings.accentColor.slice(5, 7), 16);
  document.documentElement.style.setProperty('--accent-soft', `rgba(${red}, ${green}, ${blue}, ${resolved === 'dark' ? 0.18 : 0.11})`);
  document.documentElement.dataset.iconSize = state.settings.iconSize;
  document.documentElement.dataset.gridDensity = state.settings.gridDensity;
  document.documentElement.classList.toggle('reduce-motion', !state.settings.animations);
  document.documentElement.classList.toggle('no-glass', !state.settings.glassEffect);
  localStorage.setItem('desktopdock-theme', theme);
  if (persistToSystem && desktopApi?.settings) {
    void desktopApi.settings.set('theme', theme).catch(() => showToast('主题同步失败，已保留当前界面设置'));
  } else if (persistToSystem && desktopApi?.theme) {
    void desktopApi.theme.set(theme).catch(() => showToast('主题同步失败，已保留当前界面设置'));
  }
}

function setView(view, focusPage = true) {
  state.view = view;
  if (location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
  render();
  if (focusPage) requestAnimationFrame(() => pageContent.focus());
}

function renderNav() {
  primaryNav.innerHTML = navItems.map((item) => `
    <button type="button" class="nav-item ${state.view === item.id ? 'active' : ''}" data-nav="${item.id}" aria-current="${state.view === item.id ? 'page' : 'false'}" title="${item.label}">
      ${icon(item.icon)}<span>${item.label}</span>
    </button>
  `).join('');
}

function searchButton() {
  return `<button class="command-search" type="button" data-action="open-search">
    ${icon(ICONS.search)}<span>搜索软件、文件、设置</span><kbd>Alt + Space</kbd>
  </button>`;
}

function renderCommandbar() {
  const commands = {
    home: `<div class="page-heading"><h1>常用</h1><p>固定与最近启动的应用</p></div>${searchButton()}<button class="secondary-button" type="button" data-action="toggle-edit">${icon(ICONS.edit)}${state.editMode ? '完成' : '管理'}</button>`,
    categories: `<div class="page-heading"><h1>分类</h1><p>${categories.length} 个分类，${apps.length} 个应用</p></div>${searchButton()}<button class="primary-button" type="button" data-action="new-category">${icon(ICONS.add)}新建分类</button>`,
    files: `<div class="page-heading"><h1>文件</h1><p>最近文件与常用位置</p></div>${searchButton()}<button class="secondary-button" type="button" data-action="add-folder">${icon(ICONS.add)}添加文件夹</button>`,
    organize: `<div class="page-heading"><h1>桌面整理</h1><p>${state.organizer.loading ? '正在扫描桌面' : `${state.organizer.shortcuts} 个快捷方式，${state.organizer.files} 个文件`}</p></div><span class="last-restore">${state.organizer.restorePoints[0] ? `上次整理：${scanTimeLabel(state.organizer.restorePoints[0].createdAt)}` : '尚无文件还原点'}</span><button class="secondary-button" type="button" data-action="restore-last" ${state.organizer.restorePoints.length ? '' : 'disabled'}>${icon(ICONS.undo)}还原文件整理</button>`,
    settings: `<div class="page-heading"><h1>设置</h1><p>当前配置保存在本机</p></div><button class="icon-button command-icon" type="button" data-action="open-search" title="搜索设置" aria-label="搜索设置">${icon(ICONS.search)}</button>`,
  };
  commandbar.innerHTML = commands[state.view];
}

function appTile(app) {
  return `<button class="app-tile ${state.editMode ? 'editing' : ''}" type="button" data-app="${escapeHtml(app.id)}" title="打开 ${escapeHtml(app.name)}">
    <span class="app-icon-wrap">${appIcon(app)}${app.pinned ? `<span class="pin-badge">${icon(ICONS.pin)}</span>` : ''}${state.editMode ? '<span class="remove-badge">&#x2212;</span>' : ''}</span>
    <span class="app-name">${escapeHtml(app.name)}</span>
    <span class="app-meta">${escapeHtml(app.category)}</span>
  </button>`;
}

function categoryItem(category, detailed = false) {
  const categoryApps = apps.filter((app) => app.category === category.name).slice(0, 4);
  const categoryCount = category.count ?? apps.filter((app) => app.category === category.name).length;
  return `<button class="category-item ${detailed ? 'detailed' : ''}" type="button" style="--category:${category.color}" data-category="${escapeHtml(category.id)}">
    <span class="category-symbol" aria-hidden="true">${escapeHtml(category.icon)}</span>
    <span class="category-copy"><b>${escapeHtml(category.name)}</b><small>${categoryCount} 个应用</small></span>
    ${detailed ? `<span class="category-apps">${categoryApps.map((app) => appIcon(app, 'tiny')).join('')}</span>` : ''}
    ${icon(ICONS.chevron, 'chevron')}
  </button>`;
}

function fileRow(file) {
  return `<button class="file-row" type="button" data-file="${escapeHtml(file.id)}" title="打开 ${escapeHtml(file.name)}">
    ${appIcon(file, 'small')}
    <span class="file-name"><b>${escapeHtml(file.name)}</b><small>${escapeHtml(file.type)}</small></span>
    <span class="file-size">${escapeHtml(file.size)}</span>
    <time>${escapeHtml(file.time)}</time>
    <span class="row-more" aria-hidden="true">${icon(ICONS.more)}</span>
  </button>`;
}

function homePage() {
  let appContent;
  if (state.index.loading) {
    appContent = `<div class="app-empty" aria-busy="true">${icon(ICONS.refresh)}<b>正在读取本机应用</b><span>正在加载开始菜单与桌面索引。</span></div>`;
  } else if (state.index.error) {
    appContent = `<div class="app-empty error-state">${icon(ICONS.warning)}<b>应用索引暂时不可用</b><span>${escapeHtml(state.index.error)}</span><button class="secondary-button" type="button" data-action="rebuild-index">重新扫描</button></div>`;
  } else if (!apps.length) {
    appContent = `<div class="app-empty">${icon(ICONS.search)}<b>尚未发现可启动的应用</b><span>可扫描开始菜单和桌面中的快捷方式。</span><button class="primary-button" type="button" data-action="rebuild-index">扫描软件</button></div>`;
  } else {
    appContent = `<div class="app-grid">${apps.slice(0, 8).map(appTile).join('')}</div>`;
  }
  return `<div class="home-page">
    <section class="content-section frequent-section">
      <div class="section-heading"><h2>常用应用</h2><span>${Math.min(apps.length, 8)} 个</span></div>
      ${appContent}
    </section>
    <div class="home-lower">
      <section class="content-section categories-preview">
        <div class="section-heading"><h2>分类</h2><button type="button" data-nav="categories">查看全部</button></div>
        <div class="category-grid compact">${categories.slice(0, 6).map((category) => categoryItem(category)).join('')}</div>
      </section>
      <aside class="continuation-panel">
        <section>
          <div class="section-heading"><h2>继续处理</h2><button type="button" data-nav="files">全部文件</button></div>
          <div class="compact-files">${files.slice(0, 3).map(fileRow).join('')}</div>
        </section>
        <section class="desktop-summary">
          <div class="desktop-summary-heading">${icon(ICONS.organize)}<div><b>${state.organizer.loading ? '正在检查桌面' : `桌面有 ${state.organizer.desktopShortcuts} 个快捷方式可收纳`}</b><small>${state.organizer.files} 个普通文件可分类整理；系统图标和文件夹保持原位</small></div></div>
          <button class="primary-button" type="button" data-nav="organize" ${state.organizer.loading ? 'disabled' : ''}>打开桌面模块</button>
        </section>
      </aside>
    </div>
  </div>`;
}

function categoriesPage() {
  const unclassified = apps.filter((app) => app.category === '其他').length;
  return `<div class="categories-page">
    <div class="category-grid full">${categories.map((category) => categoryItem(category, true)).join('')}</div>
    <section class="category-rules">
      <div><h2>自动归类</h2><p>索引已识别 ${apps.length} 个应用，其中 ${unclassified} 个暂归入“其他”。</p></div>
      <button class="secondary-button" type="button" data-category="other">查看“其他”</button>
    </section>
  </div>`;
}

function filesPage() {
  const groups = ['今天', '昨天', '本周', '更早'];
  return `<div class="files-page">
    <section class="quick-folders content-section">
      <div class="section-heading"><h2>常用位置</h2><span>${folders.length} 个位置</span></div>
      <div class="folder-grid">${folders.map((folder) => `<button class="folder-item" type="button" data-folder="${escapeHtml(folder.id)}" title="${escapeHtml(folder.path)}">${icon(folder.icon || ICONS.folder)}<span><b>${escapeHtml(folder.name)}</b><small>${escapeHtml(folder.path)}</small></span>${icon(ICONS.chevron, 'chevron')}</button>`).join('')}</div>
    </section>
    <section class="recent-section content-section">
      <div class="section-heading"><h2>最近文件</h2><span>${state.files.total} 个文件已索引</span><button type="button" data-action="rescan-files">${state.files.scanning ? '扫描中…' : '重新扫描'}</button><button type="button" data-action="clear-recent">清除打开记录</button></div>
      ${state.files.loading ? `<div class="app-empty" aria-busy="true">${icon(ICONS.refresh)}<b>正在读取文件索引</b><span>只读取文件名、大小和修改时间。</span></div>` : state.files.error ? `<div class="app-empty error-state">${icon(ICONS.warning)}<b>文件索引暂时不可用</b><span>${escapeHtml(state.files.error)}</span><button class="secondary-button" type="button" data-action="rescan-files">重试</button></div>` : files.length ? groups.map((group) => files.some((file) => file.group === group) ? `<div class="file-group"><h3>${group}</h3><div class="file-list">${files.filter((file) => file.group === group).map(fileRow).join('')}</div></div>` : '').join('') : `<div class="app-empty">${icon(ICONS.files)}<b>尚未发现最近文件</b><span>添加文件夹或重新扫描后，近期文件会显示在这里。</span></div>`}
    </section>
  </div>`;
}

function organizePage() {
  const groups = [
    ['文档', state.organizer.groups.documents || 0, '移动到 文档\\桌面整理', ICONS.files],
    ['图片', state.organizer.groups.images || 0, '移动到 图片\\桌面整理', '&#xEB9F;'],
    ['视频', state.organizer.groups.videos || 0, '移动到 视频\\桌面整理', '&#xE714;'],
    ['压缩文件', state.organizer.groups.archives || 0, '移动到 下载\\桌面整理', '&#xF012;'],
    ['其他文件', state.organizer.groups.other || 0, '移动到 文档\\桌面整理\\其他', ICONS.folder],
  ];
  const shortcutLocation = { desktop: '当前桌面', stowed: '已收纳', public: '公共桌面' };
  const shortcutItems = state.organizer.shortcutItems || [];
  const shortcutContent = state.organizer.loading
    ? `<div class="shortcut-empty" aria-busy="true">${icon(ICONS.refresh)}<b>正在获取桌面快捷方式</b><span>同时解析 Windows 快捷方式的真实图标。</span></div>`
    : shortcutItems.length
      ? `<div class="shortcut-grid">${shortcutItems.map((item) => `<button class="shortcut-item" type="button" data-shortcut="${escapeHtml(item.id)}" title="打开 ${escapeHtml(item.name)}"><span class="shortcut-visual">${shortcutIcon(item)}${item.location === 'public' ? `<span class="shortcut-lock" title="公共桌面，只读">${icon(ICONS.info)}</span>` : ''}</span><b>${escapeHtml(item.name)}</b><small>${shortcutLocation[item.location] || '桌面'}</small></button>`).join('')}</div>`
      : `<div class="shortcut-empty">${icon(ICONS.check)}<b>没有发现桌面快捷方式</b><span>“此电脑”“回收站”等 Windows 系统图标不属于快捷方式文件，因此不会被处理。</span></div>`;
  return `<div class="organize-page">
    <section class="organize-overview">
      <div class="scan-summary"><span class="scan-icon">${icon(state.organizer.error ? ICONS.warning : state.organizer.loading ? ICONS.refresh : ICONS.check)}</span><div><h2>${state.organizer.error ? '桌面扫描未完成' : state.organizer.loading ? '正在扫描桌面' : '桌面扫描完成'}</h2><p>${state.organizer.error ? escapeHtml(state.organizer.error) : state.organizer.loading ? '仅检查桌面根目录，不读取文件内容。' : `发现 ${state.organizer.total} 个可处理项目，${state.organizer.conflicts} 个同名目标将自动安全改名。`}</p></div></div>
      <button class="secondary-button" type="button" data-action="rescan" ${state.organizer.loading ? 'disabled' : ''}>${icon(ICONS.refresh)}重新扫描</button>
    </section>
    <section class="shortcut-section content-section">
      <div class="section-heading shortcut-heading"><div><h2>桌面快捷方式</h2><span>点击可直接启动；当前桌面 ${state.organizer.desktopShortcuts} 个，已收纳 ${state.organizer.stowedShortcuts} 个，公共桌面 ${state.organizer.publicShortcuts} 个</span></div><div class="shortcut-actions"><button class="secondary-button" type="button" data-action="restore-shortcuts" ${state.organizer.processingShortcuts || !state.organizer.stowedShortcuts ? 'disabled' : ''}>${icon(ICONS.undo)}恢复到桌面</button><button class="primary-button" type="button" data-action="stow-shortcuts" ${state.organizer.processingShortcuts || !state.organizer.desktopShortcuts ? 'disabled' : ''}>${icon(ICONS.organize)}收纳当前桌面</button></div></div>
      ${shortcutContent}
      <p class="shortcut-note">${icon(ICONS.info)} 只移动当前用户桌面的快捷方式文件；系统图标、文件夹、普通文件与公共桌面快捷方式均保持原位。</p>
    </section>
    <section class="organize-list content-section">
      <div class="section-heading"><h2>普通文件整理</h2><span>共 ${state.organizer.files} 项</span></div>
      <div class="organize-rows">${groups.map(([name, count, detail, glyph]) => `<div class="organize-row">${icon(glyph)}<span><b>${name}</b><small>${detail}</small></span><strong>${count}</strong></div>`).join('')}</div>
    </section>
    <section class="organize-options"><label><input type="checkbox" checked disabled /> <span><b>创建还原点</b><small>每次整理强制保留原始位置，最多保存 5 次</small></span></label></section>
    <footer class="organize-footer"><span>${icon(ICONS.info)} 普通文件整理与快捷方式收纳相互独立，均可恢复</span><button class="primary-button large" type="button" data-action="organize-now" ${state.organizer.loading || !state.organizer.files ? 'disabled' : ''}>整理 ${state.organizer.files} 个文件</button></footer>
  </div>`;
}

function toggleSetting(key, title, detail) {
  const checked = Boolean(state.settings[key]);
  return `<div class="setting-row"><span><b>${title}</b><small>${detail}</small></span><button class="toggle ${checked ? 'on' : ''}" type="button" role="switch" aria-checked="${checked}" data-action="toggle-setting" data-setting-key="${key}" aria-label="${title}"><i></i></button></div>`;
}

function shortcutMarkup(shortcut) {
  if (!shortcut?.active) return '<span class="shortcut-unavailable">未注册</span>';
  return shortcut.active.replace('CommandOrControl', 'Ctrl').split('+')
    .map((key) => `<kbd>${key}</kbd>`).join('<span>+</span>');
}

function shortcutDetail(base, shortcut) {
  if (!shortcut?.active) return `${base}；系统快捷键冲突，可在窗口内使用 Ctrl + K`;
  if (shortcut.active !== shortcut.requested) return `${base}；原组合键被占用，已自动启用备用键`;
  return base;
}

function settingsPanel() {
  const panels = {
    appearance: `<div class="settings-header"><h2>外观</h2><p>主题、颜色与显示密度会立即应用并保存。</p></div><section class="settings-group"><h3>主题</h3><div class="theme-options" role="radiogroup" aria-label="主题模式">${[['light','浅色'],['dark','深色'],['system','跟随系统']].map(([id,label]) => `<button type="button" role="radio" aria-checked="${state.theme === id}" class="${state.theme === id ? 'active' : ''}" data-theme="${id}">${label}</button>`).join('')}</div></section><section class="settings-group"><h3>界面</h3><div class="setting-row"><span><b>主色调</b><small>用于选中、按钮与键盘焦点</small></span><input type="color" value="${state.settings.accentColor}" data-setting-color="accentColor" aria-label="主色调" /></div>${toggleSetting('glassEffect', 'Mica 背景材质', 'Windows 11 使用系统材质，其他系统自动降级')}${toggleSetting('animations', '界面动画', '关闭后保留状态变化，不再移动界面元素')}<div class="setting-row"><span><b>图标大小</b><small>应用网格的图标尺寸</small></span><select aria-label="图标大小" data-setting-select="iconSize"><option value="small" ${state.settings.iconSize === 'small' ? 'selected' : ''}>小（32px）</option><option value="medium" ${state.settings.iconSize === 'medium' ? 'selected' : ''}>中（48px）</option><option value="large" ${state.settings.iconSize === 'large' ? 'selected' : ''}>大（64px）</option></select></div><div class="setting-row"><span><b>网格密度</b><small>调整应用之间的留白</small></span><select aria-label="网格密度" data-setting-select="gridDensity"><option value="compact" ${state.settings.gridDensity === 'compact' ? 'selected' : ''}>紧凑</option><option value="normal" ${state.settings.gridDensity === 'normal' ? 'selected' : ''}>标准</option><option value="comfortable" ${state.settings.gridDensity === 'comfortable' ? 'selected' : ''}>宽松</option></select></div></section>`,
    behavior: `<div class="settings-header"><h2>行为</h2><p>控制应用启动与窗口显示方式。</p></div><section class="settings-group"><h3>启动</h3>${toggleSetting('autoStart', '开机时启动桌面舱', '登录 Windows 后保持搜索随时可用')}${toggleSetting('startMinimized', '启动时保持后台', '启动后不主动显示主窗口')}${toggleSetting('autoHideSearch', '搜索面板失焦自动隐藏', '切换到其他窗口时收起搜索')}${toggleSetting('closeAfterLaunch', '打开应用后关闭搜索面板', '启动结果后回到当前工作')}</section>`,
    search: `<div class="settings-header"><h2>搜索</h2><p>应用 ${state.index.totalApps} 项，文件 ${state.files.total} 项；文件只索引元数据。</p></div><section class="settings-group"><h3>索引位置</h3>${folders.map((folder) => `<div class="setting-row"><span><b>${escapeHtml(folder.name)}</b><small>${escapeHtml(folder.path)}</small></span><button class="secondary-button" type="button" data-folder="${escapeHtml(folder.id)}">打开</button></div>`).join('')}<div class="setting-row"><span><b>添加自定义位置</b><small>选择后自动加入收藏和文件搜索范围</small></span><button class="secondary-button" type="button" data-action="add-folder">选择文件夹</button></div></section><section class="settings-group"><div class="setting-row"><span><b>搜索结果数量</b><small>搜索面板最多显示 5–20 项</small></span><input type="number" min="5" max="20" value="${state.settings.searchResultCount}" data-setting-number="searchResultCount" aria-label="搜索结果数量" /></div></section>`,
    keyboard: `<div class="settings-header"><h2>快捷键</h2><p>点击快捷键框后按下新的组合键，保存后立即重新注册。</p></div><section class="settings-group"><h3>全局快捷键</h3><div class="setting-row"><span><b>打开搜索</b><small>${shortcutDetail('在任意应用中唤起搜索面板', state.shortcuts.search)}</small></span><button class="hotkey-field" type="button" data-action="record-hotkey" data-hotkey-key="hotkeySearch">${state.recordingHotkeyKey === 'hotkeySearch' ? '请按组合键…' : shortcutMarkup(state.shortcuts.search)}</button></div><div class="setting-row"><span><b>打开主窗口</b><small>${shortcutDetail('显示或隐藏桌面舱', state.shortcuts.toggleWindow)}</small></span><button class="hotkey-field" type="button" data-action="record-hotkey" data-hotkey-key="hotkeyMain">${state.recordingHotkeyKey === 'hotkeyMain' ? '请按组合键…' : shortcutMarkup(state.shortcuts.toggleWindow)}</button></div></section>`,
    data: `<div class="settings-header"><h2>数据</h2><p>所有索引和使用记录仅保存在这台电脑上。</p></div><section class="settings-group"><h3>本机索引</h3><div class="setting-row"><span><b>重建应用索引</b><small>扫描开始菜单与当前用户、公共桌面</small></span><button class="secondary-button" type="button" data-action="rebuild-index" ${state.index.scanning ? 'disabled' : ''}>${state.index.scanning ? '扫描中…' : '重新扫描'}</button></div><div class="setting-row"><span><b>重建文件索引</b><small>扫描 ${folders.length} 个位置的名称、大小与修改时间</small></span><button class="secondary-button" type="button" data-action="rescan-files" ${state.files.scanning ? 'disabled' : ''}>${state.files.scanning ? '扫描中…' : '重新扫描'}</button></div><div class="setting-row"><span><b>清除使用统计</b><small>不会移除应用、分类或文件</small></span><button class="danger-text" type="button" data-action="clear-stats">清除</button></div></section><section class="settings-group"><h3>配置</h3><div class="inline-actions"><button class="secondary-button" type="button" data-action="export-config">导出配置</button><button class="secondary-button" type="button" data-action="import-config">导入配置</button></div></section>`,
    about: `<div class="settings-header"><h2>关于</h2><p>桌面舱 DesktopDock</p></div><section class="about-block"><span class="about-mark">${icon(ICONS.home)}</span><div><h3>桌面舱</h3><p>版本 ${escapeHtml(state.about.version)} · Windows 10/11</p></div></section><section class="settings-group"><div class="setting-row"><span><b>更新状态</b><small>${state.about.updateSourceConfigured ? '可连接更新服务' : '当前构建未配置在线更新源'}</small></span><button class="secondary-button" type="button" data-action="check-updates">查看版本</button></div></section>`,
  };
  return panels[state.settingsSection];
}

function settingsPage() {
  return `<div class="settings-page"><nav class="settings-nav" aria-label="设置分类">${settingsSections.map((item) => `<button type="button" class="${state.settingsSection === item.id ? 'active' : ''}" data-settings-section="${item.id}">${icon(item.icon)}<span>${item.label}</span></button>`).join('')}</nav><div class="settings-panel">${settingsPanel()}</div></div>`;
}

function renderPage() {
  const pages = { home: homePage, categories: categoriesPage, files: filesPage, organize: organizePage, settings: settingsPage };
  pageContent.innerHTML = pages[state.view]();
}

function render() {
  setTheme(state.theme, false);
  updateIndexChrome();
  renderNav();
  renderCommandbar();
  renderPage();
}

function searchPool() {
  if (state.searchType === 'files') return state.fileSearchResults || files;
  if (state.searchType === 'settings') return settingResults;
  return apps.map((app) => ({ ...app, detail: `${app.category} · ${app.usage}` }));
}

function currentSearchResults() {
  const query = searchInput.value.trim().toLowerCase();
  const pool = searchPool();
  return query ? pool.filter((item) => `${item.name} ${item.detail || ''}`.toLowerCase().includes(query)) : pool.slice(0, state.settings.searchResultCount);
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, index))}<mark>${escapeHtml(text.slice(index, index + query.length))}</mark>${escapeHtml(text.slice(index + query.length))}`;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function renderSearch() {
  const types = [['apps', '应用'], ['files', '文件'], ['settings', '设置']];
  searchTabs.innerHTML = types.map(([id, label]) => `<button type="button" role="tab" data-search-type="${id}" aria-selected="${state.searchType === id}">${label}</button>`).join('');
  const results = currentSearchResults();
  state.searchIndex = Math.max(0, Math.min(state.searchIndex, results.length - 1));
  document.querySelector('.clear-query').hidden = !searchInput.value;
  if (state.searchType === 'apps' && state.index.loading) {
    searchResults.innerHTML = `<div class="empty-search" aria-busy="true">${icon(ICONS.refresh)}<b>正在读取应用索引</b><span>完成后即可输入名称搜索。</span></div>`;
    return;
  }
  if (state.searchType === 'apps' && state.index.error) {
    searchResults.innerHTML = `<div class="empty-search error-state">${icon(ICONS.warning)}<b>应用索引暂时不可用</b><span>${escapeHtml(state.index.error)}</span><button class="secondary-button" type="button" data-action="rebuild-index">重新扫描</button></div>`;
    return;
  }
  if (state.searchType === 'files' && state.files.loading) {
    searchResults.innerHTML = `<div class="empty-search" aria-busy="true">${icon(ICONS.refresh)}<b>正在读取文件索引</b><span>只读取文件名、大小和修改时间。</span></div>`;
    return;
  }
  if (state.searchType === 'files' && state.files.error) {
    searchResults.innerHTML = `<div class="empty-search error-state">${icon(ICONS.warning)}<b>文件索引暂时不可用</b><span>${escapeHtml(state.files.error)}</span><button class="secondary-button" type="button" data-action="rescan-files">重新扫描</button></div>`;
    return;
  }
  if (!results.length) {
    const query = searchInput.value.trim();
    searchResults.innerHTML = query
      ? `<div class="empty-search">${icon(ICONS.search)}<b>没有找到“${escapeHtml(query)}”</b><span>请检查名称或减少关键词。</span></div>`
      : `<div class="empty-search">${icon(ICONS.search)}<b>${state.searchType === 'files' ? '文件索引中暂无项目' : '应用索引中暂无项目'}</b><span>${state.searchType === 'files' ? '添加文件夹或重新扫描文件位置。' : '可重新扫描开始菜单和桌面快捷方式。'}</span><button class="secondary-button" type="button" data-action="${state.searchType === 'files' ? 'rescan-files' : 'rebuild-index'}">重新扫描</button></div>`;
    return;
  }
  const query = searchInput.value.trim();
  searchResults.innerHTML = results.map((item, index) => `<button type="button" class="search-result ${state.searchIndex === index ? 'selected' : ''}" role="option" aria-selected="${state.searchIndex === index}" data-search-result="${item.id}">
    ${appIcon(item, 'small')}<span><b>${highlight(item.name, query)}</b><small>${item.detail || `${item.category} · ${item.usage}`}</small></span><em>${state.searchIndex === index ? 'Enter' : ''}</em>
  </button>`).join('');
}

function openSearch() {
  closeContextMenu();
  state.lastFocus = document.activeElement;
  state.searchIndex = 0;
  applicationRoot.inert = true;
  searchOverlay.hidden = false;
  renderSearch();
  requestAnimationFrame(() => searchInput.focus());
}

function closeSearch() {
  searchOverlay.hidden = true;
  applicationRoot.inert = false;
  searchInput.value = '';
  state.fileSearchResults = null;
  state.lastFocus?.focus?.();
}

function openSelectedSearchResult() {
  const item = currentSearchResults()[state.searchIndex];
  if (!item) return;
  closeSearch();
  if (state.searchType === 'settings') {
    state.settingsSection = item.section;
    setView('settings');
    showToast(`已打开${item.name}`);
  } else if (state.searchType === 'apps') {
    void launchApplication(item);
  } else {
    void openFile(item);
  }
}

function openModal(content, size = '') {
  state.lastFocus = document.activeElement;
  applicationRoot.inert = true;
  dialog.className = `dialog ${size}`;
  dialog.innerHTML = content;
  modalOverlay.hidden = false;
  requestAnimationFrame(() => dialog.querySelector('button, input, select')?.focus());
}

function closeModal() {
  modalOverlay.hidden = true;
  applicationRoot.inert = false;
  dialog.innerHTML = '';
  state.lastFocus?.focus?.();
}

function categoryDialog(category) {
  if (!category) return;
  state.activeCategoryId = category.id;
  const categoryApps = apps.filter((app) => app.category === category.name);
  const count = desktopApi?.isElectron ? categoryApps.length : category.count;
  const content = categoryApps.length
    ? categoryApps.map(appTile).join('')
    : `<div class="dialog-empty">${icon(ICONS.folder)}<b>此分类还没有应用</b><span>可在应用右键菜单中选择“移动到分类”。</span></div>`;
  const editButton = category.isPreset ? '' : `<button class="secondary-button" type="button" data-action="edit-category">${icon(ICONS.edit)}编辑分类</button>`;
  openModal(`<header class="dialog-header"><div class="dialog-title"><span class="category-symbol" style="--category:${category.color}" aria-hidden="true">${escapeHtml(category.icon)}</span><div><h2 id="dialogTitle">${escapeHtml(category.name)}</h2><p>${count} 个应用</p></div></div><button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icon('&#xE711;')}</button></header><div class="dialog-search">${icon(ICONS.search)}<input aria-label="搜索当前分类" placeholder="搜索当前分类" /></div><div class="dialog-app-grid ${categoryApps.length ? '' : 'empty'}">${content}</div><footer class="dialog-footer">${editButton}<button class="primary-button" type="button" data-action="close-modal">完成</button></footer>`, 'category-dialog');
}

function organizeDialog() {
  openModal(`<header class="dialog-header"><div><h2 id="dialogTitle">整理普通文件</h2><p>将移动 ${state.organizer.files} 个普通文件；快捷方式、系统图标和文件夹保持原位。</p></div><button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icon('&#xE711;')}</button></header><div class="organize-dialog-body"><div class="preview-summary"><span><b>${state.organizer.files}</b><small>移动桌面文件</small></span><span><b>${state.organizer.conflicts}</b><small>安全改名</small></span><span><b>${state.organizer.folders}</b><small>保留文件夹</small></span></div><label class="check-row"><input type="checkbox" checked disabled />创建安全还原点（强制开启）</label><div class="progress-block" hidden><div><span>正在移动文件并写入还原点…</span><b>${state.organizer.files} 项</b></div><progress></progress></div></div><footer class="dialog-footer"><button class="secondary-button" type="button" data-action="close-modal">取消</button><button class="primary-button" type="button" data-action="start-organize">确认整理</button></footer>`, 'organize-dialog');
}

function stowShortcutsDialog() {
  openModal(`<header class="dialog-header"><div><h2 id="dialogTitle">收纳桌面快捷方式</h2><p>将 ${state.organizer.desktopShortcuts} 个当前用户快捷方式移入桌面舱的本地收纳区。</p></div><button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icon('&#xE711;')}</button></header><div class="confirm-body shortcut-confirm"><p><b>收纳后，这些快捷方式会从 Windows 桌面消失，但仍可在本页点击启动，并能随时恢复。</b></p><ul><li>“此电脑”“回收站”等系统图标不会变化</li><li>公共桌面快捷方式只显示，不会被移动</li><li>普通文件和文件夹不会被移动</li></ul></div><footer class="dialog-footer"><button class="secondary-button" type="button" data-action="close-modal">取消</button><button class="primary-button" type="button" data-action="confirm-stow-shortcuts">确认收纳 ${state.organizer.desktopShortcuts} 个</button></footer>`, 'confirm-dialog');
}

async function stowDesktopShortcuts(button) {
  if (!desktopApi?.desktop) {
    closeModal();
    showToast('网页预览不会移动桌面快捷方式');
    return;
  }
  button.disabled = true;
  button.textContent = '正在收纳…';
  state.organizer.processingShortcuts = true;
  const result = await desktopApi.desktop.stowShortcuts().catch((error) => ({ success: false, error: error?.message || '收纳请求未完成' }));
  closeModal();
  state.organizer.processingShortcuts = false;
  if (!result.success) {
    showToast(result.error || '快捷方式收纳失败，请检查桌面访问权限', null, 'error');
    await loadOrganizer();
    return;
  }
  await Promise.all([loadOrganizer(), loadNativeApps()]);
  showToast(`已收纳 ${result.stowed} 个快捷方式`, { label: '恢复', action: 'restore-shortcuts' });
}

async function restoreDesktopShortcuts() {
  if (!desktopApi?.desktop || state.organizer.processingShortcuts) return;
  state.organizer.processingShortcuts = true;
  render();
  const result = await desktopApi.desktop.restoreShortcuts().catch((error) => ({ success: false, error: error?.message || '恢复请求未完成' }));
  state.organizer.processingShortcuts = false;
  if (!result.success) {
    showToast(result.error || '快捷方式恢复失败，请检查桌面访问权限', null, 'error');
    await loadOrganizer();
    return;
  }
  await Promise.all([loadOrganizer(), loadNativeApps()]);
  const conflicts = result.conflicts?.length || 0;
  showToast(conflicts ? `已恢复 ${result.restored} 个，${conflicts} 个同名位置已安全跳过` : `已恢复 ${result.restored} 个快捷方式`, null, conflicts ? 'error' : 'success');
}

async function launchDesktopShortcut(item) {
  if (!desktopApi?.desktop) return showToast(`网页预览：${item.name}`);
  const result = await desktopApi.desktop.launchShortcut(item.id).catch(() => ({ success: false, error: '启动请求未完成' }));
  if (!result.success) showToast(result.error || '快捷方式无法启动，请重新扫描', null, 'error');
}

async function startOrganize(button) {
  const progressBlock = dialog.querySelector('.progress-block');
  progressBlock.hidden = false;
  button.disabled = true;
  button.textContent = '整理中…';
  if (!desktopApi?.desktop) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    closeModal();
    showToast('网页预览不会移动桌面文件');
    return;
  }
  try {
    const result = await desktopApi.desktop.organize();
    closeModal();
    await Promise.all([loadOrganizer(), loadNativeFiles()]);
    showToast(`已安全整理 ${result.organized} 个文件`, { label: '撤销', action: 'undo-organize' });
  } catch (error) {
    button.disabled = false;
    button.textContent = '重试';
    progressBlock.querySelector('span').textContent = `整理未完成：${error?.message || '请检查文件访问权限'}`;
  }
}

function categoryFormDialog(category = null) {
  state.activeCategoryId = category?.id || null;
  const symbols = ['📚', '🧰', '🎬', '🗂️', '🧪'];
  const selectedSymbol = category?.icon || symbols[0];
  const title = category ? '编辑分类' : '新建分类';
  openModal(`<header class="dialog-header"><div><h2 id="dialogTitle">${title}</h2><p>${category ? '名称和图标会同步到所有已归类应用。' : '分类将显示在主界面与应用菜单中。'}</p></div><button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icon('&#xE711;')}</button></header><div class="form-body"><label for="categoryName">分类名称</label><input id="categoryName" maxlength="10" value="${escapeHtml(category?.name || '')}" placeholder="例如：学习" aria-describedby="categoryFormError" /><p class="form-error" id="categoryFormError" role="alert" hidden></p><fieldset><legend>图标</legend><div class="symbol-options">${symbols.map((symbol) => `<button type="button" class="${symbol === selectedSymbol ? 'active' : ''}" data-category-symbol="${symbol}" aria-pressed="${symbol === selectedSymbol}" aria-label="选择 ${symbol}">${symbol}</button>`).join('')}</div></fieldset></div><footer class="dialog-footer">${category ? '<button class="danger-text category-delete" type="button" data-action="delete-category">删除分类</button>' : ''}<button class="secondary-button" type="button" data-action="close-modal">取消</button><button class="primary-button" type="button" data-action="save-category">${category ? '保存' : '创建'}</button></footer>`, 'form-dialog');
  dialog.dataset.categoryColor = category?.color || ['#4f6bff', '#7953c6', '#168a74', '#a56300'][categories.length % 4];
}

function deleteCategoryDialog(category) {
  if (!category) return;
  openModal(`<header class="dialog-header"><div><h2 id="dialogTitle">删除“${escapeHtml(category.name)}”</h2><p>这是受保护的分类操作。</p></div><button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icon('&#xE711;')}</button></header><div class="confirm-body"><p>分类中的 ${category.count} 个应用会移到“其他”，应用本身不会被删除。</p></div><footer class="dialog-footer"><button class="secondary-button" type="button" data-action="close-modal">取消</button><button class="danger-button" type="button" data-action="confirm-delete-category">删除分类</button></footer>`, 'confirm-dialog');
}

function openCategoryPicker(app) {
  contextMenu.innerHTML = `<div class="context-menu-heading">将“${escapeHtml(app.name)}”移动到</div>${categories.map((category) => `<button type="button" role="menuitemradio" aria-checked="${app.category === category.name}" data-category-target="${escapeHtml(category.id)}" data-category-app="${escapeHtml(app.id)}"><span class="category-dot" style="--category:${category.color}"></span><span>${escapeHtml(category.name)}</span>${app.category === category.name ? icon(ICONS.check) : ''}</button>`).join('')}`;
  contextMenu.classList.add('category-picker');
  const menuHeight = Math.min(360, 38 + categories.length * 32);
  contextMenu.style.top = `${Math.max(8, Math.min(Number.parseFloat(contextMenu.style.top) || 8, innerHeight - menuHeight - 8))}px`;
  contextMenu.querySelector('button')?.focus();
}

function openContextMenu(event, app) {
  event.preventDefault();
  contextMenu.innerHTML = `<button type="button" role="menuitem" data-menu-action="open" data-menu-app="${app.id}">${icon(ICONS.open)}打开</button><button type="button" role="menuitem" data-menu-action="pin" data-menu-app="${app.id}">${icon(ICONS.pin)}${app.pinned ? '取消固定' : '固定到常用'}</button><button type="button" role="menuitem" data-menu-action="move" data-menu-app="${app.id}">${icon(ICONS.folder)}移动到分类${icon(ICONS.chevron, 'menu-chevron')}</button><hr /><button type="button" role="menuitem" data-menu-action="location" data-menu-app="${app.id}">${icon(ICONS.files)}打开文件位置</button>`;
  contextMenu.classList.remove('category-picker');
  contextMenu.hidden = false;
  const width = 190;
  const height = 150;
  contextMenu.style.left = `${Math.min(event.clientX, innerWidth - width - 8)}px`;
  contextMenu.style.top = `${Math.min(event.clientY, innerHeight - height - 8)}px`;
  contextMenu.querySelector('button')?.focus();
}

function closeContextMenu() {
  contextMenu.hidden = true;
  contextMenu.classList.remove('category-picker');
}

let toastTimer;
function showToast(message, action, tone = 'success') {
  clearTimeout(toastTimer);
  toast.classList.toggle('error', tone === 'error');
  toast.innerHTML = `<span>${icon(tone === 'error' ? ICONS.warning : ICONS.check)}${escapeHtml(message)}</span>${action ? `<button type="button" data-action="${action.action}">${escapeHtml(action.label)}</button>` : ''}`;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3600);
}

async function loadNativeApps() {
  if (!desktopApi?.apps || !desktopApi?.index || !desktopApi?.categories) return false;
  try {
    const [items, status, categoryItems] = await Promise.all([
      desktopApi.apps.list({ size: 500 }),
      desktopApi.index.getStatus(),
      desktopApi.categories.list(),
    ]);
    apps = items.map(nativeAppModel);
    categories = categoryItems.map((category) => ({ ...category, isPreset: Boolean(category.isPreset) }));
    state.index = { ...state.index, loading: false, error: null, totalApps: status.totalApps, lastScanAt: status.lastScanAt };
    render();
    if (!searchOverlay.hidden) renderSearch();
    void hydrateAppIcons(apps);
    return true;
  } catch {
    state.index = { ...state.index, loading: false, error: '无法读取本机索引，请重新扫描。' };
    render();
    return false;
  }
}

async function loadNativeFiles() {
  if (!desktopApi?.files) return false;
  try {
    const [items, rootItems, status] = await Promise.all([desktopApi.files.list(20), desktopApi.files.roots(), desktopApi.files.status()]);
    files = items.map(nativeFileModel);
    folders = rootItems.map((root) => ({ ...root, icon: root.id === 'downloads' ? '&#xE896;' : root.id === 'pictures' ? '&#xEB9F;' : ICONS.folder }));
    state.files = { ...state.files, loading: false, scanning: false, error: null, total: status.totalFiles, lastScanAt: status.lastScanAt };
    render();
    if (!searchOverlay.hidden && state.searchType === 'files') renderSearch();
    return true;
  } catch {
    state.files = { ...state.files, loading: false, scanning: false, error: '无法读取文件索引，请检查收藏目录访问权限。' };
    render();
    return false;
  }
}

async function rescanFiles() {
  if (!desktopApi?.files) {
    showToast('网页预览不会扫描本机文件');
    return;
  }
  if (state.files.scanning) return;
  state.files.scanning = true;
  state.files.error = null;
  render();
  try {
    const result = await desktopApi.files.rescan();
    await loadNativeFiles();
    showToast(`文件扫描完成：新增 ${result.added}，更新 ${result.updated}，移除 ${result.removed}`);
  } catch {
    state.files = { ...state.files, scanning: false, loading: false, error: '文件扫描未完成，请检查目录访问权限后重试。' };
    render();
    showToast('文件扫描失败，请检查目录访问权限', null, 'error');
  }
}

async function openFile(file) {
  if (!desktopApi?.files) {
    showToast(`网页预览：${file.name}`);
    return;
  }
  const result = await desktopApi.files.open(file.id).catch(() => ({ success: false, error: '打开请求未完成' }));
  if (!result.success) showToast(result.error || '文件无法打开，请重新扫描', null, 'error');
  else showToast(`已用默认程序打开 ${file.name}`);
}

async function openFolder(folder) {
  if (!desktopApi?.files) {
    showToast(`网页预览：${folder.name}`);
    return;
  }
  const result = await desktopApi.files.openRoot(folder.id).catch(() => ({ success: false, error: '打开请求未完成' }));
  if (!result.success) showToast(result.error || '文件夹无法打开', null, 'error');
}

async function loadOrganizer() {
  if (!desktopApi?.desktop) return false;
  state.organizer.loading = true;
  if (state.view === 'organize') render();
  try {
    const [preview, restorePoints] = await Promise.all([desktopApi.desktop.scan(), desktopApi.desktop.restorePoints()]);
    preview.shortcutItems = (preview.shortcutItems || []).map((item) => ({ ...item, iconData: shortcutIconMemory.get(item.id) || null }));
    state.organizer = { ...state.organizer, ...preview, restorePoints, loading: false, error: null };
    render();
    void hydrateShortcutIcons(state.organizer.shortcutItems);
    return true;
  } catch {
    state.organizer = { ...state.organizer, loading: false, error: '无法读取桌面，请检查 Windows 文件访问权限。' };
    render();
    return false;
  }
}

async function restoreLastOrganize() {
  if (!desktopApi?.desktop) {
    showToast('网页预览没有可还原的文件');
    return;
  }
  const result = await desktopApi.desktop.restoreLast().catch((error) => ({ success: false, error: error?.message || '还原请求未完成' }));
  if (!result.success) {
    showToast(result.error || '没有可用的还原点', null, 'error');
    return;
  }
  await Promise.all([loadOrganizer(), loadNativeFiles()]);
  showToast(result.conflicts?.length ? `已还原 ${result.restored} 个文件，${result.conflicts.length} 个位置冲突已跳过` : `已还原 ${result.restored} 个文件`, null, result.conflicts?.length ? 'error' : 'success');
}

async function loadNativeSettings() {
  if (!desktopApi?.settings) return;
  try {
    const [settings, shortcuts, about] = await Promise.all([desktopApi.settings.get(), desktopApi.shortcuts.get(), desktopApi.about.get()]);
    state.settings = { ...state.settings, ...settings };
    state.theme = settings.theme;
    state.shortcuts = shortcuts;
    state.about = about;
    setTheme(state.theme, false);
    render();
  } catch {
    showToast('部分本机设置无法读取，已使用安全默认值', null, 'error');
  }
}

async function saveSetting(key, value) {
  state.settings[key] = value;
  if (key === 'theme') state.theme = value;
  setTheme(state.theme, false);
  renderPage();
  if (!desktopApi?.settings) return;
  const result = await desktopApi.settings.set(key, value).catch(() => ({ success: false, error: '设置保存请求未完成' }));
  if (!result.success) {
    showToast(result.error || '设置保存失败', null, 'error');
    await loadNativeSettings();
    return;
  }
  if (key === 'hotkeySearch' || key === 'hotkeyMain') {
    state.shortcuts = await desktopApi.shortcuts.get();
    state.recordingHotkeyKey = null;
    renderPage();
  }
}

async function addFolder() {
  if (!desktopApi?.files) {
    showToast('网页预览不会打开系统文件夹选择器');
    return;
  }
  const result = await desktopApi.files.addRoot().catch(() => ({ success: false, error: '文件夹选择请求未完成' }));
  if (result.canceled) return;
  if (!result.success) {
    showToast(result.error || '无法添加文件夹', null, 'error');
    return;
  }
  await loadNativeFiles();
  showToast(`已添加“${result.root.name}”，正在建立索引`);
  void rescanFiles();
}

async function clearRecentFiles() {
  if (!desktopApi?.files) {
    showToast('网页预览没有本机打开记录');
    return;
  }
  const result = await desktopApi.files.clearRecent().catch(() => ({ success: false, error: '清除请求未完成' }));
  if (!result.success) return showToast(result.error || '最近打开记录清除失败', null, 'error');
  await loadNativeFiles();
  showToast('最近打开记录已清除');
}

async function exportConfig() {
  if (!desktopApi?.settings) return showToast('网页预览不会写入配置文件');
  const result = await desktopApi.settings.export().catch(() => ({ success: false, error: '导出请求未完成' }));
  if (result.canceled) return;
  showToast(result.success ? '配置已导出' : result.error || '配置导出失败', null, result.success ? 'success' : 'error');
}

async function importConfig() {
  if (!desktopApi?.settings) return showToast('网页预览不会读取配置文件');
  const result = await desktopApi.settings.import().catch((error) => ({ success: false, error: error?.message || '导入请求未完成' }));
  if (result.canceled) return;
  if (!result.success) return showToast(result.error || '配置导入失败', null, 'error');
  await loadNativeSettings();
  showToast('配置已验证并导入');
}

function clearStatsDialog() {
  openModal(`<header class="dialog-header"><div><h2 id="dialogTitle">清除使用统计</h2><p>此操作只会清空启动次数与最近打开记录。</p></div><button class="icon-button" type="button" data-action="close-modal" aria-label="关闭">${icon('&#xE711;')}</button></header><div class="confirm-body"><p>应用、分类、收藏目录和文件索引都会保留。</p></div><footer class="dialog-footer"><button class="secondary-button" type="button" data-action="close-modal">取消</button><button class="danger-button" type="button" data-action="confirm-clear-stats">确认清除</button></footer>`, 'confirm-dialog');
}

async function confirmClearStats() {
  if (!desktopApi?.settings) {
    closeModal();
    return showToast('网页预览没有本机使用统计');
  }
  const result = await desktopApi.settings.clearStats().catch(() => ({ success: false, error: '清除请求未完成' }));
  closeModal();
  if (!result.success) return showToast(result.error || '统计清除失败', null, 'error');
  await Promise.all([loadNativeApps(), loadNativeFiles()]);
  showToast('使用统计已清除');
}

async function rescanApplications() {
  if (!desktopApi?.apps) {
    showToast('网页预览使用演示数据，请在 Electron 中扫描本机应用');
    return;
  }
  if (state.index.scanning) return;
  state.index.scanning = true;
  state.index.error = null;
  render();
  try {
    const result = await desktopApi.apps.rescan();
    iconMemory.clear();
    if (!await loadNativeApps()) throw new Error('Index reload failed');
    const changes = `新增 ${result.added}，更新 ${result.updated}，移除 ${result.removed}`;
    showToast(`应用扫描完成：${changes}`);
  } catch {
    state.index.scanning = false;
    state.index.error = '扫描未完成，请检查开始菜单或桌面访问权限后重试。';
    render();
    showToast('应用扫描失败，可在“设置 → 数据”中重试', null, 'error');
  } finally {
    state.index.scanning = false;
    updateIndexChrome();
    if (state.view === 'settings') renderPage();
  }
}

async function launchApplication(app) {
  if (!desktopApi?.apps) {
    showToast(`网页预览：${app.name}`);
    return;
  }
  const result = await desktopApi.apps.launch(app.id).catch(() => ({ success: false, error: '启动请求未完成' }));
  if (!result.success) {
    showToast(`${app.name} 无法启动：${result.error || '请重新扫描应用索引'}`, { action: 'rebuild-index', label: '重新扫描' }, 'error');
    return;
  }
  app.launchCount = (app.launchCount || 0) + 1;
  app.usage = `已启动 ${app.launchCount} 次`;
  showToast(`已打开 ${app.name}`);
}

function showCategoryFormError(message) {
  const error = dialog.querySelector('#categoryFormError');
  if (!error) return;
  error.textContent = message;
  error.hidden = false;
}

async function saveCategory(button) {
  if (state.categorySaving) return;
  const name = dialog.querySelector('#categoryName')?.value.trim() || '';
  const symbol = dialog.querySelector('[data-category-symbol].active')?.dataset.categorySymbol;
  if (!name || Array.from(name).length > 10) {
    showCategoryFormError('请输入 1–10 个字符的分类名称。');
    dialog.querySelector('#categoryName')?.focus();
    return;
  }
  state.categorySaving = true;
  button.disabled = true;
  const activeCategory = categories.find((category) => category.id === state.activeCategoryId);
  const payload = { name, icon: symbol, color: dialog.dataset.categoryColor };
  try {
    if (!desktopApi?.categories) {
      if (activeCategory) Object.assign(activeCategory, payload);
      else categories.push({ id: `demo-${Date.now()}`, ...payload, count: 0, isPreset: false });
      closeModal();
      render();
      showToast(`演示数据：已${activeCategory ? '更新' : '创建'}分类“${name}”`);
      return;
    }
    const result = activeCategory
      ? await desktopApi.categories.update({ id: activeCategory.id, ...payload })
      : await desktopApi.categories.create(payload);
    if (!result.success) {
      showCategoryFormError(result.error || '分类保存失败，请重试。');
      return;
    }
    closeModal();
    await loadNativeApps();
    showToast(`已${activeCategory ? '更新' : '创建'}分类“${name}”`);
  } catch {
    showCategoryFormError('分类保存失败，请稍后重试。');
  } finally {
    state.categorySaving = false;
    if (button.isConnected) button.disabled = false;
  }
}

async function confirmDeleteCategory() {
  const category = categories.find((item) => item.id === state.activeCategoryId);
  if (!category) return;
  if (!desktopApi?.categories) {
    apps.forEach((app) => { if (app.category === category.name) app.category = '其他'; });
    categories = categories.filter((item) => item.id !== category.id);
    closeModal();
    render();
    showToast(`演示数据：已删除分类“${category.name}”`);
    return;
  }
  const result = await desktopApi.categories.delete(category.id).catch(() => ({ success: false, error: '删除请求未完成' }));
  if (!result.success) {
    showToast(result.error || '分类删除失败，请重试', null, 'error');
    return;
  }
  closeModal();
  await loadNativeApps();
  showToast(`已删除分类“${category.name}”，其中应用已移到“其他”`);
}

async function togglePinned(app) {
  const next = !app.pinned;
  if (!desktopApi?.apps) {
    app.pinned = next;
    apps.sort((left, right) => Number(right.pinned) - Number(left.pinned));
    render();
    showToast(`演示数据：已${next ? '固定' : '取消固定'} ${app.name}`);
    return;
  }
  const result = await desktopApi.apps.setPinned(app.id, next).catch(() => ({ success: false, error: '固定请求未完成' }));
  if (!result.success) {
    showToast(result.error || '固定状态保存失败', null, 'error');
    return;
  }
  await loadNativeApps();
  showToast(`已${next ? '固定' : '取消固定'} ${app.name}`);
}

async function moveAppToCategory(app, category) {
  closeContextMenu();
  if (app.category === category.name) {
    showToast(`${app.name} 已在“${category.name}”中`);
    return;
  }
  if (!desktopApi?.apps) {
    app.category = category.name;
    render();
    showToast(`演示数据：已将 ${app.name} 移到“${category.name}”`);
    return;
  }
  const result = await desktopApi.apps.setCategory(app.id, category.id).catch(() => ({ success: false, error: '移动请求未完成' }));
  if (!result.success) {
    showToast(result.error || '应用分类保存失败', null, 'error');
    return;
  }
  await loadNativeApps();
  showToast(`已将 ${app.name} 移到“${category.name}”`);
}

function handleAction(action, element) {
  if (action === 'open-search') openSearch();
  if (action === 'clear-query') { searchInput.value = ''; state.fileSearchResults = null; state.searchIndex = 0; searchInput.dispatchEvent(new Event('input')); renderSearch(); searchInput.focus(); }
  if (action === 'toggle-edit') { state.editMode = !state.editMode; render(); }
  if (action === 'organize-now') organizeDialog();
  if (action === 'start-organize') void startOrganize(element);
  if (action === 'stow-shortcuts') stowShortcutsDialog();
  if (action === 'confirm-stow-shortcuts') void stowDesktopShortcuts(element);
  if (action === 'restore-shortcuts') void restoreDesktopShortcuts();
  if (action === 'close-modal') closeModal();
  if (action === 'new-category') categoryFormDialog();
  if (action === 'save-category') void saveCategory(element);
  if (action === 'toggle-setting') { const next = element.getAttribute('aria-checked') !== 'true'; void saveSetting(element.dataset.settingKey, next); }
  if (action === 'rebuild-index') void rescanApplications();
  if (action === 'rescan-files') void rescanFiles();
  if (action === 'rescan') void loadOrganizer().then((success) => { if (success) showToast('桌面整理预览已刷新'); });
  if (action === 'restore-last' || action === 'undo-organize') void restoreLastOrganize();
  if (action === 'add-folder') void addFolder();
  if (action === 'clear-recent') void clearRecentFiles();
  if (action === 'edit-category') categoryFormDialog(categories.find((category) => category.id === state.activeCategoryId));
  if (action === 'delete-category') deleteCategoryDialog(categories.find((category) => category.id === state.activeCategoryId));
  if (action === 'confirm-delete-category') void confirmDeleteCategory();
  if (action === 'record-hotkey') { state.recordingHotkeyKey = element.dataset.hotkeyKey; renderPage(); }
  if (action === 'export-config') void exportConfig();
  if (action === 'import-config') void importConfig();
  if (action === 'check-updates') showToast(`当前版本 ${state.about.version}；此构建未配置在线更新源`);
  if (action === 'clear-stats') clearStatsDialog();
  if (action === 'confirm-clear-stats') void confirmClearStats();
  if (action === 'minimize') {
    if (desktopApi?.window) void desktopApi.window.minimize();
    else showToast('窗口控制将在 Electron 中接管');
  }
  if (action === 'maximize') {
    if (desktopApi?.window) void desktopApi.window.maximize();
    else showToast('窗口控制将在 Electron 中接管');
  }
  if (action === 'close-window') {
    if (desktopApi?.window) void desktopApi.window.close();
    else showToast('窗口控制将在 Electron 中接管');
  }
}

document.addEventListener('click', (event) => {
  const symbolButton = event.target.closest('[data-category-symbol]');
  if (symbolButton) {
    dialog.querySelectorAll('[data-category-symbol]').forEach((button) => {
      const selected = button === symbolButton;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  const nav = event.target.closest('[data-nav]');
  if (nav) setView(nav.dataset.nav);

  const action = event.target.closest('[data-action]');
  if (action) handleAction(action.dataset.action, action);

  const appButton = event.target.closest('[data-app]');
  if (appButton && !state.editMode) {
    const app = apps.find((item) => item.id === appButton.dataset.app);
    if (app) {
      if (modalOverlay.contains(appButton)) closeModal();
      void launchApplication(app);
    }
  }

  const categoryButton = event.target.closest('[data-category]');
  if (categoryButton) categoryDialog(categories.find((item) => item.id === categoryButton.dataset.category));

  const fileButton = event.target.closest('[data-file]');
  if (fileButton) {
    const file = [...files, ...(state.fileSearchResults || [])].find((item) => item.id === fileButton.dataset.file);
    if (file) void openFile(file);
  }

  const shortcutButton = event.target.closest('[data-shortcut]');
  if (shortcutButton) {
    const item = state.organizer.shortcutItems.find((shortcut) => shortcut.id === shortcutButton.dataset.shortcut);
    if (item) void launchDesktopShortcut(item);
  }

  const folderButton = event.target.closest('[data-folder]');
  if (folderButton) {
    const folder = folders.find((item) => item.id === folderButton.dataset.folder);
    if (folder) void openFolder(folder);
  }

  const sectionButton = event.target.closest('[data-settings-section]');
  if (sectionButton) { state.settingsSection = sectionButton.dataset.settingsSection; renderPage(); }

  const themeButton = event.target.closest('[data-theme]');
  if (themeButton) { setTheme(themeButton.dataset.theme); renderPage(); }

  const typeButton = event.target.closest('[data-search-type]');
  if (typeButton) {
    state.searchType = typeButton.dataset.searchType;
    state.searchIndex = 0;
    state.fileSearchResults = null;
    searchInput.dispatchEvent(new Event('input'));
    renderSearch();
    searchInput.focus();
  }

  const resultButton = event.target.closest('[data-search-result]');
  if (resultButton) { state.searchIndex = [...searchResults.querySelectorAll('[data-search-result]')].indexOf(resultButton); openSelectedSearchResult(); }

  const categoryTarget = event.target.closest('[data-category-target]');
  if (categoryTarget) {
    const app = apps.find((item) => item.id === categoryTarget.dataset.categoryApp);
    const category = categories.find((item) => item.id === categoryTarget.dataset.categoryTarget);
    if (app && category) void moveAppToCategory(app, category);
  }

  const menuButton = event.target.closest('[data-menu-action]');
  if (menuButton) {
    const app = apps.find((item) => item.id === menuButton.dataset.menuApp);
    if (!app) return;
    const menuAction = menuButton.dataset.menuAction;
    if (menuAction === 'move') {
      openCategoryPicker(app);
      return;
    }
    closeContextMenu();
    if (menuAction === 'open') void launchApplication(app);
    else if (menuAction === 'pin') void togglePinned(app);
    else if (desktopApi?.apps) void desktopApi.apps.reveal(app.id).then((result) => { if (!result.success) showToast(result.error || '文件位置不可用', null, 'error'); });
    else showToast(`网页预览：${app.name} 的文件位置`);
  } else if (!event.target.closest('#contextMenu')) {
    closeContextMenu();
  }
});

document.addEventListener('contextmenu', (event) => {
  const appButton = event.target.closest('[data-app]');
  if (!appButton) return;
  const app = apps.find((item) => item.id === appButton.dataset.app);
  if (app) openContextMenu(event, app);
});

let fileSearchTimer;
searchInput.addEventListener('input', () => {
  state.searchIndex = 0;
  if (state.searchType !== 'files' || !desktopApi?.files) {
    state.fileSearchResults = null;
    renderSearch();
    return;
  }
  clearTimeout(fileSearchTimer);
  const query = searchInput.value.trim();
  if (!query) {
    state.fileSearchResults = null;
    renderSearch();
    return;
  }
  fileSearchTimer = setTimeout(async () => {
    const results = await desktopApi.files.search(query, state.settings.searchResultCount).catch(() => []);
    state.fileSearchResults = results.map(nativeFileModel);
    renderSearch();
  }, 150);
  renderSearch();
});

document.addEventListener('change', (event) => {
  const select = event.target.closest('[data-setting-select]');
  if (select) void saveSetting(select.dataset.settingSelect, select.value);
  const color = event.target.closest('[data-setting-color]');
  if (color) void saveSetting(color.dataset.settingColor, color.value);
  const number = event.target.closest('[data-setting-number]');
  if (number) void saveSetting(number.dataset.settingNumber, Math.min(20, Math.max(5, Number.parseInt(number.value, 10) || 10)));
});

document.addEventListener('keydown', (event) => {
  if (state.recordingHotkeyKey) {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      state.recordingHotkeyKey = null;
      renderPage();
      return;
    }
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return;
    const modifiers = [];
    if (event.ctrlKey) modifiers.push('CommandOrControl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');
    if (event.metaKey) modifiers.push('Super');
    if (!modifiers.length) {
      showToast('全局快捷键至少需要 Ctrl、Alt、Shift 或 Windows 键', null, 'error');
      return;
    }
    const namedKeys = { ' ': 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Escape: 'Esc' };
    const key = namedKeys[event.key] || (event.key.length === 1 ? event.key.toUpperCase() : event.key);
    const settingKey = state.recordingHotkeyKey;
    void saveSetting(settingKey, [...modifiers, key].join('+'));
    return;
  }
  if (event.altKey && event.code === 'Space') {
    event.preventDefault();
    if (searchOverlay.hidden) openSearch(); else closeSearch();
    return;
  }
  if (event.ctrlKey && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSearch();
    return;
  }
  if (!searchOverlay.hidden) {
    if (event.key === 'Escape') { event.preventDefault(); closeSearch(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const count = currentSearchResults().length;
      if (!count) return;
      state.searchIndex = event.key === 'ArrowDown' ? (state.searchIndex + 1) % count : (state.searchIndex - 1 + count) % count;
      renderSearch();
      return;
    }
    if (event.key === 'Enter') { event.preventDefault(); openSelectedSearchResult(); return; }
    if (event.key === 'Tab') {
      event.preventDefault();
      const types = ['apps', 'files', 'settings'];
      const offset = event.shiftKey ? -1 : 1;
      state.searchType = types[(types.indexOf(state.searchType) + offset + types.length) % types.length];
      state.searchIndex = 0;
      state.fileSearchResults = null;
      searchInput.dispatchEvent(new Event('input'));
      renderSearch();
      searchInput.focus();
      return;
    }
  }
  if (!modalOverlay.hidden) {
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
    if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
  if (!contextMenu.hidden && event.key === 'Escape') closeContextMenu();
  if (!contextMenu.hidden && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    const items = [...contextMenu.querySelectorAll('button')];
    const current = Math.max(0, items.indexOf(document.activeElement));
    const offset = event.key === 'ArrowDown' ? 1 : -1;
    items[(current + offset + items.length) % items.length].focus();
  }
});

searchOverlay.addEventListener('mousedown', (event) => {
  if (event.target === searchOverlay) closeSearch();
});

window.addEventListener('hashchange', () => {
  const next = location.hash.slice(1);
  if (navItems.some((item) => item.id === next)) setView(next, false);
});

window.addEventListener('blur', () => {
  if (state.settings.autoHideSearch && !searchOverlay.hidden && modalOverlay.hidden) closeSearch();
});

setTheme(state.theme, false);
render();

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.theme === 'system') setTheme('system', false);
});

if (desktopApi?.isElectron) {
  desktopApi.onShowSearch(openSearch);
  desktopApi.theme.get().then((theme) => {
    if (!['light', 'dark', 'system'].includes(theme)) return;
    state.theme = theme;
    setTheme(theme, false);
    renderPage();
  }).catch(() => {});
  desktopApi.theme.onChanged(() => {
    if (state.theme === 'system') setTheme('system', false);
  });
  desktopApi.shortcuts?.get().then((shortcuts) => {
    if (!shortcuts?.search || !shortcuts?.toggleWindow) return;
    state.shortcuts = shortcuts;
    if (state.view === 'settings' && state.settingsSection === 'keyboard') renderPage();
  }).catch(() => {});
  desktopApi.index?.onUpdated((status) => {
    state.index = { ...state.index, totalApps: status.totalApps, lastScanAt: status.lastScanAt };
    updateIndexChrome();
  });
  desktopApi.files?.onUpdated((status) => {
    state.files = { ...state.files, total: status.totalFiles, lastScanAt: status.lastScanAt };
    void loadNativeFiles();
  });
  desktopApi.settings?.onChanged((settings) => {
    state.settings = { ...state.settings, ...settings };
    state.theme = settings.theme;
    setTheme(state.theme, false);
    render();
  });
  void Promise.all([loadNativeApps(), loadNativeFiles(), loadOrganizer(), loadNativeSettings()]);
}
