const api = window.desktopDock;
const isElectron = Boolean(api?.isElectron);
document.body.classList.toggle('is-electron', isElectron);

const content = document.querySelector('#dockContent');
const status = document.querySelector('#dockStatus');
const clock = document.querySelector('#dockClock');
const nav = document.querySelector('#dockNav');
const search = document.querySelector('#dockSearch');
const dialogLayer = document.querySelector('#dockDialogLayer');
const dialog = document.querySelector('#dockDialog');
const toast = document.querySelector('#dockToast');

const ICONS = Object.freeze({
  add: '&#xE710;', more: '&#xE712;', edit: '&#xE70F;', trash: '&#xE74D;', folder: '&#xE8B7;',
  warehouse: '&#xE7B8;', move: '&#xE8DE;', refresh: '&#xE72C;', check: '&#xE73E;', calendar: '&#xE787;',
  attach: '&#xE723;', play: '&#xE768;', pause: '&#xE769;', previous: '&#xE892;', next: '&#xE893;',
  volume: '&#xE767;', search: '&#xE721;', grid: '&#xF0E2;', list: '&#xEA37;', open: '&#xE8A7;', reveal: '&#xE838;',
  sun: '&#xE706;', cloud: '&#xE753;', rain: '&#xE9C4;', settings: '&#xE713;', info: '&#xE946;', close: '&#xE711;',
});
const COLORS = ['#1677ff', '#00a870', '#d97706', '#d84a4a', '#7c5ce7', '#168aad', '#697386', '#c2417d'];
const TODO_COLORS = ['blue', 'green', 'amber', 'red', 'purple', 'teal', 'slate', 'pink'];
const WEATHER_LABELS = { 0: '晴', 1: '大部晴朗', 2: '多云', 3: '阴', 45: '有雾', 48: '冻雾', 51: '毛毛雨', 53: '毛毛雨', 55: '较强毛毛雨', 61: '小雨', 63: '中雨', 65: '大雨', 71: '小雪', 73: '中雪', 75: '大雪', 80: '阵雨', 81: '阵雨', 82: '强阵雨', 95: '雷雨' };

const state = {
  page: 'desktop', query: '', loading: true,
  todoBatch: false, todoSelected: new Set(),
  board: { shortcuts: [], categories: [] }, todos: [], files: [], roots: [], fileRootId: null, fileSort: 'modified',
  weather: null, weatherError: null, media: { available: false },
  settings: { theme: 'dark', autoStowShortcuts: true, fileLayout: 'grid', weatherLayout: 'standard', showTodo: true, showWeather: true, showMedia: true, showFiles: true },
};

const esc = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const icon = (glyph) => `<span class="fluent-icon" aria-hidden="true">${glyph}</span>`;
const formatDate = (value) => value ? new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '';
const formatSize = (bytes = 0) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
const resultOk = (result) => !isElectron || result?.success !== false;

let toastTimer;
function showToast(message, tone = 'success') {
  toast.textContent = message;
  toast.className = `dock-toast visible ${tone}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'dock-toast'; }, 2600);
}

function openDialog(title, description, body, footer = '') {
  dialog.innerHTML = `<header class="dialog-header"><div><h2 id="dockDialogTitle">${esc(title)}</h2>${description ? `<p>${esc(description)}</p>` : ''}</div><button data-action="close-dialog" aria-label="关闭">${icon(ICONS.close)}</button></header><div class="dialog-body">${body}</div>${footer ? `<footer class="dialog-footer">${footer}</footer>` : ''}`;
  dialogLayer.hidden = false;
  document.querySelector('#desktopApp').inert = true;
  setTimeout(() => dialog.querySelector('input, button, select, textarea')?.focus(), 20);
}

function closeDialog() {
  dialogLayer.hidden = true;
  dialog.innerHTML = '';
  document.querySelector('#desktopApp').inert = false;
}

function updateClock() {
  const now = new Date();
  clock.textContent = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  clock.dateTime = now.toISOString();
}

function shortcutTile(item) {
  return `<div class="shortcut-tile" draggable="true" tabindex="0" data-shortcut="${esc(item.id)}" title="双击打开 ${esc(item.name)}">
    <span class="shortcut-icon" data-shortcut-icon="${esc(item.id)}">${icon(ICONS.folder)}</span>
    <span class="shortcut-name">${esc(item.name)}</span>
    <button type="button" data-action="move-shortcut" data-shortcut-id="${esc(item.id)}" aria-label="移动 ${esc(item.name)} 到分类">${icon(ICONS.more)}</button>
  </div>`;
}

function emptyDrop(message) {
  return `<div class="drop-empty">${icon(ICONS.move)}<b>${esc(message)}</b><span>拖入桌面快捷方式，或使用右上角按钮</span></div>`;
}

function boardSection(category = null) {
  const categoryId = category?.id || '';
  const items = state.board.shortcuts.filter((item) => (item.categoryId || '') === categoryId && item.name.toLocaleLowerCase('zh-CN').includes(state.query));
  const title = category?.name || '桌面仓';
  const tools = category
    ? `<button data-action="edit-category" data-category-id="${esc(category.id)}" title="编辑分类">${icon(ICONS.edit)}</button><button data-action="delete-category" data-category-id="${esc(category.id)}" title="删除分类">${icon(ICONS.trash)}</button>`
    : `<button data-action="import-shortcuts" title="选择快捷方式">${icon(ICONS.add)}</button>`;
  return `<section class="board-section ${category ? '' : 'warehouse'}" data-drop-category="${esc(categoryId)}" style="--group-color:${esc(category?.color || '#1677ff')}">
    <header><div><span class="group-mark">${icon(category ? ICONS.folder : ICONS.warehouse)}</span><span><h2>${esc(title)}</h2><small>${items.length} 个快捷方式</small></span></div><div class="section-actions">${tools}</div></header>
    ${items.length ? `<div class="shortcut-grid">${items.map(shortcutTile).join('')}</div>` : emptyDrop(category ? `把快捷方式拖到“${title}”` : '桌面仓是所有快捷方式的入口')}
  </section>`;
}

function renderDesktop() {
  const managed = state.board.shortcuts.filter((item) => item.location !== 'public').length;
  const publicCount = state.board.shortcuts.filter((item) => item.location === 'public').length;
  content.innerHTML = `<div class="page-head"><div><h1>桌面</h1><p>${managed} 个已收纳${publicCount ? ` · ${publicCount} 个公共桌面只读` : ''}</p></div><button class="primary-button" data-action="new-category">${icon(ICONS.add)}新建分类</button></div>
    <div class="desktop-note">${icon(ICONS.info)}<span><b>只在桌面右侧显示</b><small>窗口不置顶，打开其他软件后会自然被覆盖。系统图标不会被移动。</small></span></div>
    ${boardSection()}
    <div class="category-heading"><h2>我的分类</h2><span>拖入即可归类</span></div>
    <div class="category-stack">${state.board.categories.length ? state.board.categories.map(boardSection).join('') : `<button class="create-empty" data-action="new-category">${icon(ICONS.add)}<span><b>创建第一个分类</b><small>分类由你决定，随时可以改名或删除</small></span></button>`}</div>`;
  hydrateShortcutIcons();
}

function todoItem(item) {
  const selected = state.todoSelected.has(item.id);
  return `<article class="todo-item ${item.completed ? 'completed' : ''} ${selected ? 'selected' : ''}" draggable="true" data-todo-id="${esc(item.id)}" data-color="${esc(item.color)}">
    <button class="todo-check" data-action="${state.todoBatch ? 'select-todo' : 'toggle-todo'}" data-todo-id="${esc(item.id)}" aria-label="${state.todoBatch ? '选择' : (item.completed ? '恢复' : '完成')} ${esc(item.title)}">${(state.todoBatch ? selected : item.completed) ? icon(ICONS.check) : ''}</button>
    <button class="todo-copy" data-action="edit-todo" data-todo-id="${esc(item.id)}"><b>${esc(item.title)}</b><span>${item.dueAt ? `${icon(ICONS.calendar)} ${formatDate(item.dueAt)}` : '无截止日期'}${item.recurrence !== 'none' ? ` · ${esc({ daily: '每天', weekly: '每周', monthly: '每月' }[item.recurrence])}` : ''}${item.attachments.length ? ` · ${item.attachments.length} 个附件` : ''}</span></button>
    <button class="icon-button" data-action="delete-todo" data-todo-id="${esc(item.id)}" aria-label="删除任务">${icon(ICONS.trash)}</button>
  </article>`;
}

function renderTodo() {
  const filtered = state.todos.filter((item) => item.title.toLocaleLowerCase('zh-CN').includes(state.query));
  const open = filtered.filter((item) => !item.completed);
  const done = filtered.filter((item) => item.completed);
  content.innerHTML = `<div class="page-head"><div><h1>待办</h1><p>${open.length} 项待处理</p></div><button class="primary-button" data-action="new-todo">${icon(ICONS.add)}添加任务</button></div>
    <div class="todo-filter"><button class="active">全部 ${filtered.length}</button><div>${state.todoBatch ? `<button data-action="bulk-complete">完成所选</button><button data-action="bulk-delete">删除所选</button>` : '<span>拖动任务可调整顺序</span>'}<button data-action="toggle-todo-batch">${state.todoBatch ? '退出批量' : '批量'}</button></div></div>
    <div class="todo-list">${open.map(todoItem).join('') || `<div class="calm-empty">${icon(ICONS.check)}<b>当前没有待办</b><span>今天的桌面很干净</span></div>`}${done.length ? `<h2 class="subheading">已完成 ${done.length}</h2>${done.map(todoItem).join('')}` : ''}</div>`;
}

function fileItem(item) {
  const extension = item.extension?.replace('.', '').toUpperCase() || 'FILE';
  return `<article class="file-item" data-file-id="${esc(item.id)}"><button class="file-main" data-action="open-file" data-file-id="${esc(item.id)}"><span class="file-type" data-file-thumbnail="${esc(item.id)}">${esc(extension.slice(0, 4))}</span><span><b>${esc(item.name)}</b><small>${formatSize(item.size)} · ${formatDate(item.modifiedAt)}</small></span></button><button class="icon-button" data-action="file-menu" data-file-id="${esc(item.id)}" aria-label="文件操作">${icon(ICONS.more)}</button></article>`;
}

function renderFiles() {
  const activeRoot = state.roots.find((item) => item.id === state.fileRootId) || state.roots[0];
  const filtered = state.files.filter((item) => !state.query || item.name.toLocaleLowerCase('zh-CN').includes(state.query)).sort((left, right) => state.fileSort === 'name' ? left.name.localeCompare(right.name, 'zh-CN') : state.fileSort === 'size' ? right.size - left.size : String(right.modifiedAt).localeCompare(String(left.modifiedAt)));
  content.innerHTML = `<div class="page-head"><div><h1>文件</h1><p>本地索引与收藏目录</p></div><button class="primary-button" data-action="add-root">${icon(ICONS.add)}收藏目录</button></div>
    <div class="file-toolbar"><div class="root-tabs">${state.roots.map((root) => `<button class="${root.id === activeRoot?.id ? 'active' : ''}" data-action="select-root" data-root-id="${esc(root.id)}">${esc(root.name)}</button>`).join('')}</div><div class="file-tools"><button class="select-button" data-action="cycle-file-sort">${esc({ modified: '最近', name: '名称', size: '大小' }[state.fileSort])}</button><button class="icon-button" data-action="toggle-file-layout" title="切换布局">${icon(state.settings.fileLayout === 'grid' ? ICONS.list : ICONS.grid)}</button></div></div>
    <section class="file-drop" data-file-drop="${esc(activeRoot?.id || '')}">${icon(ICONS.move)}<span><b>拖入文件到 ${esc(activeRoot?.name || '收藏目录')}</b><small>原文件保留，这里创建一份副本</small></span></section>
    <div class="file-collection ${state.settings.fileLayout}">${filtered.map(fileItem).join('') || `<div class="calm-empty">${icon(ICONS.folder)}<b>暂无最近文件</b><span>刷新索引或收藏一个目录</span></div>`}</div>`;
  hydrateFileThumbnails();
}

function weatherGlyph(code) { return Number(code) >= 51 ? ICONS.rain : Number(code) >= 2 ? ICONS.cloud : ICONS.sun; }
function renderWeather() {
  if (state.weatherError) return `<section class="feature-panel"><div class="calm-empty">${icon(ICONS.cloud)}<b>${esc(state.weatherError)}</b><button data-action="refresh-weather">重试</button></div></section>`;
  if (!state.weather) return `<section class="feature-panel loading-line">正在获取天气…</section>`;
  const current = state.weather.current;
  const daily = state.weather.daily || [];
  return `<section class="feature-panel weather-panel layout-${esc(state.settings.weatherLayout)} condition-${Number(current.weatherCode) >= 51 ? 'rain' : Number(current.weatherCode) >= 2 ? 'cloud' : 'sun'}">
    <header class="feature-header"><div><h2>${esc(state.weather.locationName || state.weather.city)}</h2><small>${esc(WEATHER_LABELS[current.weatherCode] || '天气')}</small></div><div><button class="icon-button" data-action="locate-weather" title="使用当前位置">${icon(ICONS.move)}</button><button class="icon-button" data-action="refresh-weather">${icon(ICONS.refresh)}</button></div></header>
    <div class="weather-now">${icon(weatherGlyph(current.weatherCode))}<strong>${Math.round(current.temperature)}°</strong><span>体感 ${Math.round(current.apparentTemperature)}°</span></div>
    <div class="weather-facts"><span><b>${current.relativeHumidity}%</b>湿度</span><span><b>${Math.round(current.windSpeed || 0)} km/h</b>风速</span><span><b>${Math.round(current.pressure || 0)} hPa</b>气压</span><span><b>${current.precipitationProbability || 0}%</b>降水</span></div>
    <div class="hourly-row">${(state.weather.hourly || []).map((hour) => `<span><time>${new Date(hour.time).getHours()}:00</time>${icon(weatherGlyph(hour.weatherCode))}<b>${Math.round(hour.temperature)}°</b></span>`).join('')}</div>
    ${daily.length ? `<div class="week-list">${daily.map((day, index) => `<span><time>${index === 0 ? '今天' : new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(new Date(day.time))}</time>${icon(weatherGlyph(day.weatherCode))}<b>${Math.round(day.temperatureMin)}° / ${Math.round(day.temperatureMax)}°</b><small>${day.precipitationProbability || 0}%</small></span>`).join('')}</div>` : ''}
  </section>`;
}

function renderMedia() {
  const media = state.media;
  return `<section class="feature-panel media-panel"><header class="feature-header"><div><h2>系统媒体</h2><small>${media.available ? '已连接 Windows 媒体会话' : '等待播放器'}</small></div><button class="icon-button" data-action="refresh-media">${icon(ICONS.refresh)}</button></header>
    <div class="media-art"><span></span></div><div class="media-title"><b>${esc(media.title || '打开任意音乐或视频应用')}</b><span>${esc(media.artist || '支持系统媒体快捷键')}</span></div>
    ${media.duration ? `<div class="media-progress"><span style="width:${Math.min(100, Math.round((media.position || 0) / media.duration * 100))}%"></span></div>` : ''}
    <div class="media-controls"><button data-media="previous" aria-label="上一首">${icon(ICONS.previous)}</button><button data-media="playPause" class="play" aria-label="播放或暂停">${icon(media.status === 'Playing' ? ICONS.pause : ICONS.play)}</button><button data-media="next" aria-label="下一首">${icon(ICONS.next)}</button><button data-media="volumeDown" aria-label="降低音量">${icon(ICONS.volume)}−</button><button data-media="volumeUp" aria-label="提高音量">${icon(ICONS.volume)}＋</button></div>
  </section>`;
}

function renderWidgets() {
  content.innerHTML = `<div class="page-head"><div><h1>组件</h1><p>桌面上的即时信息</p></div></div>${state.settings.showWeather ? renderWeather() : ''}${state.settings.showMedia ? renderMedia() : ''}${!state.settings.showWeather && !state.settings.showMedia ? `<div class="calm-empty">${icon(ICONS.settings)}<b>组件已关闭</b><span>可在设置中重新开启</span></div>` : ''}`;
}

function toggleRow(key, title, detail) {
  return `<div class="setting-row"><span><b>${esc(title)}</b><small>${esc(detail)}</small></span><button class="switch ${state.settings[key] ? 'on' : ''}" role="switch" aria-checked="${Boolean(state.settings[key])}" data-action="toggle-setting" data-setting="${esc(key)}"><i></i></button></div>`;
}

function renderSettings() {
  content.innerHTML = `<div class="page-head"><div><h1>设置</h1><p>按使用场景重新分组</p></div></div>
    <section class="settings-section"><h2>常规</h2>${toggleRow('autoStart', '开机自动启动', '便携 EXE 随 Windows 启动')}${toggleRow('autoStowShortcuts', '自动收纳桌面快捷方式', '仅移动当前用户桌面的快捷方式')}</section>
    <section class="settings-section"><h2>外观</h2><div class="setting-row"><span><b>主题</b><small>跟随系统、浅色或深色</small></span><button class="select-button" data-action="cycle-theme">${esc({ dark: '深色', light: '浅色', system: '跟随系统' }[state.settings.theme] || '跟随系统')}</button></div></section>
    <section class="settings-section"><h2>文件格子</h2><div class="setting-row"><span><b>默认布局</b><small>图标视图或列表视图</small></span><button class="select-button" data-action="toggle-file-layout">${state.settings.fileLayout === 'grid' ? '图标' : '列表'}</button></div>${toggleRow('showFiles', '启用文件模块', '显示本地收藏目录与最近文件')}</section>
    <section class="settings-section"><h2>功能格子</h2>${toggleRow('showTodo', '待办', '任务、截止时间、提醒、重复与附件')}${toggleRow('showWeather', '天气', '逐小时与 7 天天气')}<div class="setting-row"><span><b>天气城市</b><small>手动输入城市，或在天气页使用定位</small></span><form id="weatherCityForm" class="inline-setting"><input name="city" value="${esc(state.settings.weatherCity)}" maxlength="80"><button type="button" data-action="save-weather-city">保存</button></form></div><div class="setting-row"><span><b>天气布局</b><small>标准、紧凑、逐小时或周预报</small></span><button class="select-button" data-action="cycle-weather-layout">${esc({ standard: '标准', compact: '紧凑', hourly: '逐小时', week: '周预报' }[state.settings.weatherLayout])}</button></div>${toggleRow('showMedia', '媒体控制', '控制当前 Windows 媒体会话')}</section>
    <section class="settings-actions"><button data-action="export-settings">导出配置</button><button data-action="import-settings">导入配置</button><button class="danger" data-action="quit">退出桌面舱</button></section>`;
}

function render() {
  nav?.querySelectorAll('[data-nav]').forEach((button) => button.classList.toggle('active', button.dataset.nav === state.page));
  search.placeholder = ({ desktop: '搜索快捷方式', todo: '搜索任务', files: '搜索文件', widgets: '搜索组件', settings: '搜索设置' })[state.page];
  if (state.loading) { content.innerHTML = `<div class="loading-page"><i></i><b>正在整理你的桌面</b></div>`; return; }
  ({ desktop: renderDesktop, todo: renderTodo, files: renderFiles, widgets: renderWidgets, settings: renderSettings }[state.page] || renderDesktop)();
}

async function hydrateShortcutIcons() {
  if (!api?.desktop?.shortcutIcon) return;
  const nodes = [...document.querySelectorAll('[data-shortcut-icon]')];
  await Promise.all(nodes.map(async (node) => {
    const source = await api.desktop.shortcutIcon(node.dataset.shortcutIcon).catch(() => null);
    if (source && node.isConnected) node.innerHTML = `<img alt="" src="${source}">`;
  }));
}

async function hydrateFileThumbnails() {
  if (!api?.files?.thumbnail) return;
  const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']);
  const nodes = [...document.querySelectorAll('[data-file-thumbnail]')].filter((node) => imageExtensions.has(state.files.find((item) => item.id === node.dataset.fileThumbnail)?.extension));
  await Promise.all(nodes.map(async (node) => {
    const source = await api.files.thumbnail(node.dataset.fileThumbnail).catch(() => null);
    if (source && node.isConnected) { node.classList.add('has-thumbnail'); node.innerHTML = `<img alt="" src="${source}">`; }
  }));
}

async function loadBoard() {
  if (api?.board) state.board = await api.board.get();
  else state.board = { categories: [{ id: 'demo', name: '工作', color: '#1677ff', count: 2 }], shortcuts: [{ id: 'shortcut_11111111111111111111', name: '浏览器', location: 'stowed', categoryId: 'demo' }, { id: 'shortcut_22222222222222222222', name: '设计工具', location: 'stowed', categoryId: 'demo' }, { id: 'shortcut_33333333333333333333', name: '新快捷方式', location: 'stowed', categoryId: null }] };
}

async function loadFiles() {
  if (!api?.files) { state.roots = [{ id: 'desktop', name: '桌面' }, { id: 'documents', name: '文档' }]; state.files = []; return; }
  [state.roots, state.files] = await Promise.all([api.files.roots(), api.files.list(80)]);
  state.fileRootId ||= state.roots[0]?.id || null;
}

async function loadWeather(force = false) {
  if (!api?.weather) return;
  try { state.weatherError = null; state.weather = await api.weather.get(state.settings.weatherCity, force); }
  catch (error) { state.weatherError = error.message || '天气读取失败'; }
  if (state.page === 'widgets') render();
}

async function loadMedia() {
  if (!api?.media?.status) return;
  state.media = await api.media.status().catch(() => ({ available: false }));
  if (state.page === 'widgets') render();
}

async function loadAll() {
  state.loading = true; render();
  try {
    const settingsPromise = api?.settings?.get?.() || Promise.resolve(state.settings);
    const [settings] = await Promise.all([settingsPromise, loadBoard(), loadFiles(), api?.todo?.list?.().then((items) => { state.todos = items; })]);
    state.settings = { ...state.settings, ...settings };
    document.documentElement.dataset.theme = state.settings.theme;
    status.textContent = '桌面层已就绪';
  } catch (error) { status.textContent = '读取失败'; showToast(error.message || '本地数据读取失败', 'error'); }
  state.loading = false; render();
  void loadWeather(); void loadMedia();
}

function categoryDialog(category = null) {
  const colors = COLORS.map((color) => `<label><input type="radio" name="color" value="${color}" ${(category?.color || COLORS[0]) === color ? 'checked' : ''}><span style="--swatch:${color}"></span></label>`).join('');
  openDialog(category ? '编辑分类' : '新建分类', '分类只用于你收纳的桌面快捷方式。', `<form id="categoryForm" class="dialog-form"><label>名称<input name="name" maxlength="20" required value="${esc(category?.name || '')}" placeholder="例如：工作"></label><fieldset><legend>识别色</legend><div class="color-options">${colors}</div></fieldset></form>`, `<button data-action="close-dialog">取消</button><button class="primary" data-action="save-category" data-category-id="${esc(category?.id || '')}">保存</button>`);
}

function moveShortcutDialog(shortcutId) {
  const item = state.board.shortcuts.find((entry) => entry.id === shortcutId);
  if (!item) return;
  const options = [{ id: '', name: '桌面仓', color: '#1677ff' }, ...state.board.categories];
  openDialog('移动到分类', `选择“${item.name}”的新位置。`, `<div class="move-list">${options.map((entry) => `<button data-action="assign-shortcut" data-shortcut-id="${esc(shortcutId)}" data-category-id="${esc(entry.id)}"><i style="--swatch:${esc(entry.color)}"></i><span>${esc(entry.name)}</span>${(item.categoryId || '') === entry.id ? icon(ICONS.check) : ''}</button>`).join('')}</div>`, `<button data-action="close-dialog">取消</button>`);
}

function todoDialog(item = null) {
  const colorOptions = TODO_COLORS.map((color) => `<label><input type="radio" name="color" value="${color}" ${(item?.color || 'blue') === color ? 'checked' : ''}><span class="todo-color ${color}"></span></label>`).join('');
  openDialog(item ? '编辑任务' : '添加任务', '把临时事项留在桌面，不必再发给自己。', `<form id="todoForm" class="dialog-form"><label>任务标题<input name="title" maxlength="120" required value="${esc(item?.title || '')}" placeholder="要处理什么？"></label><label>备注<textarea name="notes" maxlength="4000" rows="3" placeholder="补充细节">${esc(item?.notes || '')}</textarea></label><div class="form-pair"><label>截止时间<input type="datetime-local" name="dueAt" value="${item?.dueAt ? esc(item.dueAt.slice(0, 16)) : ''}"></label><label>提醒时间<input type="datetime-local" name="reminderAt" value="${item?.reminderAt ? esc(item.reminderAt.slice(0, 16)) : ''}"></label></div><label>重复<select name="recurrence"><option value="none">不重复</option><option value="daily" ${item?.recurrence === 'daily' ? 'selected' : ''}>每天</option><option value="weekly" ${item?.recurrence === 'weekly' ? 'selected' : ''}>每周</option><option value="monthly" ${item?.recurrence === 'monthly' ? 'selected' : ''}>每月</option></select></label><fieldset><legend>颜色标记</legend><div class="color-options">${colorOptions}</div></fieldset><input type="hidden" name="attachments" value="${esc(JSON.stringify(item?.attachments || []))}"><button type="button" class="attach-button" data-action="pick-attachments">${icon(ICONS.attach)} 选择附件 <span>${item?.attachments?.length || 0}</span></button></form>`, `<button data-action="close-dialog">取消</button><button class="primary" data-action="save-todo" data-todo-id="${esc(item?.id || '')}">保存</button>`);
}

async function saveSetting(key, value) {
  const previous = state.settings[key]; state.settings[key] = value;
  const result = await api?.settings?.set?.(key, value);
  if (!resultOk(result)) { state.settings[key] = previous; showToast(result.error || '设置保存失败', 'error'); }
  document.documentElement.dataset.theme = state.settings.theme;
  render();
}

async function assignShortcut(shortcutId, categoryId) {
  const result = await api?.board?.assign?.(shortcutId, categoryId || null);
  if (!resultOk(result)) return showToast(result.error || '归类失败', 'error');
  const item = state.board.shortcuts.find((entry) => entry.id === shortcutId); if (item) item.categoryId = categoryId || null;
  await loadBoard(); render(); showToast(categoryId ? '已移动到分类' : '已移回桌面仓');
}

async function droppedPaths(event) {
  const files = [...(event.dataTransfer?.files || [])];
  return files.map((file) => { try { return api?.files?.pathForFile?.(file) || file.path || ''; } catch { return ''; } }).filter(Boolean);
}

async function handleAction(button) {
  const action = button.dataset.action;
  if (action === 'hide') return api?.window?.hide?.();
  if (action === 'refresh') return loadAll();
  if (action === 'close-dialog') return closeDialog();
  if (action === 'new-category') return categoryDialog();
  if (action === 'edit-category') return categoryDialog(state.board.categories.find((item) => item.id === button.dataset.categoryId));
  if (action === 'save-category') {
    const form = dialog.querySelector('#categoryForm'); if (!form?.reportValidity()) return;
    const data = new FormData(form); const payload = { id: button.dataset.categoryId, name: data.get('name'), color: data.get('color') };
    const result = payload.id ? await api?.board?.updateCategory?.(payload) : await api?.board?.createCategory?.(payload);
    if (!resultOk(result)) return showToast(result.error || '分类保存失败', 'error');
    closeDialog(); await loadBoard(); render(); return showToast('分类已保存');
  }
  if (action === 'delete-category') {
    const category = state.board.categories.find((item) => item.id === button.dataset.categoryId); if (!category) return;
    return openDialog('删除分类', `“${category.name}”内的快捷方式会移回桌面仓，快捷方式本身不会删除。`, '', `<button data-action="close-dialog">取消</button><button class="primary danger" data-action="confirm-delete-category" data-category-id="${esc(category.id)}">删除分类</button>`);
  }
  if (action === 'confirm-delete-category') {
    const result = await api?.board?.deleteCategory?.(button.dataset.categoryId); if (!resultOk(result)) return showToast(result.error, 'error');
    closeDialog(); await loadBoard(); render(); return showToast('分类已删除');
  }
  if (action === 'move-shortcut') return moveShortcutDialog(button.dataset.shortcutId);
  if (action === 'assign-shortcut') { closeDialog(); return assignShortcut(button.dataset.shortcutId, button.dataset.categoryId || null); }
  if (action === 'import-shortcuts') { const result = await api?.board?.pick?.(null); if (result?.canceled) return; if (!resultOk(result)) return showToast(result?.error || '导入失败', 'error'); await loadBoard(); render(); return showToast(`已导入 ${result.imported?.length || 0} 个快捷方式`); }
  if (action === 'new-todo') return todoDialog();
  if (action === 'toggle-todo-batch') { state.todoBatch = !state.todoBatch; state.todoSelected.clear(); return render(); }
  if (action === 'select-todo') { state.todoSelected.has(button.dataset.todoId) ? state.todoSelected.delete(button.dataset.todoId) : state.todoSelected.add(button.dataset.todoId); return render(); }
  if (action === 'bulk-complete') { await Promise.all([...state.todoSelected].map((id) => { const item = state.todos.find((entry) => entry.id === id); return item ? api.todo.update({ id, title: item.title, completed: true }) : null; })); state.todos = await api.todo.list(); state.todoSelected.clear(); render(); return showToast('所选任务已完成'); }
  if (action === 'bulk-delete') { await Promise.all([...state.todoSelected].map((id) => api.todo.delete(id))); state.todos = await api.todo.list(); state.todoSelected.clear(); render(); return showToast('所选任务已删除'); }
  if (action === 'edit-todo') return todoDialog(state.todos.find((item) => item.id === button.dataset.todoId));
  if (action === 'pick-attachments') {
    const paths = await api?.todo?.pickAttachments?.() || []; const input = dialog.querySelector('[name="attachments"]');
    if (input) input.value = JSON.stringify(paths); button.querySelector('span').textContent = paths.length; return;
  }
  if (action === 'save-todo') {
    const form = dialog.querySelector('#todoForm'); if (!form?.reportValidity()) return;
    const data = new FormData(form); const payload = { id: button.dataset.todoId, title: data.get('title'), notes: data.get('notes'), dueAt: data.get('dueAt'), reminderAt: data.get('reminderAt'), recurrence: data.get('recurrence'), color: data.get('color'), attachments: JSON.parse(data.get('attachments') || '[]') };
    const result = payload.id ? await api?.todo?.update?.(payload) : await api?.todo?.create?.(payload); if (!resultOk(result)) return showToast(result.error, 'error');
    closeDialog(); state.todos = await api.todo.list(); render(); return showToast('任务已保存');
  }
  if (action === 'toggle-todo') { const item = state.todos.find((entry) => entry.id === button.dataset.todoId); if (!item) return; await api?.todo?.update?.({ id: item.id, title: item.title, completed: !item.completed }); state.todos = await api.todo.list(); return render(); }
  if (action === 'delete-todo') { await api?.todo?.delete?.(button.dataset.todoId); state.todos = await api.todo.list(); render(); return showToast('任务已删除'); }
  if (action === 'select-root') { state.fileRootId = button.dataset.rootId; return render(); }
  if (action === 'add-root') { const result = await api?.files?.addRoot?.(); if (resultOk(result)) { await loadFiles(); render(); } return; }
  if (action === 'open-file') return api?.files?.open?.(button.dataset.fileId);
  if (action === 'file-menu') {
    const item = state.files.find((entry) => entry.id === button.dataset.fileId); if (!item) return;
    return openDialog(item.name, '保留 Windows 原生文件操作习惯。', `<div class="action-list"><button data-action="open-file" data-file-id="${esc(item.id)}">${icon(ICONS.open)}打开</button><button data-action="reveal-file" data-file-id="${esc(item.id)}">${icon(ICONS.reveal)}在资源管理器中显示</button><button data-action="rename-file" data-file-id="${esc(item.id)}">${icon(ICONS.edit)}重命名</button><button class="danger" data-action="delete-file" data-file-id="${esc(item.id)}">${icon(ICONS.trash)}移到回收站</button></div>`, `<button data-action="close-dialog">关闭</button>`);
  }
  if (action === 'reveal-file') return api?.files?.reveal?.(button.dataset.fileId);
  if (action === 'rename-file') { const item = state.files.find((entry) => entry.id === button.dataset.fileId); return openDialog('重命名文件', '', `<form id="renameForm" class="dialog-form"><label>新文件名<input name="name" value="${esc(item?.name || '')}" required></label></form>`, `<button data-action="close-dialog">取消</button><button class="primary" data-action="save-file-name" data-file-id="${esc(button.dataset.fileId)}">保存</button>`); }
  if (action === 'save-file-name') { const form = dialog.querySelector('#renameForm'); if (!form.reportValidity()) return; const result = await api?.files?.rename?.(button.dataset.fileId, new FormData(form).get('name')); if (!resultOk(result)) return showToast(result.error, 'error'); closeDialog(); await loadFiles(); render(); return showToast('文件已重命名'); }
  if (action === 'delete-file') { const result = await api?.files?.delete?.(button.dataset.fileId); if (!resultOk(result)) return showToast(result.error, 'error'); closeDialog(); await loadFiles(); render(); return showToast('文件已移到回收站'); }
  if (action === 'toggle-file-layout') return saveSetting('fileLayout', state.settings.fileLayout === 'grid' ? 'list' : 'grid');
  if (action === 'cycle-file-sort') { const sorts = ['modified', 'name', 'size']; state.fileSort = sorts[(sorts.indexOf(state.fileSort) + 1) % sorts.length]; return render(); }
  if (action === 'refresh-weather') return loadWeather(true);
  if (action === 'locate-weather') {
    if (!navigator.geolocation) return showToast('系统未提供位置服务', 'error');
    showToast('正在读取当前位置…');
    return navigator.geolocation.getCurrentPosition(async (position) => { try { state.weather = await api.weather.getByCoordinates(position.coords.latitude, position.coords.longitude, true); state.weatherError = null; render(); showToast('已切换到当前位置'); } catch (error) { showToast(error.message || '定位天气失败', 'error'); } }, () => showToast('位置权限未开启，请在 Windows 设置中允许定位', 'error'), { timeout: 8000, maximumAge: 600000 });
  }
  if (action === 'save-weather-city') { const form = button.closest('form'); const city = new FormData(form).get('city').trim(); if (!city) return showToast('请输入城市', 'error'); await saveSetting('weatherCity', city); await loadWeather(true); return showToast('天气城市已更新'); }
  if (action === 'cycle-weather-layout') { const layouts = ['standard', 'compact', 'hourly', 'week']; return saveSetting('weatherLayout', layouts[(layouts.indexOf(state.settings.weatherLayout) + 1) % layouts.length]); }
  if (action === 'refresh-media') return loadMedia();
  if (action === 'toggle-setting') return saveSetting(button.dataset.setting, !state.settings[button.dataset.setting]);
  if (action === 'cycle-theme') { const values = ['dark', 'light', 'system']; return saveSetting('theme', values[(values.indexOf(state.settings.theme) + 1) % values.length]); }
  if (action === 'export-settings') { const result = await api?.settings?.export?.(); if (resultOk(result)) showToast('配置已导出'); return; }
  if (action === 'import-settings') { const result = await api?.settings?.import?.(); if (resultOk(result)) { await loadAll(); showToast('配置已导入'); } return; }
  if (action === 'quit') return api?.window?.quit?.();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]'); if (button) void handleAction(button);
  const media = event.target.closest('[data-media]'); if (media) void api?.media?.control?.(media.dataset.media).then(() => setTimeout(loadMedia, 350));
});

nav?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-nav]'); if (!button) return;
  if ((button.dataset.nav === 'todo' && !state.settings.showTodo) || (button.dataset.nav === 'files' && !state.settings.showFiles)) return showToast('该模块已在设置中关闭', 'error');
  state.page = button.dataset.nav; state.query = ''; search.value = ''; render();
  if (state.page === 'widgets') { void loadWeather(); void loadMedia(); }
});

search?.addEventListener('input', () => { state.query = search.value.trim().toLocaleLowerCase('zh-CN'); render(); });
document.addEventListener('dblclick', (event) => { const tile = event.target.closest('[data-shortcut]'); if (tile) void api?.desktop?.launchShortcut?.(tile.dataset.shortcut); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !dialogLayer.hidden) closeDialog();
  if (event.key === 'Enter' && event.target.matches('[data-shortcut]')) void api?.desktop?.launchShortcut?.(event.target.dataset.shortcut);
});

document.addEventListener('dragstart', (event) => {
  const shortcut = event.target.closest('[data-shortcut]');
  const todo = event.target.closest('[data-todo-id]');
  if (shortcut) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-desktopdock-shortcut', shortcut.dataset.shortcut); shortcut.classList.add('dragging'); }
  if (todo) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-desktopdock-todo', todo.dataset.todoId); todo.classList.add('dragging'); }
});
document.addEventListener('dragend', () => document.querySelectorAll('.dragging,.drop-active').forEach((node) => node.classList.remove('dragging', 'drop-active')));
document.addEventListener('dragover', (event) => {
  const target = event.target.closest('[data-drop-category],[data-file-drop],[data-todo-id]'); if (!target) return;
  event.preventDefault(); event.dataTransfer.dropEffect = event.dataTransfer.types.includes('Files') ? 'copy' : 'move'; target.classList.add('drop-active');
});
document.addEventListener('dragleave', (event) => event.target.closest('.drop-active')?.classList.remove('drop-active'));
document.addEventListener('drop', async (event) => {
  const category = event.target.closest('[data-drop-category]');
  const fileDrop = event.target.closest('[data-file-drop]');
  const todoTarget = event.target.closest('[data-todo-id]');
  if (!category && !fileDrop && !todoTarget) return;
  event.preventDefault(); document.querySelectorAll('.drop-active').forEach((node) => node.classList.remove('drop-active'));
  if (category) {
    const shortcutId = event.dataTransfer.getData('application/x-desktopdock-shortcut');
    if (shortcutId) return assignShortcut(shortcutId, category.dataset.dropCategory || null);
    const paths = await droppedPaths(event); if (!paths.length) return showToast('没有读取到可导入的快捷方式', 'error');
    const result = await api?.board?.import?.(paths, category.dataset.dropCategory || null); if (!resultOk(result)) return showToast(result.error || '导入失败', 'error');
    await loadBoard(); render(); return showToast(`已导入 ${result.imported?.length || 0} 个快捷方式${result.skipped?.length ? `，跳过 ${result.skipped.length} 个` : ''}`);
  }
  if (fileDrop) { const paths = await droppedPaths(event); const result = await api?.files?.import?.(fileDrop.dataset.fileDrop, paths); if (!resultOk(result)) return showToast(result.error, 'error'); await loadFiles(); render(); return showToast(`已复制 ${result.imported || 0} 个文件`); }
  if (todoTarget) {
    const sourceId = event.dataTransfer.getData('application/x-desktopdock-todo'); if (!sourceId || sourceId === todoTarget.dataset.todoId) return;
    const ids = state.todos.map((item) => item.id); const sourceIndex = ids.indexOf(sourceId); const targetIndex = ids.indexOf(todoTarget.dataset.todoId); ids.splice(targetIndex, 0, ids.splice(sourceIndex, 1)[0]); await api?.todo?.reorder?.(ids); state.todos = await api.todo.list(); render();
  }
});

api?.onShowSearch?.(() => { search.focus(); search.select(); });
api?.settings?.onChanged?.((settings) => { state.settings = { ...state.settings, ...settings }; render(); });
updateClock(); setInterval(updateClock, 30_000); void loadAll();
