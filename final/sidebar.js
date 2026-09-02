const api = window.desktopDock;
const isElectron = Boolean(api?.isElectron);
document.body.classList.toggle('is-electron', isElectron);

const content = document.querySelector('#dockContent');
const status = document.querySelector('#dockStatus');
const search = document.querySelector('#dockSearch');
const searchResults = document.querySelector('#searchResults');
const dialogLayer = document.querySelector('#dockDialogLayer');
const dialog = document.querySelector('#dockDialog');
const toast = document.querySelector('#dockToast');

const ICONS = Object.freeze({
  add: '&#xE710;', more: '&#xE712;', edit: '&#xE70F;', trash: '&#xE74D;', folder: '&#xE8B7;', warehouse: '&#xE7B8;',
  refresh: '&#xE72C;', check: '&#xE73E;', calendar: '&#xE787;', attach: '&#xE723;', play: '&#xE768;', pause: '&#xE769;',
  previous: '&#xE892;', next: '&#xE893;', volume: '&#xE767;', search: '&#xE721;', open: '&#xE8A7;', reveal: '&#xE838;',
  sun: '&#xE706;', cloud: '&#xE753;', rain: '&#xE9C4;', settings: '&#xE713;', close: '&#xE711;', clock: '&#xE823;',
  note: '&#xE70B;', todo: '&#xE73E;', collapse: '&#xE70D;', expand: '&#xE70E;', up: '&#xE74A;', down: '&#xE74B;', web: '&#xE774;'
});
const COLORS = ['#1677ff', '#00a870', '#d97706', '#d84a4a', '#7c5ce7', '#168aad', '#697386', '#c2417d'];
const TODO_COLORS = ['blue', 'green', 'amber', 'red', 'purple', 'teal', 'slate', 'pink'];
const NOTE_COLORS = ['mint', 'sand', 'rose', 'blue'];
const WEATHER_LABELS = { 0: '晴', 1: '大部晴朗', 2: '多云', 3: '阴', 45: '有雾', 48: '冻雾', 51: '毛毛雨', 53: '毛毛雨', 55: '较强毛毛雨', 61: '小雨', 63: '中雨', 65: '大雨', 71: '小雪', 73: '中雪', 75: '大雪', 80: '阵雨', 81: '阵雨', 82: '强阵雨', 95: '雷雨' };
const DEFAULT_ORDER = ['weather', 'todo', 'notes', 'files', 'clock', 'media', 'warehouse'];

const state = {
  loading: true, query: '', fileRootId: null,
  board: { shortcuts: [], categories: [] }, todos: [], files: [], roots: [], apps: [],
  weather: null, weatherError: null, media: { available: false },
  settings: { theme: 'system', autoStowShortcuts: true, showTodo: true, showWeather: true, showMedia: true, showFiles: true },
  notes: readStore('desktopdock.notes', []),
  cards: normalizeCards(readStore('desktopdock.cards', {})),
};

function readStore(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function normalizeCards(value) {
  return {
    order: Array.isArray(value?.order) ? value.order : [...DEFAULT_ORDER],
    hidden: Array.isArray(value?.hidden) ? value.hidden : [],
    collapsed: Array.isArray(value?.collapsed) ? value.collapsed : [],
    sizes: value?.sizes && typeof value.sizes === 'object' ? value.sizes : {},
    placements: {
      compact: value?.placements?.compact && typeof value.placements.compact === 'object' ? value.placements.compact : {},
      wide: value?.placements?.wide && typeof value.placements.wide === 'object' ? value.placements.wide : {},
    },
  };
}
function writeStore(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
const esc = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const icon = (glyph) => `<span class="fluent-icon" aria-hidden="true">${glyph}</span>`;
const resultOk = (result) => !isElectron || result?.success !== false;
const formatDate = (value) => value ? new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '';
const formatSize = (bytes = 0) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
const cardIdForCategory = (id) => `category:${id}`;
const isCollapsed = (id) => state.cards.collapsed.includes(id);
const isHidden = (id) => state.cards.hidden.includes(id);

let toastTimer;
let dialogOpener = null;
function showToast(message, tone = 'success') {
  toast.textContent = message; toast.className = `dock-toast visible ${tone}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.className = 'dock-toast'; }, 2200);
}

function openDialog(title, description, body, footer = '') {
  dialogOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.innerHTML = `<header class="dialog-header"><div><h2 id="dockDialogTitle">${esc(title)}</h2>${description ? `<p id="dockDialogDescription">${esc(description)}</p>` : '<p id="dockDialogDescription" class="sr-only">桌面舱对话框</p>'}</div><button data-action="close-dialog" aria-label="关闭">${icon(ICONS.close)}</button></header><div class="dialog-body">${body}</div>${footer ? `<footer class="dialog-footer">${footer}</footer>` : ''}`;
  dialogLayer.hidden = false; document.querySelector('#desktopApp').inert = true;
  setTimeout(() => dialog.querySelector('input, button, select, textarea')?.focus(), 20);
}
function closeDialog() {
  dialogLayer.hidden = true; dialog.innerHTML = ''; document.querySelector('#desktopApp').inert = false;
  const opener = dialogOpener; dialogOpener = null; setTimeout(() => opener?.isConnected && opener.focus(), 0);
}

function cardHeader(id, title, glyph, actions = '') {
  return `<header class="card-header" draggable="true" data-card-drag="${esc(id)}"><div class="card-title">${icon(glyph)}<h2>${esc(title)}</h2></div><div class="card-actions">${actions}<button data-action="card-toggle" data-card-id="${esc(id)}" aria-label="${isCollapsed(id) ? '展开' : '折叠'}${esc(title)}" aria-expanded="${!isCollapsed(id)}">${icon(isCollapsed(id) ? ICONS.expand : ICONS.collapse)}</button><button data-action="card-menu" data-card-id="${esc(id)}" aria-label="管理${esc(title)}">${icon(ICONS.more)}</button></div></header>`;
}
function card(id, title, glyph, body, actions = '', extra = '') {
  if (isHidden(id)) return '';
  const size = state.cards.sizes[id] || 'normal';
  return `<article class="bento-card size-${esc(size)} ${isCollapsed(id) ? 'is-collapsed' : ''} ${extra}" data-card-id="${esc(id)}">${cardHeader(id, title, glyph, actions)}<div class="card-body">${body}</div></article>`;
}

function weatherGlyph(code) { return Number(code) >= 51 ? ICONS.rain : Number(code) >= 2 ? ICONS.cloud : ICONS.sun; }
function weatherCard() {
  if (state.weatherError) return card('weather', '天气', ICONS.cloud, `<div class="empty-state"><b>${esc(state.weatherError)}</b><button data-action="refresh-weather">重试</button></div>`, `<button data-action="refresh-weather" aria-label="刷新天气">${icon(ICONS.refresh)}</button>`);
  if (!state.weather) return card('weather', '天气', ICONS.cloud, '<div class="skeleton-lines"><i></i><i></i><i></i></div>');
  const current = state.weather.current;
  const hourly = (state.weather.hourly || []).slice(0, 6);
  const body = `<div class="weather-main"><span class="weather-symbol">${icon(weatherGlyph(current.weatherCode))}</span><strong>${Math.round(current.temperature)}°</strong><span><b>${esc(WEATHER_LABELS[current.weatherCode] || '天气')}</b><small>体感 ${Math.round(current.apparentTemperature)}°</small></span></div>
    <div class="weather-facts"><span><small>湿度</small><b>${current.relativeHumidity}%</b></span><span><small>风力</small><b>${Math.round(current.windSpeed || 0)} km/h</b></span><span><small>降水</small><b>${current.precipitationProbability || 0}%</b></span></div>
    <div class="hourly-row">${hourly.map((hour) => `<span><time>${new Date(hour.time).getHours()}:00</time>${icon(weatherGlyph(hour.weatherCode))}<b>${Math.round(hour.temperature)}°</b></span>`).join('')}</div>`;
  return card('weather', state.weather.locationName || state.weather.city || '天气', ICONS.cloud, body, `<button data-action="locate-weather" aria-label="使用当前位置">${icon(ICONS.reveal)}</button><button data-action="refresh-weather" aria-label="刷新天气">${icon(ICONS.refresh)}</button>`, 'weather-card');
}

function clockCard() {
  const now = new Date();
  const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const date = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(now);
  return card('clock', '时间', ICONS.clock, `<div class="clock-block"><strong id="dockClock">${time}</strong><span>${date}</span></div>`, '', 'clock-card');
}

function mediaCard() {
  const media = state.media;
  const progress = media.duration ? Math.min(100, Math.round((media.position || 0) / media.duration * 100)) : 0;
  const body = `<div class="media-stage"><div class="record-art"><span></span></div><div class="media-copy"><b>${esc(media.title || '等待 Windows 媒体会话')}</b><span>${esc(media.artist || '打开播放器即可连接')}</span></div></div>
    <div class="media-progress" aria-label="播放进度"><span style="width:${progress}%"></span></div>
    <div class="media-controls"><button data-media="previous" aria-label="上一首">${icon(ICONS.previous)}</button><button data-media="playPause" class="play" aria-label="播放或暂停">${icon(media.status === 'Playing' ? ICONS.pause : ICONS.play)}</button><button data-media="next" aria-label="下一首">${icon(ICONS.next)}</button><button data-media="volumeDown" aria-label="降低音量">${icon(ICONS.volume)}−</button><button data-media="volumeUp" aria-label="提高音量">${icon(ICONS.volume)}＋</button></div>`;
  return card('media', '媒体', ICONS.play, body, `<button data-action="refresh-media" aria-label="刷新媒体">${icon(ICONS.refresh)}</button>`, 'media-card');
}

function todoRow(item) {
  return `<div class="todo-row ${item.completed ? 'completed' : ''}" data-color="${esc(item.color)}"><button class="todo-check" data-action="toggle-todo" data-todo-id="${esc(item.id)}" aria-label="${item.completed ? '恢复' : '完成'} ${esc(item.title)}">${item.completed ? icon(ICONS.check) : ''}</button><button class="todo-copy" data-action="edit-todo" data-todo-id="${esc(item.id)}"><b>${esc(item.title)}</b><small>${item.dueAt ? formatDate(item.dueAt) : '无截止日期'}</small></button><button data-action="favorite-todo" data-todo-id="${esc(item.id)}" class="star ${item.pinned ? 'active' : ''}" aria-label="${item.pinned ? '取消收藏' : '收藏'}">☆</button></div>`;
}
function todoCard() {
  const size = state.cards.sizes.todo || 'normal';
  const limit = size === 'compact' ? 2 : size === 'tall' ? 10 : 6;
  const items = state.todos.slice().sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))).slice(0, limit);
  const open = state.todos.filter((item) => !item.completed).length;
  const body = `<div class="segmented counters" aria-label="任务统计"><span>全部 ${state.todos.length}</span><span>今天 ${state.todos.filter((item) => item.dueAt && new Date(item.dueAt).toDateString() === new Date().toDateString()).length}</span><span>待办 ${open}</span></div><div class="todo-quick"><button data-action="new-todo">${icon(ICONS.add)} 添加任务</button></div><div class="todo-compact-list">${items.map(todoRow).join('') || '<div class="empty-state">今天没有待办</div>'}</div>`;
  return card('todo', '待办', ICONS.todo, body, `<button data-action="new-todo" aria-label="添加任务">${icon(ICONS.add)}</button>`, 'todo-card');
}

function notesCard() {
  const size = state.cards.sizes.notes || 'normal';
  const limit = size === 'compact' ? 2 : size === 'tall' ? 9 : 5;
  const notes = state.notes.slice(0, limit);
  const body = `<div class="note-tabs"><span>随记 ${state.notes.length}</span><span>固定 ${state.notes.filter((note) => note.pinned).length}</span><button data-action="focus-search" aria-label="搜索便签">${icon(ICONS.search)}</button></div><button class="note-add" data-action="new-note">${icon(ICONS.add)} 添加便签</button><div class="note-list">${notes.map((note) => `<button class="note-strip ${esc(note.color)}" data-action="edit-note" data-note-id="${esc(note.id)}"><b>${esc(note.title || '未命名便签')}</b><small>${esc(note.body || '点击继续编辑')}</small></button>`).join('') || '<div class="empty-state">把临时内容留在桌面</div>'}</div>`;
  return card('notes', '随记', ICONS.note, body, `<button data-action="new-note" aria-label="添加便签">${icon(ICONS.add)}</button>`, 'notes-card');
}

function shortcutTile(item) {
  return `<div class="shortcut-tile" draggable="true" tabindex="0" data-shortcut="${esc(item.id)}" title="双击打开 ${esc(item.name)}"><span class="shortcut-icon" data-shortcut-icon="${esc(item.id)}">${icon(ICONS.folder)}</span><span class="shortcut-name">${esc(item.name)}</span><button data-action="move-shortcut" data-shortcut-id="${esc(item.id)}" aria-label="移动 ${esc(item.name)}">${icon(ICONS.more)}</button></div>`;
}
function shortcutsCard(category = null) {
  const id = category ? cardIdForCategory(category.id) : 'warehouse';
  const categoryId = category?.id || '';
  const items = state.board.shortcuts.filter((item) => (item.categoryId || '') === categoryId);
  const title = category?.name || '桌面仓';
  const actions = category ? `<button data-action="edit-category" data-category-id="${esc(category.id)}" aria-label="重命名分类">${icon(ICONS.edit)}</button><button data-action="import-shortcuts" data-category-id="${esc(category.id)}" aria-label="添加快捷方式">${icon(ICONS.add)}</button>` : `<button data-action="new-category" aria-label="新建分类">${icon(ICONS.add)}</button>`;
  const limit = state.cards.sizes[id] === 'tall' ? 30 : state.cards.sizes[id] === 'compact' ? 6 : 12;
  const body = `<div class="shortcut-grid" data-drop-category="${esc(categoryId)}">${items.slice(0, limit).map(shortcutTile).join('') || `<button class="empty-state drop-target" data-action="import-shortcuts" data-category-id="${esc(categoryId)}">拖入快捷方式或点击添加</button>`}</div>${items.length > limit ? `<button class="manage-link" data-action="manage-category" data-category-id="${esc(categoryId)}">管理全部 ${items.length} 个</button>` : ''}`;
  return card(id, title, category ? ICONS.folder : ICONS.warehouse, body, actions, 'apps-card');
}

function shortcutManagerDialog(categoryId = '') {
  const items = state.board.shortcuts.filter((item) => (item.categoryId || '') === categoryId);
  const categoryOptions = [`<option value="">桌面仓</option>`, ...state.board.categories.map((entry) => `<option value="${esc(entry.id)}">${esc(entry.name)}</option>`)].join('');
  const rows = items.map((item) => `<div class="manager-row"><span class="manager-icon" data-shortcut-icon="${esc(item.id)}">${icon(ICONS.folder)}</span><span class="manager-copy"><b>${esc(item.name)}</b><small>${item.location === 'public' ? '公共桌面' : item.location === 'desktop' ? '当前桌面' : '已收纳'}</small></span><select data-action="assign-select" data-shortcut-id="${esc(item.id)}" data-manager-category="${esc(categoryId)}" aria-label="为 ${esc(item.name)} 选择分类">${categoryOptions.replace(`value="${esc(item.categoryId || '')}"`, `value="${esc(item.categoryId || '')}" selected`)}</select><button data-action="move-shortcut" data-shortcut-id="${esc(item.id)}" aria-label="移动 ${esc(item.name)}">${icon(ICONS.more)}</button></div>`).join('');
  const body = `<div class="manager-toolbar"><span class="manager-summary">共 ${items.length} 个快捷方式。选择分类后立即保存，也可以拖回桌面仓。</span><button data-action="new-category-from-manager">${icon(ICONS.add)} 新建分类</button></div><div class="manager-list">${rows || '<div class="empty-state">这个区域还没有快捷方式</div>'}</div>`;
  openDialog('管理全部快捷方式', '完整显示当前区域的快捷方式，并可逐项分配分类。', body, '<button data-action="close-dialog">完成</button>');
  void loadShortcutIcons();
}

function filesCard() {
  const roots = state.roots.slice(0, 5);
  const fileSize = state.cards.sizes.files || 'normal';
  const files = state.files.slice(0, fileSize === 'compact' ? 2 : fileSize === 'tall' ? 10 : 5);
  const body = `<div class="root-list">${roots.map((root) => `<button data-action="open-root" data-root-id="${esc(root.id)}">${icon(ICONS.folder)}<span>${esc(root.name)}</span></button>`).join('')}</div><div class="file-list">${files.map((item) => `<button data-action="open-file" data-file-id="${esc(item.id)}"><span class="file-type">${esc((item.extension || 'FILE').replace('.', '').slice(0, 4).toUpperCase())}</span><span><b>${esc(item.name)}</b><small>${formatSize(item.size)} · ${formatDate(item.modifiedAt)}</small></span></button>`).join('') || '<div class="empty-state">暂无最近文件</div>'}</div>`;
  return card('files', '文件', ICONS.folder, body, `<button data-action="add-root" aria-label="收藏目录">${icon(ICONS.add)}</button>`, 'files-card');
}

function visibleCardEntries() {
  const categoryEntries = state.board.categories.map((category) => ({ id: cardIdForCategory(category.id), html: () => shortcutsCard(category), kind: 'category' }));
  const staticEntries = [
    { id: 'weather', html: weatherCard, kind: 'weather' }, { id: 'todo', html: todoCard, kind: 'todo' },
    { id: 'notes', html: notesCard, kind: 'notes' }, { id: 'files', html: filesCard, kind: 'files' },
    { id: 'clock', html: clockCard, kind: 'clock' }, { id: 'media', html: mediaCard, kind: 'media' },
    { id: 'warehouse', html: () => shortcutsCard(), kind: 'warehouse' },
  ];
  const all = [...staticEntries, ...categoryEntries];
  const known = new Set(all.map((entry) => entry.id));
  state.cards.order = [...state.cards.order.filter((id) => known.has(id)), ...all.map((entry) => entry.id).filter((id) => !state.cards.order.includes(id))];
  return state.cards.order.map((id) => all.find((entry) => entry.id === id)).filter(Boolean).filter((entry) => !isHidden(entry.id));
}

function dashboardMode() { return window.innerWidth >= 520 ? 'wide' : 'compact'; }
function persistColumns(mode, columns) {
  const placements = {};
  columns.forEach((items, column) => items.forEach((entry, index) => { placements[entry.id] = { column, index }; }));
  state.cards.placements[mode] = placements;
  state.cards.order = columns.flat().map((entry) => entry.id);
  writeStore('desktopdock.cards', state.cards);
}
function arrangeDashboard() {
  const entries = visibleCardEntries();
  const mode = dashboardMode();
  const columnCount = mode === 'wide' ? 3 : 2;
  const columns = Array.from({ length: columnCount }, () => []);
  const preferred = mode === 'wide'
    ? { weather: 0, todo: 0, notes: 1, files: 1, clock: 2, media: 2, warehouse: 2 }
    : { weather: 0, warehouse: 0, files: 0, clock: 1, media: 1, todo: 1, notes: 1 };
  const placements = state.cards.placements[mode];
  entries.forEach((entry, fallbackIndex) => {
    const saved = placements[entry.id];
    const preferredColumn = preferred[entry.kind] ?? (mode === 'wide' ? 1 + (fallbackIndex % 2) : fallbackIndex % 2);
    const column = Number.isInteger(saved?.column) && saved.column >= 0 && saved.column < columnCount ? saved.column : Math.min(columnCount - 1, preferredColumn);
    columns[column].push({ entry, savedIndex: Number.isInteger(saved?.index) ? saved.index : Number.MAX_SAFE_INTEGER, fallbackIndex });
  });
  const arranged = columns.map((items) => items.sort((left, right) => left.savedIndex - right.savedIndex || left.fallbackIndex - right.fallbackIndex).map((item) => item.entry));
  if (Object.keys(placements).length !== entries.length) persistColumns(mode, arranged);
  return { mode, columns: arranged };
}
function moveCardByDirection(cardId, direction) {
  const { mode, columns } = arrangeDashboard();
  const column = columns.findIndex((items) => items.some((entry) => entry.id === cardId));
  const index = columns[column]?.findIndex((entry) => entry.id === cardId) ?? -1;
  if (column < 0 || index < 0) return;
  const [entry] = columns[column].splice(index, 1);
  if (direction < 0 && index > 0) columns[column].splice(index - 1, 0, entry);
  else if (direction > 0 && index < columns[column].length) columns[column].splice(index + 1, 0, entry);
  else {
    const nextColumn = Math.max(0, Math.min(columns.length - 1, column + (direction < 0 ? -1 : 1)));
    if (nextColumn === column) columns[column].splice(index, 0, entry);
    else if (direction < 0) columns[nextColumn].push(entry);
    else columns[nextColumn].unshift(entry);
  }
  persistColumns(mode, columns);
}
function placeCard(cardId, targetId = null, columnNumber = null) {
  const { mode, columns } = arrangeDashboard();
  let moving = null;
  columns.forEach((items) => { const index = items.findIndex((entry) => entry.id === cardId); if (index >= 0) [moving] = items.splice(index, 1); });
  if (!moving) return;
  if (targetId) {
    const targetColumn = columns.findIndex((items) => items.some((entry) => entry.id === targetId));
    const targetIndex = columns[targetColumn]?.findIndex((entry) => entry.id === targetId) ?? 0;
    columns[targetColumn].splice(targetIndex, 0, moving);
  } else {
    columns[Math.max(0, Math.min(columns.length - 1, Number(columnNumber) || 0))].push(moving);
  }
  persistColumns(mode, columns);
}
function renderDashboard() {
  const { columns } = arrangeDashboard();
  content.innerHTML = `<div class="bento-dashboard columns-${columns.length}">${columns.map((items, index) => `<div class="bento-column" data-column="${index}">${items.map((entry) => entry.html()).join('')}</div>`).join('')}</div>`;
  hydrateShortcutIcons();
}

function renderSearch() {
  const query = state.query;
  if (!query) { searchResults.hidden = true; searchResults.innerHTML = ''; return; }
  const shortcuts = state.board.shortcuts.filter((item) => item.name.toLocaleLowerCase('zh-CN').includes(query)).slice(0, 6);
  const files = state.files.filter((item) => item.name.toLocaleLowerCase('zh-CN').includes(query)).slice(0, 5);
  const apps = state.apps.filter((item) => item.name.toLocaleLowerCase('zh-CN').includes(query)).slice(0, 5);
  const rows = [
    ...shortcuts.map((item) => `<button data-search-kind="shortcut" data-id="${esc(item.id)}">${icon(ICONS.warehouse)}<span><b>${esc(item.name)}</b><small>桌面快捷方式</small></span></button>`),
    ...apps.map((item) => `<button data-search-kind="app" data-id="${esc(item.id)}">${icon(ICONS.open)}<span><b>${esc(item.name)}</b><small>应用</small></span></button>`),
    ...files.map((item) => `<button data-search-kind="file" data-id="${esc(item.id)}">${icon(ICONS.folder)}<span><b>${esc(item.name)}</b><small>文件</small></span></button>`),
  ];
  rows.push(`<button data-search-kind="web" data-query="${esc(search.value.trim())}">${icon(ICONS.web)}<span><b>在网页中搜索“${esc(search.value.trim())}”</b><small>使用默认浏览器</small></span></button>`);
  searchResults.innerHTML = `<div class="search-result-list">${rows.join('')}</div>`; searchResults.hidden = false;
}

function render() {
  if (state.loading) { content.innerHTML = '<div class="loading-page"><i></i><b>正在装载桌面信息仓</b></div>'; return; }
  renderDashboard(); renderSearch();
}

async function hydrateShortcutIcons() {
  if (!api?.desktop?.shortcutIcon) return;
  await Promise.all([...document.querySelectorAll('[data-shortcut-icon]')].map(async (node) => {
    const source = await api.desktop.shortcutIcon(node.dataset.shortcutIcon).catch(() => null);
    if (source && node.isConnected) node.innerHTML = `<img alt="" src="${source}">`;
  }));
}
async function loadBoard() { state.board = api?.board?.get ? await api.board.get() : { shortcuts: [], categories: [] }; }
async function loadFiles() { if (!api?.files) return; [state.roots, state.files] = await Promise.all([api.files.roots(), api.files.list(100)]); state.fileRootId ||= state.roots[0]?.id || null; }
async function loadWeather(force = false) { if (!api?.weather) return; try { state.weatherError = null; state.weather = await api.weather.get(state.settings.weatherCity, force); } catch (error) { state.weatherError = error.message || '天气读取失败'; } if (!state.loading) render(); }
async function loadMedia() { if (!api?.media?.status) return; state.media = await api.media.status().catch(() => ({ available: false })); if (!state.loading) render(); }
async function loadAll() {
  state.loading = true; render();
  try {
    const [settings] = await Promise.all([
      api?.settings?.get?.() || Promise.resolve(state.settings), loadBoard(), loadFiles(),
      api?.todo?.list?.().then((items) => { state.todos = items; }),
      api?.apps?.list?.({ size: 150 }).then((items) => { state.apps = Array.isArray(items) ? items : items?.items || []; }).catch(() => {}),
    ]);
    state.settings = { ...state.settings, ...settings }; document.documentElement.dataset.theme = state.settings.theme; status.textContent = '已就绪';
  } catch (error) { status.textContent = '读取失败'; showToast(error.message || '本地数据读取失败', 'error'); }
  state.loading = false; render(); void loadWeather(); void loadMedia();
}

function categoryDialog(category = null, pendingShortcutId = '') {
  const colors = COLORS.map((color) => `<label><input type="radio" name="color" value="${color}" ${(category?.color || COLORS[0]) === color ? 'checked' : ''}><span style="--swatch:${color}"></span></label>`).join('');
  openDialog(category ? '编辑分类' : '新建分类', pendingShortcutId ? '保存后会把拖入的快捷方式直接放入这个分类。' : '分类由你创建，桌面舱不会自动替你归类。', `<form id="categoryForm" class="dialog-form"><label>名称<input name="name" maxlength="20" required value="${esc(category?.name || '')}" placeholder="例如：工作"></label><fieldset><legend>识别色</legend><div class="color-options">${colors}</div></fieldset></form>`, `<button data-action="close-dialog">取消</button><button class="primary" data-action="save-category" data-category-id="${esc(category?.id || '')}" data-pending-shortcut-id="${esc(pendingShortcutId)}">保存</button>`);
}
function moveShortcutDialog(shortcutId) {
  const item = state.board.shortcuts.find((entry) => entry.id === shortcutId); if (!item) return;
  const options = [{ id: '', name: '桌面仓', color: '#1677ff' }, ...state.board.categories];
  openDialog('移动到分类', `选择“${item.name}”的新位置。`, `<div class="move-list">${options.map((entry) => `<button data-action="assign-shortcut" data-shortcut-id="${esc(shortcutId)}" data-category-id="${esc(entry.id)}"><i style="--swatch:${esc(entry.color)}"></i><span>${esc(entry.name)}</span>${(item.categoryId || '') === entry.id ? icon(ICONS.check) : ''}</button>`).join('')}</div>`, '<button data-action="close-dialog">取消</button>');
}
function todoDialog(item = null) {
  const colorOptions = TODO_COLORS.map((color) => `<label><input type="radio" name="color" value="${color}" ${(item?.color || 'blue') === color ? 'checked' : ''}><span class="todo-color ${color}"></span></label>`).join('');
  openDialog(item ? '编辑任务' : '添加任务', '任务、提醒和附件都保存在本机。', `<form id="todoForm" class="dialog-form"><label>任务标题<input name="title" maxlength="120" required value="${esc(item?.title || '')}" placeholder="要处理什么？"></label><label>备注<textarea name="notes" maxlength="4000" rows="3">${esc(item?.notes || '')}</textarea></label><div class="form-pair"><label>截止时间<input type="datetime-local" name="dueAt" value="${item?.dueAt ? esc(item.dueAt.slice(0, 16)) : ''}"></label><label>提醒时间<input type="datetime-local" name="reminderAt" value="${item?.reminderAt ? esc(item.reminderAt.slice(0, 16)) : ''}"></label></div><label>重复<select name="recurrence"><option value="none">不重复</option><option value="daily" ${item?.recurrence === 'daily' ? 'selected' : ''}>每天</option><option value="weekly" ${item?.recurrence === 'weekly' ? 'selected' : ''}>每周</option><option value="monthly" ${item?.recurrence === 'monthly' ? 'selected' : ''}>每月</option></select></label><fieldset><legend>颜色标记</legend><div class="color-options">${colorOptions}</div></fieldset><input type="hidden" name="attachments" value="${esc(JSON.stringify(item?.attachments || []))}"><button type="button" class="attach-button" data-action="pick-attachments">${icon(ICONS.attach)} 选择附件 <span>${item?.attachments?.length || 0}</span></button></form>`, `${item ? `<button class="danger" data-action="delete-todo" data-todo-id="${esc(item.id)}">删除</button>` : ''}<button data-action="close-dialog">取消</button><button class="primary" data-action="save-todo" data-todo-id="${esc(item?.id || '')}">保存</button>`);
}
function todoManagerDialog() {
  const rows = state.todos.map((item, index) => `<div class="todo-manager-row"><label><input type="checkbox" data-todo-select="${esc(item.id)}"><span>${esc(item.title)}</span></label><button data-action="reorder-todo" data-todo-id="${esc(item.id)}" data-direction="-1" aria-label="上移 ${esc(item.title)}" ${index === 0 ? 'disabled' : ''}>${icon(ICONS.up)}</button><button data-action="reorder-todo" data-todo-id="${esc(item.id)}" data-direction="1" aria-label="下移 ${esc(item.title)}" ${index === state.todos.length - 1 ? 'disabled' : ''}>${icon(ICONS.down)}</button><button data-action="edit-todo" data-todo-id="${esc(item.id)}">编辑</button></div>`).join('') || '<div class="empty-state">暂无任务</div>';
  openDialog('管理全部待办', '勾选后可批量完成或删除；上下按钮可调整顺序。', `<div class="todo-manager">${rows}</div>`, '<button data-action="bulk-complete">完成所选</button><button class="danger" data-action="bulk-delete">删除所选</button><button data-action="close-dialog">关闭</button>');
}
function noteDialog(note = null) {
  openDialog(note ? '编辑便签' : '添加便签', '随记保存在本机，不会同步到云端。', `<form id="noteForm" class="dialog-form"><label>标题<input name="title" maxlength="80" value="${esc(note?.title || '')}" placeholder="便签标题"></label><label>内容<textarea name="body" maxlength="2000" rows="7" required placeholder="记点什么…">${esc(note?.body || '')}</textarea></label><fieldset><legend>颜色</legend><div class="note-color-options">${NOTE_COLORS.map((color) => `<label><input type="radio" name="color" value="${color}" ${(note?.color || 'mint') === color ? 'checked' : ''}><span class="note-swatch ${color}"></span></label>`).join('')}</div></fieldset><label class="checkbox-row"><input type="checkbox" name="pinned" ${note?.pinned ? 'checked' : ''}>固定便签</label></form>`, `${note ? `<button class="danger" data-action="delete-note" data-note-id="${esc(note.id)}">删除</button>` : ''}<button data-action="close-dialog">取消</button><button class="primary" data-action="save-note" data-note-id="${esc(note?.id || '')}">保存</button>`);
}
function cardMenu(cardId) {
  const title = cardId.startsWith('category:') ? state.board.categories.find((entry) => cardIdForCategory(entry.id) === cardId)?.name : ({ weather: '天气', todo: '待办', notes: '随记', files: '文件', clock: '时间', media: '媒体', warehouse: '桌面仓' })[cardId];
  const currentSize = state.cards.sizes[cardId] || 'normal';
  const resizeAction = ['todo', 'notes', 'files', 'warehouse'].includes(cardId) || cardId.startsWith('category:')
    ? `<button data-action="card-resize" data-card-id="${esc(cardId)}">${icon(ICONS.expand)}切换尺寸（当前：${esc({ compact: '紧凑', normal: '标准', tall: '加高' }[currentSize])}）</button>` : '';
  const moduleAction = cardId === 'todo' ? `<button data-action="manage-todos">${icon(ICONS.todo)}管理全部待办</button>` : '';
  openDialog(`管理“${title || '卡片'}”`, '拖动标题栏可排序，也可以使用下面的无障碍操作。', `<div class="action-list">${moduleAction}<button data-action="card-move" data-card-id="${esc(cardId)}" data-direction="-1">${icon(ICONS.up)}向前移动</button><button data-action="card-move" data-card-id="${esc(cardId)}" data-direction="1">${icon(ICONS.down)}向后移动</button>${resizeAction}<button data-action="card-hide" data-card-id="${esc(cardId)}">${icon(ICONS.close)}隐藏卡片</button>${cardId.startsWith('category:') ? `<button class="danger" data-action="delete-category" data-category-id="${esc(cardId.slice(9))}">${icon(ICONS.trash)}删除分类</button>` : ''}</div>`, '<button data-action="close-dialog">关闭</button>');
}
function settingsDialog() {
  const allIds = [...DEFAULT_ORDER, ...state.board.categories.map((entry) => cardIdForCategory(entry.id))];
  const name = (id) => id.startsWith('category:') ? state.board.categories.find((entry) => cardIdForCategory(entry.id) === id)?.name : ({ weather: '天气', todo: '待办', notes: '随记', files: '文件', clock: '时间', media: '媒体', warehouse: '桌面仓' })[id];
  openDialog('面板设置', '主题、开机启动和卡片可见性。', `<div class="setting-list"><div class="setting-row"><span><b>主题</b><small>浅色、深色或跟随系统</small></span><button data-action="cycle-theme">${esc({ light: '浅色', dark: '深色', system: '跟随系统' }[state.settings.theme])}</button></div><div class="setting-row"><span><b>开机自动启动</b><small>便携 EXE 随 Windows 启动</small></span><button class="switch ${state.settings.autoStart ? 'on' : ''}" role="switch" aria-checked="${Boolean(state.settings.autoStart)}" data-action="toggle-setting" data-setting="autoStart"><i></i></button></div><div class="setting-row"><span><b>自动收纳快捷方式</b><small>启动时收纳当前用户与公共桌面的快捷方式</small></span><button class="switch ${state.settings.autoStowShortcuts ? 'on' : ''}" role="switch" aria-checked="${Boolean(state.settings.autoStowShortcuts)}" data-action="toggle-setting" data-setting="autoStowShortcuts"><i></i></button></div><div class="setting-row"><span><b>桌面收纳</b><small>立即移除桌面上的快捷方式，只保留系统图标</small></span><button data-action="stow-shortcuts">立即收纳</button></div><h3>卡片显示</h3>${allIds.map((id) => `<div class="setting-row"><span><b>${esc(name(id) || id)}</b></span><button class="switch ${!isHidden(id) ? 'on' : ''}" role="switch" aria-checked="${!isHidden(id)}" data-action="toggle-card-visible" data-card-id="${esc(id)}"><i></i></button></div>`).join('')}</div>`, '<button data-action="export-settings">导出配置</button><button data-action="quit" class="danger">退出</button><button data-action="close-dialog">完成</button>');
}
async function saveSetting(key, value) { const previous = state.settings[key]; state.settings[key] = value; const result = await api?.settings?.set?.(key, value); if (!resultOk(result)) { state.settings[key] = previous; showToast(result.error || '设置保存失败', 'error'); } document.documentElement.dataset.theme = state.settings.theme; render(); }
async function assignShortcut(shortcutId, categoryId) { const result = await api?.board?.assign?.(shortcutId, categoryId || null); if (!resultOk(result)) return showToast(result.error || '归类失败', 'error'); await loadBoard(); render(); showToast(categoryId ? '已移动到分类' : '已移回桌面仓'); }
async function stowDesktopShortcuts() { const result = await api?.desktop?.stowShortcuts?.(); if (!resultOk(result)) return showToast(result?.error || `收纳完成 ${result?.stowed || 0} 个，${result?.failed?.length || 0} 个失败`, 'error'); await loadBoard(); render(); showToast(`已收纳 ${result?.stowed || 0} 个桌面快捷方式`); }
async function droppedPaths(event) { return [...(event.dataTransfer?.files || [])].map((file) => { try { return api?.files?.pathForFile?.(file) || file.path || ''; } catch { return ''; } }).filter(Boolean); }

async function handleAction(button) {
  const action = button.dataset.action;
  if (action === 'hide') return api?.window?.hide?.();
  if (action === 'close-dialog') return closeDialog();
  if (action === 'dashboard-settings') return settingsDialog();
  if (action === 'focus-search') { closeDialog(); search.focus(); return; }
  if (action === 'card-toggle') { const id = button.dataset.cardId; state.cards.collapsed = isCollapsed(id) ? state.cards.collapsed.filter((value) => value !== id) : [...state.cards.collapsed, id]; writeStore('desktopdock.cards', state.cards); return render(); }
  if (action === 'card-menu') return cardMenu(button.dataset.cardId);
  if (action === 'card-move') { moveCardByDirection(button.dataset.cardId, Number(button.dataset.direction)); closeDialog(); return render(); }
  if (action === 'card-resize') { const id = button.dataset.cardId; const sizes = ['compact', 'normal', 'tall']; const current = state.cards.sizes[id] || 'normal'; state.cards.sizes[id] = sizes[(sizes.indexOf(current) + 1) % sizes.length]; writeStore('desktopdock.cards', state.cards); closeDialog(); return render(); }
  if (action === 'card-hide') { state.cards.hidden = [...new Set([...state.cards.hidden, button.dataset.cardId])]; writeStore('desktopdock.cards', state.cards); closeDialog(); return render(); }
  if (action === 'toggle-card-visible') { const id = button.dataset.cardId; state.cards.hidden = isHidden(id) ? state.cards.hidden.filter((value) => value !== id) : [...state.cards.hidden, id]; writeStore('desktopdock.cards', state.cards); settingsDialog(); render(); return; }
  if (action === 'stow-shortcuts') { closeDialog(); return stowDesktopShortcuts(); }
  if (action === 'new-category') return categoryDialog();
  if (action === 'edit-category') return categoryDialog(state.board.categories.find((item) => item.id === button.dataset.categoryId));
  if (action === 'save-category') { const form = dialog.querySelector('#categoryForm'); if (!form?.reportValidity()) return; const data = new FormData(form); const payload = { id: button.dataset.categoryId, name: data.get('name'), color: data.get('color') }; const result = payload.id ? await api?.board?.updateCategory?.(payload) : await api?.board?.createCategory?.(payload); if (!resultOk(result)) return showToast(result.error || '分类保存失败', 'error'); const createdId = result?.category?.id; if (!payload.id && button.dataset.pendingShortcutId && createdId) await api?.board?.assign?.(button.dataset.pendingShortcutId, createdId); closeDialog(); await loadBoard(); render(); return showToast(button.dataset.pendingShortcutId ? '分类已创建，快捷方式已移入' : '分类已保存'); }
  if (action === 'delete-category') { const category = state.board.categories.find((item) => item.id === button.dataset.categoryId); if (!category) return; return openDialog('删除分类', `“${category.name}”内的快捷方式会移回桌面仓，快捷方式本身不会删除。`, '', `<button data-action="close-dialog">取消</button><button class="primary danger" data-action="confirm-delete-category" data-category-id="${esc(category.id)}">删除分类</button>`); }
  if (action === 'confirm-delete-category') { const result = await api?.board?.deleteCategory?.(button.dataset.categoryId); if (!resultOk(result)) return showToast(result.error, 'error'); const id = cardIdForCategory(button.dataset.categoryId); state.cards.order = state.cards.order.filter((value) => value !== id); state.cards.hidden = state.cards.hidden.filter((value) => value !== id); writeStore('desktopdock.cards', state.cards); closeDialog(); await loadBoard(); render(); return showToast('分类已删除'); }
  if (action === 'move-shortcut') return moveShortcutDialog(button.dataset.shortcutId);
  if (action === 'assign-shortcut') { closeDialog(); return assignShortcut(button.dataset.shortcutId, button.dataset.categoryId || null); }
  if (action === 'import-shortcuts') { const result = await api?.board?.pick?.(button.dataset.categoryId || null); if (result?.canceled) return; if (!resultOk(result)) return showToast(result?.error || '导入失败', 'error'); await loadBoard(); render(); return showToast(`已导入 ${result.imported?.length || 0} 个快捷方式`); }
  if (action === 'manage-category') return shortcutManagerDialog(button.dataset.categoryId || '');
  if (action === 'new-category-from-manager') return categoryDialog();
  if (action === 'assign-select') { const result = await api?.board?.assign?.(button.dataset.shortcutId, button.value || null); if (!resultOk(result)) return showToast(result?.error || '归类失败', 'error'); await loadBoard(); render(); shortcutManagerDialog(button.dataset.managerCategory || ''); return showToast(button.value ? '已分配到分类' : '已移回桌面仓'); }
  if (action === 'new-todo') return todoDialog();
  if (action === 'manage-todos') return todoManagerDialog();
  if (action === 'edit-todo') return todoDialog(state.todos.find((item) => item.id === button.dataset.todoId));
  if (action === 'pick-attachments') { const paths = await api?.todo?.pickAttachments?.() || []; const input = dialog.querySelector('[name="attachments"]'); if (input) input.value = JSON.stringify(paths); button.querySelector('span').textContent = paths.length; return; }
  if (action === 'save-todo') { const form = dialog.querySelector('#todoForm'); if (!form?.reportValidity()) return; const data = new FormData(form); const payload = { id: button.dataset.todoId, title: data.get('title'), notes: data.get('notes'), dueAt: data.get('dueAt'), reminderAt: data.get('reminderAt'), recurrence: data.get('recurrence'), color: data.get('color'), attachments: JSON.parse(data.get('attachments') || '[]') }; const result = payload.id ? await api?.todo?.update?.(payload) : await api?.todo?.create?.(payload); if (!resultOk(result)) return showToast(result.error, 'error'); closeDialog(); state.todos = await api.todo.list(); render(); return showToast('任务已保存'); }
  if (action === 'delete-todo') { await api?.todo?.delete?.(button.dataset.todoId); closeDialog(); state.todos = await api.todo.list(); render(); return showToast('任务已删除'); }
  if (action === 'bulk-complete' || action === 'bulk-delete') { const ids = [...dialog.querySelectorAll('[data-todo-select]:checked')].map((input) => input.dataset.todoSelect); if (!ids.length) return showToast('请先选择任务', 'error'); if (action === 'bulk-complete') await Promise.all(ids.map((id) => { const item = state.todos.find((entry) => entry.id === id); return api.todo.update({ id, title: item.title, completed: true }); })); else await Promise.all(ids.map((id) => api.todo.delete(id))); state.todos = await api.todo.list(); todoManagerDialog(); render(); return showToast(action === 'bulk-complete' ? '所选任务已完成' : '所选任务已删除'); }
  if (action === 'reorder-todo') { const ids = state.todos.map((item) => item.id); const from = ids.indexOf(button.dataset.todoId); const to = Math.max(0, Math.min(ids.length - 1, from + Number(button.dataset.direction))); ids.splice(to, 0, ids.splice(from, 1)[0]); await api?.todo?.reorder?.(ids); state.todos = await api.todo.list(); todoManagerDialog(); render(); return; }
  if (action === 'toggle-todo') { const item = state.todos.find((entry) => entry.id === button.dataset.todoId); if (!item) return; await api?.todo?.update?.({ id: item.id, title: item.title, completed: !item.completed }); state.todos = await api.todo.list(); return render(); }
  if (action === 'favorite-todo') { const item = state.todos.find((entry) => entry.id === button.dataset.todoId); if (!item) return; await api?.todo?.update?.({ id: item.id, title: item.title, pinned: !item.pinned }); state.todos = await api.todo.list(); return render(); }
  if (action === 'new-note') return noteDialog();
  if (action === 'edit-note') return noteDialog(state.notes.find((note) => note.id === button.dataset.noteId));
  if (action === 'save-note') { const form = dialog.querySelector('#noteForm'); if (!form?.reportValidity()) return; const data = new FormData(form); const id = button.dataset.noteId || `note_${Date.now().toString(36)}`; const next = { id, title: data.get('title').trim(), body: data.get('body').trim(), color: data.get('color'), pinned: data.get('pinned') === 'on', updatedAt: new Date().toISOString() }; const index = state.notes.findIndex((note) => note.id === id); if (index >= 0) state.notes[index] = next; else state.notes.unshift(next); state.notes.sort((a, b) => Number(b.pinned) - Number(a.pinned) || String(b.updatedAt).localeCompare(String(a.updatedAt))); writeStore('desktopdock.notes', state.notes); closeDialog(); render(); return showToast('便签已保存'); }
  if (action === 'delete-note') { state.notes = state.notes.filter((note) => note.id !== button.dataset.noteId); writeStore('desktopdock.notes', state.notes); closeDialog(); render(); return showToast('便签已删除'); }
  if (action === 'open-root') return api?.files?.openRoot?.(button.dataset.rootId);
  if (action === 'add-root') { const result = await api?.files?.addRoot?.(); if (resultOk(result)) { await loadFiles(); render(); } return; }
  if (action === 'open-file') return api?.files?.open?.(button.dataset.fileId);
  if (action === 'refresh-weather') return loadWeather(true);
  if (action === 'locate-weather') { if (!navigator.geolocation) return showToast('系统未提供位置服务', 'error'); showToast('正在读取当前位置…'); return navigator.geolocation.getCurrentPosition(async (position) => { try { state.weather = await api.weather.getByCoordinates(position.coords.latitude, position.coords.longitude, true); render(); showToast('已切换到当前位置'); } catch (error) { showToast(error.message || '定位天气失败', 'error'); } }, () => showToast('请在 Windows 设置中允许定位', 'error'), { timeout: 8000, maximumAge: 600000 }); }
  if (action === 'refresh-media') return loadMedia();
  if (action === 'toggle-setting') return saveSetting(button.dataset.setting, !state.settings[button.dataset.setting]);
  if (action === 'cycle-theme') { const values = ['system', 'light', 'dark']; const next = values[(values.indexOf(state.settings.theme) + 1) % values.length]; await saveSetting('theme', next); settingsDialog(); return; }
  if (action === 'export-settings') { const result = await api?.settings?.export?.(); if (resultOk(result)) showToast('配置已导出'); return; }
  if (action === 'quit') return api?.window?.quit?.();
}

document.addEventListener('click', (event) => { const button = event.target.closest('button[data-action]'); if (button) void handleAction(button); const media = event.target.closest('[data-media]'); if (media) void api?.media?.control?.(media.dataset.media).then(() => setTimeout(loadMedia, 350)); });
document.addEventListener('change', (event) => { const control = event.target.closest('[data-action]'); if (control) void handleAction(control); });
search.addEventListener('input', () => { state.query = search.value.trim().toLocaleLowerCase('zh-CN'); renderSearch(); });
search.addEventListener('keydown', (event) => { if (event.key === 'ArrowDown') { event.preventDefault(); searchResults.querySelector('button')?.focus(); } if (event.key === 'Escape') { search.value = ''; state.query = ''; renderSearch(); } });
searchResults.addEventListener('keydown', (event) => { const buttons = [...searchResults.querySelectorAll('button')]; const index = buttons.indexOf(document.activeElement); if (event.key === 'ArrowDown') { event.preventDefault(); buttons[Math.min(buttons.length - 1, index + 1)]?.focus(); } if (event.key === 'ArrowUp') { event.preventDefault(); index <= 0 ? search.focus() : buttons[index - 1]?.focus(); } if (event.key === 'Escape') search.focus(); });
searchResults.addEventListener('click', (event) => { const row = event.target.closest('[data-search-kind]'); if (!row) return; const actions = { shortcut: () => api?.desktop?.launchShortcut?.(row.dataset.id), app: () => api?.apps?.launch?.(row.dataset.id), file: () => api?.files?.open?.(row.dataset.id), web: () => api?.search?.web?.(row.dataset.query) }; void actions[row.dataset.searchKind]?.(); search.value = ''; state.query = ''; renderSearch(); showToast('已打开'); });
document.addEventListener('dblclick', (event) => { const tile = event.target.closest('[data-shortcut]'); if (tile) void api?.desktop?.launchShortcut?.(tile.dataset.shortcut).then(() => showToast(`已启动 ${tile.querySelector('.shortcut-name')?.textContent || '应用'}`)); });
document.addEventListener('keydown', (event) => {
  if (!dialogLayer.hidden) {
    if (event.key === 'Escape') { event.preventDefault(); closeDialog(); return; }
    if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((node) => node.offsetParent !== null);
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
  if (event.key === 'Enter' && event.target.matches('[data-shortcut]')) void api?.desktop?.launchShortcut?.(event.target.dataset.shortcut);
});
document.addEventListener('dragstart', (event) => { const shortcut = event.target.closest('[data-shortcut]'); const header = event.target.closest('[data-card-drag]'); if (shortcut) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-desktopdock-shortcut', shortcut.dataset.shortcut); shortcut.classList.add('dragging'); } else if (header) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-desktopdock-card', header.dataset.cardDrag); header.closest('.bento-card')?.classList.add('dragging'); } });
document.addEventListener('dragend', () => document.querySelectorAll('.dragging,.drop-active').forEach((node) => node.classList.remove('dragging', 'drop-active')));
document.addEventListener('dragover', (event) => { const target = event.target.closest('[data-drop-category],[data-card-id],.bento-column,#dockContent'); if (!target) return; event.preventDefault(); target.classList.add('drop-active'); });
document.addEventListener('dragleave', (event) => event.target.closest('.drop-active')?.classList.remove('drop-active'));
document.addEventListener('drop', async (event) => {
  const category = event.target.closest('[data-drop-category]'); const cardTarget = event.target.closest('[data-card-id]'); const columnTarget = event.target.closest('.bento-column'); const board = event.target.closest('#dockContent');
  if (!category && !cardTarget && !columnTarget && !board) return; event.preventDefault(); document.querySelectorAll('.drop-active').forEach((node) => node.classList.remove('drop-active'));
  const shortcutId = event.dataTransfer.getData('application/x-desktopdock-shortcut');
  if (category && shortcutId) return assignShortcut(shortcutId, category.dataset.dropCategory || null);
  if (board && shortcutId && !category && !cardTarget) return categoryDialog(null, shortcutId);
  if (category && event.dataTransfer.types.includes('Files')) { const paths = await droppedPaths(event); const result = await api?.board?.import?.(paths, category.dataset.dropCategory || null); if (!resultOk(result)) return showToast(result.error || '导入失败', 'error'); await loadBoard(); render(); return showToast(`已导入 ${result.imported?.length || 0} 个快捷方式`); }
  const cardId = event.dataTransfer.getData('application/x-desktopdock-card'); const targetId = cardTarget?.dataset.cardId;
  if (cardId && cardId !== targetId) { placeCard(cardId, targetId || null, columnTarget?.dataset.column); render(); showToast('卡片位置已更新'); }
});

document.addEventListener('contextmenu', (event) => {
  const board = event.target.closest('#dockContent');
  if (!board || event.target.closest('.bento-card, .shortcut-tile, button, input, select, textarea, a')) return;
  event.preventDefault();
  categoryDialog();
});

api?.onShowSearch?.(() => { search.focus(); search.select(); });
api?.settings?.onChanged?.((settings) => { state.settings = { ...state.settings, ...settings }; render(); });
window.addEventListener('resize', () => render());
setInterval(() => { const node = document.querySelector('#dockClock'); if (node) node.textContent = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()); }, 30_000);
void loadAll();
