<template>
  <main class="dock-shell" id="desktopApp">
    <header class="dock-searchbar">
      <span class="dock-brand-mark" aria-hidden="true"></span>
      <span class="fluent-icon search-glyph" aria-hidden="true">&#xE721;</span>
      <label class="sr-only" for="dockSearch">搜索应用、文件或网页</label>
      <input id="dockSearch" type="search" autocomplete="off" placeholder="搜索应用、文件或网页" />
      <span class="dock-state" id="dockStatus">正在读取桌面</span>
      <button type="button" class="top-action" data-action="dashboard-settings" title="面板设置" aria-label="打开面板设置"><span class="fluent-icon" aria-hidden="true">&#xE713;</span></button>
      <button type="button" class="top-action" data-action="hide" title="隐藏到托盘" aria-label="隐藏到托盘"><span class="fluent-icon" aria-hidden="true">&#xE738;</span></button>
    </header>

    <section class="search-results" id="searchResults" aria-label="搜索结果" hidden></section>
    <section class="dock-content" id="dockContent" tabindex="-1" aria-live="polite"></section>
  </main>

  <div class="dock-dialog-layer" id="dockDialogLayer" hidden>
    <section class="dock-dialog" id="dockDialog" role="dialog" aria-modal="true" aria-labelledby="dockDialogTitle" aria-describedby="dockDialogDescription"></section>
  </div>
  <div class="dock-toast" id="dockToast" role="status" aria-live="polite"></div>
</template>
