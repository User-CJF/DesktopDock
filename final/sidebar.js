const api = window.desktopDock;

const ICONS = {
  apps: '&#xE80A;', search: '&#xE721;', refresh: '&#xE72C;', hide: '&#xE738;',
  settings: '&#xE713;', add: '&#xE710;', more: '&#xE712;', folder: '&#xE8B7;',
  desktop: '&#xE8FC;', file: '&#xE8A5;', warning: '&#xE7BA;',
  previous: '&#xE892;', play: '&#xE768;', next: '&#xE893;', volume: '&#xE767;',
  sun: '&#xE706;', cloud: '&#xE753;', rain: '&#xE9C4;', snow: '&#xE9C8;',
  location: '&#xE707;', edit: '&#xE70F;', trash: '&#xE74D;', pin: '&#xE718;',
};

const demoCategories = [
  { id: 'office', name: '办公', color: '#4f6bff', count: 1, isPreset: 1 },
  { id: 'dev', name: '开发', color: '#7953c6', count: 1, isPreset: 1 },
  { id: 'social', name: '社交', color: '#087f9b', count: 1, isPreset: 1 },
  { id: 'tools', name: '工具', color: '#a56300', count: 1, isPreset: 1 },
];
const demoApps = [
  { id: 'app_demo_01', name: 'Visual Studio Code', category: '开发', pinned: 1 },
  { id: 'app_demo_02', name: 'Chrome', category: '工具', pinned: 1 },
  { id: 'app_demo_03', name: '微信', category: '社交', pinned: 0 },
  { id: 'app_demo_04', name: 'WPS Office', category: '办公', pinned: 0 },
];
const demoShortcuts = [
  { id: 'shortcut_demo_01', name: '浏览器', location: 'desktop' },
  { id: 'shortcut_demo_02', name: '代码编辑器', location: 'desktop' },
  { id: 'shortcut_demo_03', name: '音乐', location: 'stowed' },
];
const demoFiles = [
  { id: 'file_demo_01', name: 'DesktopDock 设计说明.md', extension: '.md', modifiedAt: new Date().toISOString(), rootName: '文档' },
  { id: 'file_demo_02', name: '界面预览.png', extension: '.png', modifiedAt: new Date().toISOString(), rootName: '图片' },
];

const state = {
  loading: Boolean(api?.isElectron), busy: false, error: null,
  apps: api?.isElectron ? [] : demoApps,
  categories: api?.isElectron ? [] : demoCategories,
  shortcuts: api?.isElectron ? [] : demoShortcuts,
  files: api?.isElectron ? [] : demoFiles,
  roots: api?.isElectron ? [] : [{ id: 'documents', name: '文档' }, { id: 'downloads', name: '下载' }],
  organizer: { desktopShortcuts: 3, stowedShortcuts: 1, publicShortcuts: 0, files: 4, folders: 2, restorePoints: [] },
  settings: { theme: 'dark', autoStart: false, startMinimized: false, closeAfterLaunch: true, weatherCity: '深圳' },
  index: { totalApps: demoApps.length, lastScanAt: null },
  weather: api?.isElectron ? null : {
    city: '深圳', locationName: '深圳 · 广东', updatedAt: new Date().toISOString(),
    current: { temperature: 31, apparentTemperature: 34, relativeHumidity: 69, precipitationProbability: 18, weatherCode: 2, windSpeed: 9 },
    hourly: Array.from({ length: 6 }, (_, index) => ({ time: new Date(Date.now() + index * 3600000).toISOString(), temperature: 30 - Math.floor(index / 2), weatherCode: index < 3 ? 2 : 1, precipitationProbability: 18 })),
  },
  weatherLoading: false, weatherError: null, searchIndex: 0, searchResults: [],
};

const appIconMemory = new Map();
const shortcutIconMemory = new Map();
let iconGeneration = 0;
let toastTimer;
let searchTimer;
let dialogReturnFocus = null;

const dock = document.querySelector('#desktopApp');
const dockStatus = document.querySelector('#dockStatus');
const dockSearch = document.querySelector('#dockSearch');
const dockSearchResults = document.querySelector('#dockSearchResults');
const dockSummary = document.querySelector('#dockSummary');
const dockContent = document.querySelector('#dockContent');
const dialogLayer = document.querySelector('#dockDialogLayer');
const dialog = document.querySelector('#dockDialog');
const toast = document.querySelector('#dockToast');

if (api?.isElectron) document.body.classList.add('is-electron');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function icon(glyph) { return `<span class="fluent-icon" aria-hidden="true">${glyph}</span>`; }

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

function fileMark(file) { return escapeHtml((file.extension || 'FILE').replace('.', '').slice(0, 3).toUpperCase()); }

function fileType(file) {
  const types = { '.md': 'Markdown', '.doc': 'Word', '.docx': 'Word', '.xls': 'Excel', '.xlsx': 'Excel', '.ppt': '演示文稿', '.pptx': '演示文稿', '.pdf': 'PDF', '.png': '图片', '.jpg': '图片', '.zip': '压缩文件' };
  return types[file.extension] || (file.extension ? `${file.extension.slice(1).toUpperCase()} 文件` : '文件');
}

function weatherMeta(code) {
  if (code === 0) return { label: '晴', glyph: ICONS.sun };
  if ([1, 2, 3].includes(code)) return { label: code === 1 ? '晴间多云' : '多云', glyph: ICONS.cloud };
  if ([45, 48].includes(code)) return { label: '雾', glyph: ICONS.cloud };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return { label: code >= 95 ? '雷阵雨' : '有雨', glyph: ICONS.rain };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: '有雪', glyph: ICONS.snow };
  return { label: '天气未知', glyph: ICONS.cloud };
}

function widgetHeader(glyph, title, actions = '') {
  return `<header class="widget-header"><h2>${icon(glyph)}<span>${escapeHtml(title)}</span></h2>${actions ? `<div class="widget-actions">${actions}</div>` : ''}</header>`;
}

function weatherWidget() {
  if (state.loading || state.weatherLoading) return `<section class="widget weather-widget loading-widget">${widgetHeader(ICONS.location, state.settings.weatherCity, `<button data-action="refresh-weather" aria-label="刷新天气">${icon(ICONS.refresh)}</button>`)}<div class="widget-empty">正在更新天气…</div></section>`;
  if (!state.weather) return `<section class="widget weather-widget">${widgetHeader(ICONS.location, state.settings.weatherCity, `<button data-action="open-settings" aria-label="设置天气城市">${icon(ICONS.settings)}</button>`)}<div class="widget-empty"><b>天气暂时不可用</b><span>${escapeHtml(state.weatherError || '请检查网络或修改城市')}</span><button data-action="refresh-weather">重试</button></div></section>`;
  const current = state.weather.current;
  const meta = weatherMeta(current.weatherCode);
  const hourly = state.weather.hourly || [];
  return `<section class="widget weather-widget">
    ${widgetHeader(ICONS.location, state.weather.locationName || state.weather.city, `<button data-action="refresh-weather" aria-label="刷新天气" title="刷新天气">${icon(ICONS.refresh)}</button>`)}
    <div class="weather-current"><span class="weather-symbol">${icon(meta.glyph)}</span><strong>${Math.round(current.temperature)}°</strong><span><b>${escapeHtml(meta.label)}</b><small>体感 ${Math.round(current.apparentTemperature)}°</small></span></div>
    <div class="weather-facts"><span>湿度 <b>${Math.round(current.relativeHumidity)}%</b></span><span>风速 <b>${Math.round(current.windSpeed)} km/h</b></span><span>降水 <b>${Math.round(current.precipitationProbability ?? 0)}%</b></span></div>
    <div class="hourly-strip">${hourly.map((item) => { const itemMeta = weatherMeta(item.weatherCode); return `<div><time>${new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(item.time))}</time>${icon(itemMeta.glyph)}<b>${Math.round(item.temperature)}°</b></div>`; }).join('')}</div>
    ${state.weather.stale ? '<p class="widget-note">当前显示最近一次缓存，联网后自动更新。</p>' : ''}
  </section>`;
}

function clockWidget() {
  return `<section class="widget clock-widget">${widgetHeader(ICONS.apps, '桌面舱')}<div class="clock-row"><span class="clock-calendar">${icon(ICONS.apps)}</span><div><strong id="clockTime"></strong><time id="clockDate"></time></div></div></section>`;
}

function mediaWidget() {
  return `<section class="widget media-widget">${widgetHeader(ICONS.volume, '系统媒体')}<div class="record-art"><span></span></div><div class="media-copy"><b>Windows 播放控制</b><small>控制当前活动的音乐或视频播放器</small></div><div class="media-controls"><button data-media="previous" aria-label="上一首">${icon(ICONS.previous)}</button><button class="media-play" data-media="playPause" aria-label="播放或暂停">${icon(ICONS.play)}</button><button data-media="next" aria-label="下一首">${icon(ICONS.next)}</button><button data-media="mute" aria-label="静音">${icon(ICONS.volume)}</button></div></section>`;
}

function appTile(item) {
  return `<button class="app-tile" type="button" data-app="${escapeHtml(item.id)}" title="打开 ${escapeHtml(item.name)}">${itemIcon(item, 'app')}<span>${escapeHtml(item.name)}</span></button>`;
}

function categoryWidget(category) {
  const items = state.apps.filter((item) => item.category === category.name).slice(0, 12);
  const actions = `<button data-action="assign-category" data-category-id="${escapeHtml(category.id)}" aria-label="管理${escapeHtml(category.name)}分类">${icon(ICONS.add)}</button><button data-action="category-menu" data-category-id="${escapeHtml(category.id)}" aria-label="${escapeHtml(category.name)}分类选项">${icon(ICONS.more)}</button>`;
  return `<section class="widget category-widget" style="--category-color:${escapeHtml(category.color || '#697386')}">${widgetHeader(ICONS.folder, category.name, actions)}${items.length ? `<div class="app-icon-grid">${items.map(appTile).join('')}</div>` : `<div class="widget-empty compact"><b>此分类暂无应用</b><button data-action="assign-category" data-category-id="${escapeHtml(category.id)}">添加应用</button></div>`}${category.count > 12 ? `<button class="widget-more" data-action="assign-category" data-category-id="${escapeHtml(category.id)}">管理全部 ${category.count} 个</button>` : ''}</section>`;
}

function shortcutWidget() {
  const actions = `<button data-action="desktop-tools" aria-label="桌面快捷方式管理">${icon(ICONS.more)}</button>`;
  return `<section class="widget shortcut-widget">${widgetHeader(ICONS.desktop, '桌面快捷方式', actions)}${state.shortcuts.length ? `<div class="app-icon-grid">${state.shortcuts.slice(0, 12).map((item) => `<button class="app-tile" data-shortcut="${escapeHtml(item.id)}" title="打开 ${escapeHtml(item.name)}">${itemIcon(item, 'shortcut')}<span>${escapeHtml(item.name)}</span></button>`).join('')}</div>` : '<div class="widget-empty compact"><b>桌面已清爽</b><span>收纳的快捷方式会保留在这里。</span></div>'}<div class="shortcut-status"><span>${state.organizer.desktopShortcuts} 个在桌面</span><span>${state.organizer.stowedShortcuts} 个已收纳</span></div></section>`;
}

function fileWidget() {
  const rootItems = state.roots.slice(0, 4).map((root) => `<button class="folder-row" data-root="${escapeHtml(root.id)}">${icon(ICONS.folder)}<span>${escapeHtml(root.name)}</span></button>`).join('');
  const files = state.files.slice(0, 7).map((file) => `<button class="file-row" data-file="${escapeHtml(file.id)}"><span class="file-mark">${fileMark(file)}</span><span><b>${escapeHtml(file.name)}</b><small>${escapeHtml(file.rootName || fileType(file))}</small></span></button>`).join('');
  return `<section class="widget file-widget">${widgetHeader(ICONS.file, '文件', `<button data-action="add-root" aria-label="添加文件夹组件">${icon(ICONS.add)}</button><button data-action="refresh-files" aria-label="刷新文件">${icon(ICONS.refresh)}</button>`)}<div class="folder-list">${rootItems}</div>${files ? `<div class="file-list">${files}</div>` : '<div class="widget-empty compact"><b>暂无最近文件</b></div>'}</section>`;
}

function renderBoard() {
  const categories = state.categories.length ? state.categories : demoCategories;
  return `<div class="widget-board"><div class="widget-column">${weatherWidget()}${categories.filter((_item, index) => index % 2 === 0).map(categoryWidget).join('')}${shortcutWidget()}</div><div class="widget-column">${clockWidget()}${mediaWidget()}${categories.filter((_item, index) => index % 2 === 1).map(categoryWidget).join('')}${fileWidget()}</div></div>`;
}

function render() {
  dockContent.innerHTML = state.error ? `<section class="widget full-widget"><div class="widget-empty">${icon(ICONS.warning)}<b>桌面数据暂时不可用</b><span>${escapeHtml(state.error)}</span><button data-action="refresh-all">重新连接</button></div></section>` : renderBoard();
  const managed = state.organizer.desktopShortcuts + state.organizer.stowedShortcuts;
  dockStatus.textContent = state.error ? '需要重试' : state.loading ? '正在同步桌面' : '已吸附桌面右侧';
  dockSummary.innerHTML = `<span><i class="status-dot ${state.error ? 'error' : ''}"></i>${state.loading ? '正在读取本机数据' : `${state.index.totalApps} 个应用 · ${managed} 个快捷方式 · 本地运行`}</span><button data-action="open-settings">设置</button>`;
  updateClock();
  void hydrateIcons();
}

function updateClock() {
  const now = new Date();
  const time = document.querySelector('#clockTime');
  const date = document.querySelector('#clockDate');
  if (time) time.textContent = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  if (date) date.textContent = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
}

function showToast(message, tone = 'success') {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('error', tone === 'error');
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}

function openDialog(contents, wide = false) {
  dialogReturnFocus = document.activeElement;
  dialog.innerHTML = contents;
  dialog.classList.toggle('wide', wide);
  dialogLayer.hidden = false;
  dock.inert = true;
  dialog.querySelector('input, button, select')?.focus();
}

function closeDialog() {
  dialogLayer.hidden = true;
  dialog.innerHTML = '';
  dialog.classList.remove('wide');
  dock.inert = false;
  dialogReturnFocus?.focus?.();
  dialogReturnFocus = null;
}

function dialogShell(title, detail, body, footer) {
  return `<header class="dialog-header"><h2 id="dockDialogTitle">${escapeHtml(title)}</h2><p>${escapeHtml(detail)}</p></header><div class="dialog-body">${body}</div><footer class="dialog-footer">${footer}</footer>`;
}

function openCategoryEditor(categoryId = null) {
  const category = state.categories.find((item) => item.id === categoryId);
  if (category?.isPreset) return showToast('默认分类不可改名，可继续为它添加应用', 'error');
  const icons = ['📄', '🎨', '💻', '🎮', '💬', '🔧', '📁', '📚', '🧰', '🎬', '🗂️', '🧪'];
  const colors = ['#4f6bff', '#7953c6', '#d95361', '#168a74', '#087f9b', '#a56300', '#697386'];
  const body = `<form id="categoryForm" class="dialog-form"><label>分类名称<input name="name" maxlength="10" required value="${escapeHtml(category?.name || '')}" placeholder="例如：学习"></label><label>图标<select name="icon">${icons.map((value) => `<option value="${value}" ${category?.icon === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label><fieldset><legend>分类颜色</legend><div class="color-options">${colors.map((value) => `<label><input type="radio" name="color" value="${value}" ${(category?.color || colors[0]).toLowerCase() === value ? 'checked' : ''}><span style="--swatch:${value}"></span></label>`).join('')}</div></fieldset></form>`;
  openDialog(dialogShell(category ? '编辑分类' : '新建分类', '分类会作为独立组件显示在右侧桌面舱中。', body, `<button data-action="close-dialog">取消</button><button class="primary" data-action="save-category" data-category-id="${escapeHtml(categoryId || '')}">${category ? '保存修改' : '创建分类'}</button>`));
}

function openAssignment(categoryId) {
  const category = state.categories.find((item) => item.id === categoryId);
  if (!category) return;
  const sorted = [...state.apps].sort((a, b) => Number(b.category === category.name) - Number(a.category === category.name) || a.name.localeCompare(b.name, 'zh-CN'));
  const list = sorted.map((item) => `<label class="assignment-row"><input type="checkbox" data-assign-app="${escapeHtml(item.id)}" ${item.category === category.name ? 'checked' : ''}>${itemIcon(item, 'app')}<span><b>${escapeHtml(item.name)}</b><small>当前：${escapeHtml(item.category || '其他')}</small></span></label>`).join('');
  openDialog(dialogShell(`管理“${category.name}”`, '勾选要放入此分类的应用；取消已归类应用会移回“其他”。', `<div class="assignment-list">${list || '<div class="widget-empty"><b>未扫描到应用</b></div>'}</div>`, `<button data-action="close-dialog">取消</button><button class="primary" data-action="save-assignment" data-category-id="${escapeHtml(category.id)}">保存分类</button>`), true);
}

function openCategoryMenu(categoryId) {
  const category = state.categories.find((item) => item.id === categoryId);
  if (!category) return;
  const customActions = category.isPreset ? '' : `<button data-action="edit-category" data-category-id="${escapeHtml(category.id)}">${icon(ICONS.edit)}<span><b>编辑分类</b><small>修改名称、图标与颜色</small></span></button><button class="danger-row" data-action="delete-category" data-category-id="${escapeHtml(category.id)}">${icon(ICONS.trash)}<span><b>删除分类</b><small>其中应用将移回“其他”</small></span></button>`;
  openDialog(dialogShell(category.name, `${category.count || 0} 个应用`, `<div class="action-list"><button data-action="assign-category" data-category-id="${escapeHtml(category.id)}">${icon(ICONS.pin)}<span><b>管理应用</b><small>添加或移出此分类</small></span></button>${customActions}</div>`, '<button data-action="close-dialog">关闭</button>'));
}

function openDesktopTools() {
  const body = `<div class="action-list"><button data-action="stow-shortcuts" ${state.organizer.desktopShortcuts ? '' : 'disabled'}>${icon(ICONS.hide)}<span><b>收纳桌面快捷方式</b><small>仅移动个人快捷方式，系统图标保持原位</small></span></button><button data-action="restore-shortcuts" ${state.organizer.stowedShortcuts ? '' : 'disabled'}>${icon(ICONS.desktop)}<span><b>恢复快捷方式</b><small>把已收纳项目安全恢复到桌面</small></span></button><button data-action="organize-files" ${state.organizer.files ? '' : 'disabled'}>${icon(ICONS.folder)}<span><b>整理普通文件</b><small>先建立还原点，再按类型移动</small></span></button><button data-action="restore-files" ${state.organizer.restorePoints?.length ? '' : 'disabled'}>${icon(ICONS.refresh)}<span><b>撤销文件整理</b><small>恢复最近一次整理结果</small></span></button></div>`;
  openDialog(dialogShell('桌面整理', `${state.organizer.desktopShortcuts} 个快捷方式和 ${state.organizer.files} 个普通文件可处理`, body, '<button data-action="close-dialog">关闭</button>'));
}

function settingToggle(key, title, detail) {
  return `<div class="setting-row"><span><b>${escapeHtml(title)}</b><small>${escapeHtml(detail)}</small></span><button class="toggle ${state.settings[key] ? 'on' : ''}" role="switch" aria-checked="${Boolean(state.settings[key])}" data-setting="${key}" aria-label="${escapeHtml(title)}"></button></div>`;
}

function openSettings() {
  const themes = { dark: '深色', light: '浅色', system: '跟随系统' };
  const body = `<form id="weatherForm" class="dialog-form"><label>天气城市<input name="weatherCity" maxlength="80" value="${escapeHtml(state.settings.weatherCity || '深圳')}" required></label></form><div class="settings-list">${settingToggle('autoStart', '开机自动启动', '便携 EXE 也可随 Windows 自动运行')}${settingToggle('startMinimized', '启动时隐藏', '从托盘或快捷键唤起桌面舱')}${settingToggle('closeAfterLaunch', '启动项目后隐藏', '打开项目后自动收起到托盘')}</div><div class="setting-row"><span><b>界面主题</b><small>${themes[state.settings.theme] || themes.system}</small></span><button class="text-button" data-action="cycle-theme">切换</button></div><div class="settings-grid"><button data-action="export-config">导出配置</button><button data-action="import-config">导入配置</button><button data-action="quit-app" class="danger-row">退出桌面舱</button></div>`;
  openDialog(dialogShell('桌面舱设置', '右侧吸附、托盘常驻和本地数据设置。', body, '<button data-action="close-dialog">取消</button><button class="primary" data-action="save-settings">应用</button>'), true);
}

async function hydrateIcons() {
  if (!api?.isElectron) return;
  const generation = ++iconGeneration;
  const visibleShortcutIds = new Set([...document.querySelectorAll('[data-shortcut-icon]')].map((node) => node.dataset.shortcutIcon));
  const visibleAppIds = new Set([...document.querySelectorAll('[data-app-icon]')].map((node) => node.dataset.appIcon));
  const tasks = [...state.shortcuts.filter((item) => visibleShortcutIds.has(item.id) && !shortcutIconMemory.has(item.id)).map((item) => ({ item, kind: 'shortcut' })), ...state.apps.filter((item) => visibleAppIds.has(item.id) && !appIconMemory.has(item.id)).map((item) => ({ item, kind: 'app' }))];
  let cursor = 0;
  const worker = async () => {
    while (cursor < tasks.length && generation === iconGeneration) {
      const task = tasks[cursor++];
      const value = task.kind === 'shortcut' ? await api.desktop.shortcutIcon(task.item.id).catch(() => null) : await api.apps.icon(task.item.id).catch(() => null);
      if (generation !== iconGeneration) return;
      const safe = typeof value === 'string' && value.startsWith('data:image/png;base64,') ? value : null;
      const memory = task.kind === 'shortcut' ? shortcutIconMemory : appIconMemory;
      memory.set(task.item.id, safe);
      if (!safe) continue;
      document.querySelectorAll(`[data-${task.kind}-icon="${task.item.id}"]`).forEach((container) => { const image = document.createElement('img'); image.src = safe; image.alt = ''; container.replaceChildren(image); container.classList.add('has-image'); });
    }
  };
  await Promise.all(Array.from({ length: Math.min(12, tasks.length) }, worker));
}

async function loadWeather(force = false) {
  if (!api?.weather) return;
  if (state.weatherLoading && !force) return;
  state.weatherLoading = true;
  state.weatherError = null;
  render();
  try { state.weather = await api.weather.get(state.settings.weatherCity, force); }
  catch (error) { state.weather = null; state.weatherError = error?.message || '天气读取失败'; }
  state.weatherLoading = false;
  render();
}

async function loadData({ rescan = false } = {}) {
  if (!api?.isElectron) { state.loading = false; render(); return; }
  state.loading = true;
  state.error = null;
  render();
  try {
    if (rescan) await Promise.all([api.apps.rescan(), api.files.rescan()]);
    const [apps, categories, files, roots, organizer, restorePoints, settings, index] = await Promise.all([api.apps.list({ size: 500 }), api.categories.list(), api.files.list(40), api.files.roots(), api.desktop.scan(), api.desktop.restorePoints(), api.settings.get(), api.index.getStatus()]);
    state.apps = apps; state.categories = categories; state.files = files; state.roots = roots; state.shortcuts = organizer.shortcutItems || [];
    state.organizer = { ...state.organizer, ...organizer, restorePoints };
    const weatherCityChanged = state.settings.weatherCity !== settings.weatherCity;
    state.settings = { ...state.settings, ...settings }; state.index = index; state.loading = false;
    applyTheme(state.settings.theme); render();
    if ((!state.weather || weatherCityChanged) && !state.weatherLoading) void loadWeather(false);
  } catch (error) { state.loading = false; state.error = error?.message || '读取失败，请检查桌面访问权限'; render(); }
}

async function afterLaunch(result, successMessage) {
  if (!result?.success) return showToast(result?.error || '项目无法打开，请刷新后重试', 'error');
  showToast(successMessage);
  if (state.settings.closeAfterLaunch) await api?.window?.hide?.();
}

async function runBusy(operation, successMessage, failureMessage) {
  if (state.busy) return;
  state.busy = true;
  const result = await operation().catch(() => null);
  state.busy = false;
  await loadData();
  const failed = result?.success === false || !result;
  showToast(failed ? (result?.error || failureMessage) : successMessage(result), failed ? 'error' : 'success');
}

async function saveSetting(key, value) {
  const previous = state.settings[key]; state.settings[key] = value; applyTheme(state.settings.theme); render();
  if (!api?.settings) return { success: true };
  const result = await api.settings.set(key, value).catch(() => ({ success: false }));
  if (!result.success) { state.settings[key] = previous; applyTheme(state.settings.theme); render(); showToast(result.error || '设置保存失败', 'error'); }
  return result;
}

function renderSearchResults(results) {
  state.searchResults = results; state.searchIndex = Math.min(state.searchIndex, Math.max(0, results.length - 1)); dockSearchResults.hidden = false;
  dockSearchResults.innerHTML = results.length ? results.map((result, index) => `<button class="search-result ${index === state.searchIndex ? 'selected' : ''}" data-search-index="${index}">${result.kind === 'shortcut' ? itemIcon(result.item, 'shortcut') : result.kind === 'app' ? itemIcon(result.item, 'app') : `<span class="item-icon">${fileMark(result.item)}</span>`}<span><b>${escapeHtml(result.item.name)}</b><small>${escapeHtml(result.detail)}</small></span><em>打开</em></button>`).join('') : '<div class="search-empty">没有匹配项目</div>';
}

async function search(query) {
  const normalized = query.trim().toLocaleLowerCase('zh-CN');
  if (!normalized) { dockSearchResults.hidden = true; state.searchResults = []; return; }
  const local = [...state.shortcuts.filter((item) => item.name.toLocaleLowerCase('zh-CN').includes(normalized)).map((item) => ({ kind: 'shortcut', item, detail: '桌面快捷方式' })), ...state.apps.filter((item) => item.name.toLocaleLowerCase('zh-CN').includes(normalized)).map((item) => ({ kind: 'app', item, detail: `${item.category || '其他'}应用` }))];
  let fileResults = state.files.filter((item) => item.name.toLocaleLowerCase('zh-CN').includes(normalized));
  if (api?.files?.search) fileResults = await api.files.search(query, 8).catch(() => fileResults);
  renderSearchResults([...local, ...fileResults.map((item) => ({ kind: 'file', item, detail: fileType(item) }))].slice(0, 14));
}

async function openSearchResult(index) {
  const result = state.searchResults[index]; if (!result) return; dockSearchResults.hidden = true; dockSearch.value = '';
  if (!api?.isElectron) return showToast(`网页预览：${result.item.name}`);
  if (result.kind === 'shortcut') await afterLaunch(await api.desktop.launchShortcut(result.item.id), `已打开 ${result.item.name}`);
  else if (result.kind === 'app') await afterLaunch(await api.apps.launch(result.item.id), `已启动 ${result.item.name}`);
  else await afterLaunch(await api.files.open(result.item.id), `已打开 ${result.item.name}`);
}

async function saveCategory(categoryId) {
  const form = dialog.querySelector('#categoryForm'); if (!form?.reportValidity()) return;
  const data = new FormData(form); const payload = { name: data.get('name'), icon: data.get('icon'), color: data.get('color') };
  const result = categoryId ? await api?.categories?.update?.({ id: categoryId, ...payload }) : await api?.categories?.create?.(payload);
  if (api?.isElectron && !result?.success) return showToast(result?.error || '分类保存失败', 'error');
  closeDialog(); await loadData(); showToast(categoryId ? '分类已更新' : '分类已创建');
}

async function saveAssignment(categoryId) {
  const category = state.categories.find((item) => item.id === categoryId); const fallback = state.categories.find((item) => item.id === 'other');
  if (!category || !fallback) return;
  const selected = new Set([...dialog.querySelectorAll('[data-assign-app]:checked')].map((item) => item.dataset.assignApp)); const operations = [];
  for (const item of state.apps) {
    if (selected.has(item.id) && item.category !== category.name) operations.push(api.apps.setCategory(item.id, category.id));
    if (!selected.has(item.id) && item.category === category.name) operations.push(api.apps.setCategory(item.id, fallback.id));
  }
  const results = await Promise.all(operations);
  if (results.some((result) => !result?.success)) return showToast('部分应用分类保存失败，请重试', 'error');
  closeDialog(); await loadData(); showToast(`“${category.name}”分类已更新`);
}

async function handleAction(action, element) {
  const categoryId = element?.dataset.categoryId;
  if (action === 'hide-dock') return api?.window?.hide?.();
  if (action === 'refresh-all') { await loadData({ rescan: true }); return showToast('桌面数据已刷新'); }
  if (action === 'refresh-weather') return loadWeather(true);
  if (action === 'refresh-files') return runBusy(() => api.files.rescan(), (result) => `文件索引已刷新：${result.total} 个`, '文件索引刷新失败');
  if (action === 'new-category') return openCategoryEditor();
  if (action === 'edit-category') { closeDialog(); return openCategoryEditor(categoryId); }
  if (action === 'category-menu') return openCategoryMenu(categoryId);
  if (action === 'assign-category') { closeDialog(); return openAssignment(categoryId); }
  if (action === 'save-category') return saveCategory(categoryId || null);
  if (action === 'save-assignment') return saveAssignment(categoryId);
  if (action === 'delete-category') {
    const category = state.categories.find((item) => item.id === categoryId); if (!category) return;
    return openDialog(dialogShell('删除分类', `“${category.name}”中的应用将移回“其他”，应用本身不会被删除。`, '', `<button data-action="close-dialog">取消</button><button class="primary danger-button" data-action="confirm-delete-category" data-category-id="${escapeHtml(categoryId)}">确认删除</button>`));
  }
  if (action === 'confirm-delete-category') { const result = await api?.categories?.delete?.(categoryId); if (api?.isElectron && !result?.success) return showToast(result?.error || '分类删除失败', 'error'); closeDialog(); await loadData(); return showToast('分类已删除'); }
  if (action === 'desktop-tools') return openDesktopTools();
  if (action === 'stow-shortcuts') { closeDialog(); return runBusy(() => api.desktop.stowShortcuts(), (result) => `已收纳 ${result.stowed} 个快捷方式`, '快捷方式收纳失败'); }
  if (action === 'restore-shortcuts') { closeDialog(); return runBusy(() => api.desktop.restoreShortcuts(), (result) => `已恢复 ${result.restored} 个快捷方式`, '快捷方式恢复失败'); }
  if (action === 'organize-files') { closeDialog(); return runBusy(() => api.desktop.organize(), (result) => `已整理 ${result.organized} 个文件`, '文件整理失败'); }
  if (action === 'restore-files') { closeDialog(); return runBusy(() => api.desktop.restoreLast(), (result) => `已恢复 ${result.restored} 个文件`, '没有可用的还原点'); }
  if (action === 'add-root') { const result = await api?.files?.addRoot?.(); if (result?.success) { await loadData(); showToast('文件夹组件已添加'); } return; }
  if (action === 'open-settings') return openSettings();
  if (action === 'save-settings') {
    const form = dialog.querySelector('#weatherForm'); if (!form?.reportValidity()) return;
    const city = new FormData(form).get('weatherCity').trim(); const changed = city !== state.settings.weatherCity; const result = await saveSetting('weatherCity', city);
    if (!result?.success) return; closeDialog(); if (changed) await loadWeather(true); return showToast('设置已应用');
  }
  if (action === 'cycle-theme') { const values = ['dark', 'light', 'system']; await saveSetting('theme', values[(values.indexOf(state.settings.theme) + 1) % values.length]); return openSettings(); }
  if (action === 'export-config') { const result = await api?.settings?.export?.(); if (result?.success) showToast('配置已导出'); return; }
  if (action === 'import-config') { const result = await api?.settings?.import?.(); if (result?.success) { closeDialog(); await loadData(); showToast('配置已导入'); } return; }
  if (action === 'quit-app') return openDialog(dialogShell('退出桌面舱', '退出后组件栏和全局快捷键会停止工作。', '', '<button data-action="close-dialog">取消</button><button class="primary danger-button" data-action="confirm-quit">确认退出</button>'));
  if (action === 'confirm-quit') return api?.window?.quit?.();
  if (action === 'close-dialog') return closeDialog();
}

document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]'); if (action) { void handleAction(action.dataset.action, action); return; }
  const setting = event.target.closest('[data-setting]');
  if (setting) { const enabled = setting.getAttribute('aria-checked') !== 'true'; setting.setAttribute('aria-checked', String(enabled)); setting.classList.toggle('on', enabled); void saveSetting(setting.dataset.setting, enabled); return; }
  const media = event.target.closest('[data-media]'); if (media) { void api?.media?.control?.(media.dataset.media).then((result) => showToast(result?.success ? '已发送系统媒体指令' : (result?.error || '媒体控制失败'), result?.success ? 'success' : 'error')); return; }
  const shortcut = event.target.closest('[data-shortcut]'); if (shortcut) { const item = state.shortcuts.find((entry) => entry.id === shortcut.dataset.shortcut); if (item && api?.desktop) void api.desktop.launchShortcut(item.id).then((result) => afterLaunch(result, `已打开 ${item.name}`)); else if (item) showToast(`网页预览：${item.name}`); return; }
  const appButton = event.target.closest('[data-app]'); if (appButton) { const item = state.apps.find((entry) => entry.id === appButton.dataset.app); if (item && api?.apps) void api.apps.launch(item.id).then((result) => afterLaunch(result, `已启动 ${item.name}`)); else if (item) showToast(`网页预览：${item.name}`); return; }
  const fileButton = event.target.closest('[data-file]'); if (fileButton) { const item = state.files.find((entry) => entry.id === fileButton.dataset.file); if (item && api?.files) void api.files.open(item.id).then((result) => afterLaunch(result, `已打开 ${item.name}`)); else if (item) showToast(`网页预览：${item.name}`); return; }
  const rootButton = event.target.closest('[data-root]'); if (rootButton) { void api?.files?.openRoot?.(rootButton.dataset.root); return; }
  const searchResult = event.target.closest('[data-search-index]'); if (searchResult) { void openSearchResult(Number(searchResult.dataset.searchIndex)); return; }
  if (!event.target.closest('.dock-search-results')) dockSearchResults.hidden = true;
});

dockSearch.addEventListener('input', () => { clearTimeout(searchTimer); state.searchIndex = 0; searchTimer = setTimeout(() => void search(dockSearch.value), 120); });
dockSearch.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { dockSearch.value = ''; dockSearchResults.hidden = true; return; }
  if (!state.searchResults.length) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); state.searchIndex = (state.searchIndex + (event.key === 'ArrowDown' ? 1 : -1) + state.searchResults.length) % state.searchResults.length; renderSearchResults(state.searchResults); }
  if (event.key === 'Enter') { event.preventDefault(); void openSearchResult(state.searchIndex); }
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !dialogLayer.hidden) closeDialog(); if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); dockSearch.focus(); } });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (state.settings.theme === 'system') applyTheme('system'); });
setInterval(updateClock, 30_000);
applyTheme(state.settings.theme); render(); void loadData();
api?.onShowSearch?.(() => { dockSearch.focus(); dockSearch.select(); });
api?.index?.onUpdated?.(() => void loadData());
api?.files?.onUpdated?.(() => void loadData());
api?.settings?.onChanged?.((settings) => { state.settings = { ...state.settings, ...settings }; applyTheme(state.settings.theme); render(); });
