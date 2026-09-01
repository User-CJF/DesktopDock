<template>
  <main class="dock-shell" id="desktopApp">
    <header class="dock-titlebar">
      <div class="dock-brand">
        <span class="dock-brand-mark fluent-icon" aria-hidden="true">&#xE80A;</span>
        <span><strong>桌面舱</strong><small id="dockStatus">正在连接桌面</small></span>
      </div>
      <div class="dock-window-actions" aria-label="状态栏控制">
        <button type="button" data-action="new-category" title="新建分类" aria-label="新建应用分类"><span class="fluent-icon" aria-hidden="true">&#xE710;</span></button>
        <button type="button" data-action="open-settings" title="设置" aria-label="打开桌面舱设置"><span class="fluent-icon" aria-hidden="true">&#xE713;</span></button>
        <button type="button" data-action="refresh-all" title="刷新" aria-label="刷新桌面数据"><span class="fluent-icon" aria-hidden="true">&#xE72C;</span></button>
        <button type="button" data-action="hide-dock" title="隐藏到托盘" aria-label="隐藏到托盘"><span class="fluent-icon" aria-hidden="true">&#xE738;</span></button>
      </div>
    </header>

    <section class="dock-search" aria-label="快速搜索">
      <span class="fluent-icon" aria-hidden="true">&#xE721;</span>
      <label class="sr-only" for="dockSearch">搜索应用、快捷方式和文件</label>
      <input id="dockSearch" type="search" autocomplete="off" placeholder="搜索应用、快捷方式和文件" />
      <kbd>Alt + Space</kbd>
    </section>
    <section class="dock-search-results" id="dockSearchResults" aria-label="搜索结果" hidden></section>

    <section class="dock-content" id="dockContent" tabindex="-1" aria-live="polite"></section>
    <footer class="dock-summary" id="dockSummary" aria-live="polite"></footer>
  </main>

  <div class="dock-dialog-layer" id="dockDialogLayer" hidden>
    <section class="dock-dialog" id="dockDialog" role="dialog" aria-modal="true" aria-labelledby="dockDialogTitle"></section>
  </div>
  <div class="dock-toast" id="dockToast" role="status" aria-live="polite"></div>
</template>
