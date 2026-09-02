const { contextBridge, ipcRenderer, webUtils } = require('electron');

const api = Object.freeze({
  isElectron: true,
  window: Object.freeze({
    minimize: () => ipcRenderer.invoke('dd:window:minimize'),
    maximize: () => ipcRenderer.invoke('dd:window:maximize'),
    close: () => ipcRenderer.invoke('dd:window:close'),
    hide: () => ipcRenderer.invoke('dd:window:hide'),
    quit: () => ipcRenderer.invoke('dd:window:quit'),
  }),
  theme: Object.freeze({
    get: () => ipcRenderer.invoke('dd:theme:get'),
    set: (theme) => ipcRenderer.invoke('dd:theme:set', theme),
    onChanged: (callback) => {
      const listener = (_event, theme) => callback(theme);
      ipcRenderer.on('dd:theme:changed', listener);
      return () => ipcRenderer.removeListener('dd:theme:changed', listener);
    },
  }),
  shortcuts: Object.freeze({
    get: () => ipcRenderer.invoke('dd:shortcuts:get'),
  }),
  apps: Object.freeze({
    list: (options) => ipcRenderer.invoke('dd:app:list', options),
    rescan: () => ipcRenderer.invoke('dd:app:rescan'),
    launch: (appId) => ipcRenderer.invoke('dd:app:launch', { appId }),
    reveal: (appId) => ipcRenderer.invoke('dd:app:reveal', { appId }),
    icon: (appId) => ipcRenderer.invoke('dd:app:icon', { appId }),
    setPinned: (appId, pinned) => ipcRenderer.invoke('dd:app:set-pinned', { appId, pinned }),
    setCategory: (appId, categoryId) => ipcRenderer.invoke('dd:app:set-category', { appId, categoryId }),
  }),
  categories: Object.freeze({
    list: () => ipcRenderer.invoke('dd:category:list'),
    create: (category) => ipcRenderer.invoke('dd:category:create', category),
    update: (category) => ipcRenderer.invoke('dd:category:update', category),
    delete: (id) => ipcRenderer.invoke('dd:category:delete', { id }),
  }),
  index: Object.freeze({
    getStatus: () => ipcRenderer.invoke('dd:index:status'),
    onUpdated: (callback) => {
      const listener = (_event, status) => callback(status);
      ipcRenderer.on('dd:index:updated', listener);
      return () => ipcRenderer.removeListener('dd:index:updated', listener);
    },
  }),
  files: Object.freeze({
    pathForFile: (file) => webUtils.getPathForFile(file),
    list: (limit) => ipcRenderer.invoke('dd:file:list', { limit }),
    search: (query, limit) => ipcRenderer.invoke('dd:file:search', { query, limit }),
    rescan: () => ipcRenderer.invoke('dd:file:rescan'),
    open: (fileId) => ipcRenderer.invoke('dd:file:open', { fileId }),
    thumbnail: (fileId) => ipcRenderer.invoke('dd:file:thumbnail', { fileId }),
    reveal: (fileId) => ipcRenderer.invoke('dd:file:reveal', { fileId }),
    clearRecent: () => ipcRenderer.invoke('dd:file:clear-recent'),
    roots: () => ipcRenderer.invoke('dd:file:roots'),
    addRoot: () => ipcRenderer.invoke('dd:file:add-root'),
    removeRoot: (rootId) => ipcRenderer.invoke('dd:file:remove-root', { rootId }),
    openRoot: (rootId) => ipcRenderer.invoke('dd:file:open-root', { rootId }),
    status: () => ipcRenderer.invoke('dd:file:status'),
    rename: (fileId, name) => ipcRenderer.invoke('dd:file:rename', { fileId, name }),
    delete: (fileId) => ipcRenderer.invoke('dd:file:delete', { fileId }),
    import: (rootId, paths) => ipcRenderer.invoke('dd:file:import', { rootId, paths }),
    onUpdated: (callback) => {
      const listener = (_event, status) => callback(status);
      ipcRenderer.on('dd:file-index:updated', listener);
      return () => ipcRenderer.removeListener('dd:file-index:updated', listener);
    },
  }),
  board: Object.freeze({
    get: () => ipcRenderer.invoke('dd:board:get'),
    createCategory: (category) => ipcRenderer.invoke('dd:board:category-create', category),
    updateCategory: (category) => ipcRenderer.invoke('dd:board:category-update', category),
    deleteCategory: (id) => ipcRenderer.invoke('dd:board:category-delete', { id }),
    assign: (shortcutId, categoryId) => ipcRenderer.invoke('dd:board:assign', { shortcutId, categoryId }),
    import: (paths, categoryId = null) => ipcRenderer.invoke('dd:board:import', { paths, categoryId }),
    pick: (categoryId = null) => ipcRenderer.invoke('dd:board:pick', { categoryId }),
  }),
  desktop: Object.freeze({
    scan: () => ipcRenderer.invoke('dd:desktop:scan'),
    organize: () => ipcRenderer.invoke('dd:desktop:organize'),
    restoreLast: () => ipcRenderer.invoke('dd:desktop:restore-last'),
    restorePoints: () => ipcRenderer.invoke('dd:desktop:restore-points'),
    shortcutIcon: (shortcutId) => ipcRenderer.invoke('dd:desktop:shortcut-icon', { shortcutId }),
    launchShortcut: (shortcutId) => ipcRenderer.invoke('dd:desktop:shortcut-launch', { shortcutId }),
    stowShortcuts: () => ipcRenderer.invoke('dd:desktop:shortcut-stow'),
    restoreShortcuts: () => ipcRenderer.invoke('dd:desktop:shortcut-restore'),
  }),
  weather: Object.freeze({
    get: (city, force = false) => ipcRenderer.invoke('dd:weather:get', { city, force }),
    getByCoordinates: (latitude, longitude, force = false) => ipcRenderer.invoke('dd:weather:get-coordinates', { latitude, longitude, force }),
  }),
  media: Object.freeze({
    control: (action) => ipcRenderer.invoke('dd:media:control', { action }),
    status: () => ipcRenderer.invoke('dd:media:status'),
  }),
  search: Object.freeze({
    web: (query) => ipcRenderer.invoke('dd:search:web', { query }),
  }),
  todo: Object.freeze({
    list: () => ipcRenderer.invoke('dd:todo:list'),
    create: (todo) => ipcRenderer.invoke('dd:todo:create', todo),
    update: (todo) => ipcRenderer.invoke('dd:todo:update', todo),
    delete: (id) => ipcRenderer.invoke('dd:todo:delete', { id }),
    reorder: (ids) => ipcRenderer.invoke('dd:todo:reorder', { ids }),
    pickAttachments: () => ipcRenderer.invoke('dd:todo:pick-attachments'),
  }),
  settings: Object.freeze({
    get: () => ipcRenderer.invoke('dd:settings:get'),
    set: (key, value) => ipcRenderer.invoke('dd:settings:set', { key, value }),
    export: () => ipcRenderer.invoke('dd:settings:export'),
    import: () => ipcRenderer.invoke('dd:settings:import'),
    clearStats: () => ipcRenderer.invoke('dd:settings:clear-stats'),
    onChanged: (callback) => {
      const listener = (_event, settings) => callback(settings);
      ipcRenderer.on('dd:settings:changed', listener);
      return () => ipcRenderer.removeListener('dd:settings:changed', listener);
    },
  }),
  about: Object.freeze({ get: () => ipcRenderer.invoke('dd:about') }),
  onShowSearch: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('dd:search:show', listener);
    return () => ipcRenderer.removeListener('dd:search:show', listener);
  },
});

contextBridge.exposeInMainWorld('desktopDock', api);
