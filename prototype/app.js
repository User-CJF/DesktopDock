const variants = {
  workbench: {
    short: 'A',
    name: '抽屉工作台',
    source: '视觉与设计规范说明书',
    note: '强调物理边界、品牌渐变和大卡片，视觉记忆最强。',
    scores: { efficiency: 82, native: 72, clarity: 80, coherence: 86, risk: 74 },
    total: 79.4,
  },
  glass: {
    short: 'B',
    name: '轻透效率',
    source: 'UI 设计文档（Markdown）',
    note: '平衡毛玻璃、留白与熟悉的卡片结构，上手门槛最低。',
    scores: { efficiency: 84, native: 78, clarity: 83, coherence: 82, risk: 80 },
    total: 81.6,
  },
  native: {
    short: 'C',
    name: 'Windows 原生',
    source: 'UI 设计文档（DOCX）',
    note: '键盘优先、信息密度更高，与 Windows 11 Fluent 最一致。',
    scores: { efficiency: 94, native: 96, clarity: 91, coherence: 90, risk: 91 },
    total: 93.0,
    winner: true,
  },
};

const views = [
  { id: 'home', label: '主界面', icon: '&#xE80F;' },
  { id: 'search', label: '搜索', icon: '&#xE721;' },
  { id: 'settings', label: '设置', icon: '&#xE713;' },
];

const apps = [
  { name: '微信', mark: '微', color: '#22a06b', usage: '社交 · 常用', pinned: true },
  { name: 'Chrome', mark: 'C', color: '#e2554f', usage: '浏览器 · 常用', pinned: true },
  { name: 'VS Code', mark: 'VS', color: '#287fc3', usage: '开发 · 最近使用', pinned: true },
  { name: 'Figma', mark: 'F', color: '#a259ff', usage: '设计 · 常用' },
  { name: 'Word', mark: 'W', color: '#2b579a', usage: '办公 · 昨天' },
  { name: '网易云音乐', mark: '音', color: '#d33a31', usage: '娱乐 · 最近使用' },
  { name: 'PowerShell', mark: '>_', color: '#526faa', usage: '工具 · 常用' },
  { name: 'Notion', mark: 'N', color: '#252525', usage: '办公 · 本周' },
];

const categories = [
  { name: '办公', icon: '📄', count: 12, color: '#4f6bff' },
  { name: '设计', icon: '🎨', count: 8, color: '#e75e66' },
  { name: '开发', icon: '💻', count: 15, color: '#805ad5' },
  { name: '娱乐', icon: '🎮', count: 6, color: '#159a83' },
  { name: '社交', icon: '💬', count: 7, color: '#0587a7' },
  { name: '工具', icon: '🔧', count: 9, color: '#c27600' },
];

const files = [
  { name: 'DesktopDock 交互梳理.docx', meta: '今天 14:32 · 1.8 MB', mark: 'W', color: '#2b579a' },
  { name: '产品评审会议.pptx', meta: '今天 10:18 · 6.4 MB', mark: 'P', color: '#c43e1c' },
  { name: '启动器界面.fig', meta: '昨天 · 12.1 MB', mark: 'F', color: '#a259ff' },
];

const settingResults = [
  { name: '外观设置', mark: 'UI', color: '#4f6bff', usage: '设置 · 主题、图标与界面' },
  { name: '快捷键设置', mark: 'Key', color: '#526faa', usage: '设置 · Alt + Space' },
  { name: '搜索设置', mark: 'Find', color: '#0587a7', usage: '设置 · 索引与搜索范围' },
];

const state = {
  variant: 'native',
  view: 'home',
  dark: false,
  compare: false,
  query: '微',
  searchType: 'apps',
  resultIndex: 0,
  settingsSection: '外观',
};

const stage = document.querySelector('#stage');
const comparison = document.querySelector('#comparison');
const toast = document.querySelector('#toast');
const currentNote = document.querySelector('#currentNote');

function icon(code, className = '') {
  return `<span class="fluent-icon ${className}" aria-hidden="true">${code}</span>`;
}

function createControls() {
  const variantControls = document.querySelector('#variantControls');
  variantControls.innerHTML = Object.entries(variants)
    .map(([id, item]) => `<button type="button" data-variant="${id}" aria-pressed="${id === state.variant}"><b>${item.short}</b> ${item.name}${item.winner ? '<span class="winner-dot" title="推荐最终版"></span>' : ''}</button>`)
    .join('');

  const viewControls = document.querySelector('#viewControls');
  viewControls.innerHTML = views
    .map((item) => `<button type="button" data-view="${item.id}" aria-pressed="${item.id === state.view}">${icon(item.icon)}${item.label}</button>`)
    .join('');
}

function appIcon(app, size = 'medium') {
  return `<span class="app-icon ${size}" style="--app-color:${app.color}" aria-hidden="true">${app.mark}</span>`;
}

function titleBar(variant) {
  const menu = variant === 'workbench' ? `<button class="icon-button" type="button" title="打开菜单" aria-label="打开菜单">${icon('&#xE700;')}</button>` : '';
  const logoText = variant === 'glass' ? '<span class="brand-lockup"><i>D</i><b>桌面舱</b></span>' : '<b class="window-name">桌面舱</b>';
  return `<header class="titlebar">
    <div class="titlebar-left">${menu}${logoText}</div>
    <div class="window-actions" aria-label="窗口控制">
      <button type="button" title="最小化" aria-label="最小化">&#x2212;</button>
      <button type="button" title="最大化" aria-label="最大化">&#x25A1;</button>
      <button type="button" class="close-window" title="关闭" aria-label="关闭">&#x00D7;</button>
    </div>
  </header>`;
}

function topNavigation(variant) {
  if (variant === 'native') {
    return `<nav class="app-tabs" aria-label="主导航">
      ${views.map((item) => `<button type="button" data-inside-view="${item.id}" class="${state.view === item.id ? 'active' : ''}">${icon(item.icon)}<span>${item.label === '主界面' ? '常用' : item.label}</span></button>`).join('')}
      <button type="button" data-inside-view="categories">${icon('&#xE8B7;')}<span>分类</span></button>
      <button type="button" data-inside-view="files">${icon('&#xE8A5;')}<span>文件</span></button>
    </nav>`;
  }
  return `<div class="main-search-trigger" role="button" tabindex="0" data-open-search aria-label="打开全局搜索">
    ${icon('&#xE721;')}<span>搜索软件、文件或设置</span><kbd>Alt + Space</kbd>
  </div>`;
}

function appGrid(variant) {
  const items = apps.map((app) => `<button class="app-tile" type="button" data-launch="${app.name}" title="启动 ${app.name}">
    <span class="app-icon-wrap">${appIcon(app)}${app.pinned ? `<span class="pin-mark">${icon('&#xE718;')}</span>` : ''}</span>
    <span class="app-name">${app.name}</span>
    ${variant === 'workbench' ? `<span class="app-usage">${app.usage.split(' · ')[0]}</span>` : ''}
  </button>`).join('');
  return `<div class="app-grid">${items}</div>`;
}

function categoryGrid() {
  return `<div class="category-grid">${categories.map((category) => `<button type="button" class="category-card" style="--category:${category.color}" data-category="${category.name}">
    <span class="category-icon" aria-hidden="true">${category.icon}</span>
    <span class="category-copy"><b>${category.name}</b><small>${category.count} 个应用</small></span>
    ${icon('&#xE76C;', 'category-arrow')}
  </button>`).join('')}</div>`;
}

function recentFiles() {
  return `<div class="recent-files">${files.map((file) => `<button type="button" class="file-row" data-file="${file.name}">
    ${appIcon(file, 'small')}
    <span><b>${file.name}</b><small>${file.meta}</small></span>
    ${icon('&#xE72A;')}
  </button>`).join('')}</div>`;
}

function homeView(variant) {
  if (variant === 'native') {
    return `<div class="native-layout">
      ${topNavigation(variant)}
      <div class="native-content">
        <button class="native-search" type="button" data-open-search>${icon('&#xE721;')}<span>搜索软件、文件、设置</span><kbd>Alt + Space</kbd></button>
        <section class="content-section frequent-section">
          <div class="section-heading"><div><h2>常用</h2><p>固定与最近启动的应用</p></div><button class="text-action" type="button">编辑</button></div>
          ${appGrid(variant)}
        </section>
        <section class="content-section category-section">
          <div class="section-heading"><div><h2>分类</h2><p>按任务组织应用</p></div><button class="text-action" type="button">${icon('&#xE710;')}新建</button></div>
          ${categoryGrid()}
        </section>
      </div>
    </div>`;
  }

  return `<div class="home-content">
    ${topNavigation(variant)}
    <section class="content-section frequent-section">
      <div class="section-heading"><div><h2>常用软件</h2><p>快速回到正在进行的工作</p></div><div class="heading-actions"><button class="text-action" type="button">编辑</button><button class="icon-button" type="button" title="添加软件" aria-label="添加软件">${icon('&#xE710;')}</button></div></div>
      ${appGrid(variant)}
    </section>
    <section class="content-section category-section">
      <div class="section-heading"><div><h2>分类文件夹</h2><p>把常用工具收进固定的位置</p></div><button class="secondary-button" type="button">${icon('&#xE710;')}新建分类</button></div>
      ${categoryGrid()}
    </section>
    ${variant === 'glass' ? `<section class="content-section file-section"><div class="section-heading"><div><h2>最近文件</h2><p>继续处理最近打开的内容</p></div><button class="text-action" type="button">查看全部</button></div>${recentFiles()}</section>` : ''}
  </div>`;
}

function highlightedName(name, query) {
  if (!query) return name;
  const index = name.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return name;
  return `${name.slice(0, index)}<mark>${name.slice(index, index + query.length)}</mark>${name.slice(index + query.length)}`;
}

function searchView(variant) {
  const pools = {
    apps,
    files: files.map((file) => ({ name: file.name, mark: file.mark, color: file.color, usage: file.meta })),
    settings: settingResults,
  };
  const pool = pools[state.searchType];
  const matching = pool.filter((item) => !state.query || item.name.toLowerCase().includes(state.query.toLowerCase()) || item.usage.includes(state.query));
  const results = matching.length ? matching : pool.slice(0, 4);
  const tabs = [['apps', '应用'], ['files', '文件'], ['settings', '设置']];
  return `<div class="search-scene">
    <div class="search-panel" role="dialog" aria-label="全局搜索">
      <div class="search-input-wrap">
        ${icon('&#xE721;')}
        <label class="sr-only" for="searchInput-${variant}">搜索软件、文件、设置</label>
        <input id="searchInput-${variant}" value="${state.query}" autocomplete="off" placeholder="搜索软件、文件、设置" />
        ${state.query ? `<button class="clear-search" type="button" title="清除搜索" aria-label="清除搜索">${icon('&#xE711;')}</button>` : ''}
      </div>
      <div class="search-tabs" role="tablist" aria-label="搜索类型">
        ${tabs.map(([id, label]) => `<button type="button" role="tab" data-search-type="${id}" aria-selected="${state.searchType === id}">${label}</button>`).join('')}
      </div>
      <div class="search-results" role="listbox" aria-label="搜索结果">
        ${results.map((item, index) => `<button type="button" class="result-row ${index === state.resultIndex ? 'selected' : ''}" role="option" aria-selected="${index === state.resultIndex}" data-result="${index}" data-open-result="${item.name}">
          ${appIcon(item, 'small')}
          <span class="result-copy"><b>${highlightedName(item.name, state.query)}</b><small>${item.usage}</small></span>
          <span class="result-action">${index === state.resultIndex ? 'Enter' : ''}</span>
        </button>`).join('')}
      </div>
      <footer class="search-footer"><span><kbd>↑↓</kbd> 选择 <kbd>Enter</kbd> 启动 <kbd>Tab</kbd> 切换</span><span><kbd>Esc</kbd> 关闭</span></footer>
    </div>
  </div>`;
}

function toggleRow(title, detail, checked = true) {
  return `<div class="setting-row"><span><b>${title}</b><small>${detail}</small></span><button type="button" class="toggle ${checked ? 'on' : ''}" role="switch" aria-checked="${checked}" aria-label="${title}"><i></i></button></div>`;
}

function settingsView(variant) {
  const sections = ['外观', '行为', '搜索', '快捷键', '数据', '关于'];
  return `<div class="settings-layout">
    ${variant === 'native' ? topNavigation(variant) : ''}
    <aside class="settings-nav" aria-label="设置分类">
      <h2>设置</h2>
      ${sections.map((section, index) => `<button type="button" class="${section === state.settingsSection ? 'active' : ''}" data-setting-section="${section}">${icon(['&#xE771;','&#xE7FC;','&#xE721;','&#xE765;','&#xE964;','&#xE946;'][index])}<span>${section}</span></button>`).join('')}
    </aside>
    <section class="settings-content">
      <div class="settings-heading"><h2>${state.settingsSection}</h2><p>调整桌面舱在这台电脑上的显示和行为。</p></div>
      <div class="settings-group">
        <h3>主题</h3>
        <div class="theme-choice" role="radiogroup" aria-label="主题模式">
          <button type="button" role="radio" aria-checked="${!state.dark}" class="${!state.dark ? 'active' : ''}" data-theme-choice="light">浅色</button>
          <button type="button" role="radio" aria-checked="${state.dark}" class="${state.dark ? 'active' : ''}" data-theme-choice="dark">深色</button>
          <button type="button" role="radio" aria-checked="false">跟随系统</button>
        </div>
      </div>
      <div class="settings-group">
        <h3>界面</h3>
        ${toggleRow('毛玻璃效果', '在支持的 Windows 11 设备上使用 Mica 和 Acrylic', true)}
        ${toggleRow('动画效果', '关闭后保留状态反馈，但不再移动界面元素', true)}
        <div class="setting-row accent-row"><span><b>主色调</b><small>用于焦点、选择和主要操作</small></span><div class="swatches" aria-label="主色选择">${['#4f6bff','#0587a7','#159a83','#c27600','#d44b57'].map((color, index) => `<button type="button" style="--swatch:${color}" aria-label="选择颜色 ${color}" class="${index === 0 ? 'active' : ''}"></button>`).join('')}</div></div>
      </div>
      <div class="settings-group">
        <h3>启动</h3>
        ${toggleRow('开机时启动桌面舱', '在登录 Windows 后保持搜索随时可用', false)}
        ${toggleRow('启动软件后关闭搜索面板', '按 Enter 打开结果后立即回到当前工作', true)}
      </div>
    </section>
  </div>`;
}

function dockWindow(variant, mini = false) {
  let content = homeView(variant);
  if (state.view === 'search') content = searchView(variant);
  if (state.view === 'settings') content = settingsView(variant);
  return `<article class="dock-window variant-${variant} ${mini ? 'mini-window' : ''}" data-variant-window="${variant}">
    ${titleBar(variant)}
    <div class="window-body">${content}</div>
  </article>`;
}

function renderStage() {
  document.documentElement.dataset.theme = state.dark ? 'dark' : 'light';
  document.querySelector('#themeToggle .fluent-icon').innerHTML = state.dark ? '&#xE708;' : '&#xE706;';
  document.querySelector('#compareButton').classList.toggle('active', state.compare);
  document.querySelector('#compareButton').setAttribute('aria-pressed', String(state.compare));
  document.querySelectorAll('[data-variant]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.variant === state.variant)));
  document.querySelectorAll('[data-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
  currentNote.innerHTML = `<b>${variants[state.variant].short} · ${variants[state.variant].name}</b><span>${variants[state.variant].note}</span>`;

  if (state.compare) {
    stage.innerHTML = `<div class="compare-stage">${Object.keys(variants).map((id) => `<div class="compare-preview"><div class="preview-label"><span><b>${variants[id].short}</b>${variants[id].name}</span>${variants[id].winner ? '<em>推荐最终版</em>' : ''}</div>${dockWindow(id, true)}</div>`).join('')}</div>`;
    comparison.hidden = false;
    comparison.innerHTML = renderComparison();
  } else {
    comparison.hidden = true;
    stage.innerHTML = dockWindow(state.variant);
  }

  bindWindowEvents();
  if (!state.compare && state.view === 'search') {
    requestAnimationFrame(() => document.querySelector('.search-input-wrap input')?.focus());
  }
}

function renderComparison() {
  const criteria = [
    ['核心效率', 'efficiency', '30%'],
    ['Windows 原生感', 'native', '25%'],
    ['信息清晰度', 'clarity', '20%'],
    ['视觉一致性', 'coherence', '15%'],
    ['实现风险', 'risk', '10%'],
  ];
  return `<div class="comparison-heading"><div><h2>统一评审结果</h2><p>分数按产品使用频率与 Windows 平台约束加权，不把“视觉新奇”单独列为优势。</p></div><span class="decision-badge">最终选择 C</span></div>
    <div class="score-table" role="table" aria-label="方案评分">
      <div class="score-row score-head" role="row"><span role="columnheader">评审项</span>${Object.values(variants).map((item) => `<span role="columnheader"><b>${item.short}</b>${item.name}</span>`).join('')}</div>
      ${criteria.map(([label, key, weight]) => `<div class="score-row" role="row"><span role="rowheader">${label}<small>${weight}</small></span>${Object.values(variants).map((item) => `<span role="cell"><i style="--score:${item.scores[key]}%"></i><b>${item.scores[key]}</b></span>`).join('')}</div>`).join('')}
      <div class="score-row total-row" role="row"><span role="rowheader">加权总分</span>${Object.values(variants).map((item) => `<span role="cell"><strong>${item.total.toFixed(1)}</strong>${item.winner ? '<em>最终版</em>' : ''}</span>`).join('')}</div>
    </div>
    <div class="decision-summary">
      <div><h3>为什么选择 C</h3><p>DesktopDock 是每天反复唤起的 Windows 工具。C 方案把装饰让位给内容，键盘路径最短，信息密度最稳，也最容易在 Win10/Win11、深浅主题与高 DPI 下保持一致。</p></div>
      <button type="button" data-choose-final>${icon('&#xE73E;')}查看最终版</button>
    </div>`;
}

function bindWindowEvents() {
  document.querySelectorAll('[data-open-search]').forEach((element) => element.addEventListener('click', () => changeView('search')));
  document.querySelectorAll('[data-launch]').forEach((element) => element.addEventListener('click', () => showToast(`已模拟启动 ${element.dataset.launch}`)));
  document.querySelectorAll('[data-open-result]').forEach((element) => element.addEventListener('click', () => showToast(`已模拟打开 ${element.dataset.openResult}`)));
  document.querySelectorAll('[data-category]').forEach((element) => element.addEventListener('click', () => showToast(`${element.dataset.category}分类 · ${categories.find((item) => item.name === element.dataset.category).count} 个应用`)));
  document.querySelectorAll('[data-file]').forEach((element) => element.addEventListener('click', () => showToast(`已模拟打开 ${element.dataset.file}`)));
  document.querySelectorAll('[data-inside-view]').forEach((element) => element.addEventListener('click', () => {
    const target = element.dataset.insideView;
    if (['home', 'search', 'settings'].includes(target)) changeView(target);
    else showToast(target === 'categories' ? '分类视图已在主界面展示' : '文件视图将在完整产品中接入系统最近文件');
  }));
  document.querySelectorAll('[data-setting-section]').forEach((element) => element.addEventListener('click', () => {
    state.settingsSection = element.dataset.settingSection;
    renderStage();
  }));
  document.querySelectorAll('[data-theme-choice]').forEach((element) => element.addEventListener('click', () => {
    state.dark = element.dataset.themeChoice === 'dark';
    renderStage();
  }));
  document.querySelectorAll('.toggle').forEach((element) => element.addEventListener('click', () => {
    const next = element.getAttribute('aria-checked') !== 'true';
    element.setAttribute('aria-checked', String(next));
    element.classList.toggle('on', next);
  }));
  document.querySelector('.clear-search')?.addEventListener('click', () => {
    state.query = '';
    state.resultIndex = 0;
    renderStage();
  });
  document.querySelector('.search-input-wrap input')?.addEventListener('input', (event) => {
    state.query = event.target.value;
    state.resultIndex = 0;
    renderStage();
  });
  document.querySelectorAll('[data-search-type]').forEach((element) => element.addEventListener('click', () => {
    state.searchType = element.dataset.searchType;
    state.resultIndex = 0;
    renderStage();
  }));
  document.querySelector('[data-choose-final]')?.addEventListener('click', () => {
    state.variant = 'native';
    state.view = 'home';
    state.compare = false;
    renderStage();
  });
}

function changeView(view) {
  state.view = view;
  state.compare = false;
  createControls();
  renderStage();
}

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
}

document.querySelector('#variantControls').addEventListener('click', (event) => {
  const button = event.target.closest('[data-variant]');
  if (!button) return;
  state.variant = button.dataset.variant;
  state.compare = false;
  renderStage();
});

document.querySelector('#viewControls').addEventListener('click', (event) => {
  const button = event.target.closest('[data-view]');
  if (button) changeView(button.dataset.view);
});

document.querySelector('#themeToggle').addEventListener('click', () => {
  state.dark = !state.dark;
  renderStage();
});

document.querySelector('#compareButton').addEventListener('click', () => {
  state.compare = !state.compare;
  renderStage();
});

document.addEventListener('keydown', (event) => {
  if (event.altKey && event.code === 'Space') {
    event.preventDefault();
    changeView('search');
    return;
  }
  if (event.key === 'Escape' && state.view === 'search') {
    changeView('home');
    return;
  }
  if (state.view === 'search' && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    const count = document.querySelectorAll('.result-row').length || 1;
    state.resultIndex = event.key === 'ArrowDown' ? (state.resultIndex + 1) % count : (state.resultIndex - 1 + count) % count;
    renderStage();
    return;
  }
  if (state.view === 'search' && event.key === 'Enter') {
    const selected = document.querySelector('.result-row.selected');
    if (selected) showToast(`已模拟打开 ${selected.dataset.openResult}`);
  }
});

createControls();
renderStage();
