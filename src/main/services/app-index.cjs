const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const APP_EXTENSIONS = new Set(['.lnk', '.url', '.exe', '.appref-ms']);
const MAX_SCANNED_ENTRIES = 5000;
const NON_APP_NAME = /(^|\s)(uninstall|help|documentation|readme|release notes|manual|tutorial|samples?|homepage|support forum|web site|on the web|online scores?)(\s|$)|卸载|帮助|文档|使用说明|app下载/i;
const CATEGORY_ICONS = new Set(['📄', '🎨', '💻', '🎮', '💬', '🔧', '📁', '📚', '🧰', '🎬', '🗂️', '🧪']);
const DEFAULT_CATEGORIES = [
  ['office', '办公', '📄', '#4f6bff', 0],
  ['design', '设计', '🎨', '#d95361', 1],
  ['dev', '开发', '💻', '#7953c6', 2],
  ['fun', '娱乐', '🎮', '#168a74', 3],
  ['social', '社交', '💬', '#087f9b', 4],
  ['tools', '工具', '🔧', '#a56300', 5],
  ['other', '其他', '📁', '#697386', 6],
];

function applicationId(launchPath) {
  const digest = crypto.createHash('sha256').update(launchPath.toLowerCase()).digest('hex').slice(0, 20);
  return `app_${digest}`;
}

function inferCategory(name, launchPath) {
  const value = `${name} ${launchPath}`.toLowerCase();
  const groups = [
    ['开发', ['visual studio', 'vscode', 'developer', 'powershell', 'terminal', 'git', 'docker', 'python', 'node.js', 'jetbrains', 'anaconda', 'jupyter', 'pycharm', 'webstorm', 'intellij', 'hbuilder', 'apifox', 'postman', 'navicat', 'sql server', 'azure data studio', 'windows kits', 'sdk', 'unity', 'ollama', 'spyder']],
    ['设计', ['figma', 'photoshop', 'illustrator', 'blender', 'sketch', 'adobe', '蓝湖', 'axure']],
    ['办公', ['office', 'word', 'excel', 'powerpoint', 'outlook', 'notion', 'wps', '文档', 'aippt', 'typora', 'onedrive', 'pdf']],
    ['社交', ['wechat', '微信', 'qq', 'teams', 'slack', 'discord', 'telegram', 'mumble', 'oopz']],
    ['娱乐', ['steam', 'game', 'music', '音乐', 'video', '视频', 'spotify', 'wallpaper engine', 'cheat engine']],
    ['工具', ['utility', 'tool', '7-zip', 'winrar', 'everything', 'settings', '设置', 'chrome', 'edge', 'firefox', 'explorer', 'virtualbox', 'vmware', 'vpn', 'remote desktop', 'todesk', '加速器', 'furmark', 'magnify', 'narrator', 'keyboard', 'accessibility']],
  ];
  return groups.find(([, keywords]) => keywords.some((keyword) => value.includes(keyword)))?.[0] || '其他';
}

async function scanRoot(root) {
  const entries = [];
  const pending = [root.directory];
  let visited = 0;

  try {
    await fs.promises.access(root.directory, fs.constants.R_OK);
  } catch (error) {
    return { source: root.source, available: false, entries, error: error.code === 'ENOENT' ? null : error.message };
  }

  while (pending.length && visited < MAX_SCANNED_ENTRIES) {
    const directory = pending.pop();
    let children;
    try {
      children = await fs.promises.readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const child of children) {
      if (visited >= MAX_SCANNED_ENTRIES) break;
      const fullPath = path.join(directory, child.name);
      if (child.isDirectory()) {
        pending.push(fullPath);
        continue;
      }
      const extension = path.extname(child.name).toLowerCase();
      if (!child.isFile() || !APP_EXTENSIONS.has(extension)) continue;

      visited += 1;
      try {
        const stat = await fs.promises.stat(fullPath);
        const name = path.parse(child.name).name.trim().slice(0, 200);
        if (!name || NON_APP_NAME.test(name) || (extension === '.url' && root.source.startsWith('start_menu'))) continue;
        entries.push({
          id: applicationId(fullPath),
          name,
          launchPath: fullPath,
          source: root.source,
          category: inferCategory(name, fullPath),
          mtimeMs: Math.trunc(stat.mtimeMs),
        });
      } catch {
        // A shortcut can disappear while the scan is in progress; the next scan reconciles it.
      }
    }
  }

  return { source: root.source, available: true, entries, error: null };
}

async function scanWindowsApps(roots) {
  const results = await Promise.all(roots.map(scanRoot));
  const byPath = new Map();
  for (const result of results) {
    for (const entry of result.entries) byPath.set(entry.launchPath.toLowerCase(), entry);
  }
  const sourcePriority = { start_menu_user: 0, start_menu_public: 1, desktop_user: 2, desktop_public: 3 };
  const byName = new Map();
  for (const entry of [...byPath.values()].sort((left, right) => (sourcePriority[left.source] ?? 9) - (sourcePriority[right.source] ?? 9))) {
    const key = entry.name.toLocaleLowerCase('zh-CN').replace(/\s+/g, ' ');
    if (!byName.has(key)) byName.set(key, entry);
  }
  return {
    entries: [...byName.values()],
    scannedSources: results.filter((result) => result.available).map((result) => result.source),
    errors: results.filter((result) => result.error).map((result) => ({ source: result.source, message: result.error })),
  };
}

function createAppIndex(databasePath, roots) {
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      launch_path TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '其他',
      mtime_ms INTEGER NOT NULL DEFAULT 0,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_apps_name ON apps(name);
    CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_preset INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS usage_stats (
      app_id TEXT PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
      launch_count INTEGER NOT NULL DEFAULT 0,
      last_launch_at TEXT
    );
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const initializedAt = new Date().toISOString();
  const seedCategory = database.prepare(`
    INSERT OR IGNORE INTO categories (id, name, icon, color, sort_order, is_preset, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);
  for (const category of DEFAULT_CATEGORIES) seedCategory.run(...category, initializedAt, initializedAt);

  const selectExisting = database.prepare('SELECT id, name, launch_path, source, category, mtime_ms FROM apps');
  const upsertApp = database.prepare(`
    INSERT INTO apps (id, name, launch_path, source, category, mtime_ms, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(launch_path) DO UPDATE SET
      name = excluded.name,
      source = excluded.source,
      mtime_ms = excluded.mtime_ms,
      updated_at = excluded.updated_at
  `);
  const deleteApp = database.prepare('DELETE FROM apps WHERE id = ?');
  const setMetadata = database.prepare(`
    INSERT INTO metadata (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  async function rescan() {
    const scan = await scanWindowsApps(roots);
    const existing = selectExisting.all();
    const byPath = new Map(existing.map((item) => [item.launch_path.toLowerCase(), item]));
    const seenPaths = new Set();
    const scannedSources = new Set(scan.scannedSources);
    const now = new Date().toISOString();
    let added = 0;
    let updated = 0;
    let removed = 0;

    database.exec('BEGIN IMMEDIATE');
    try {
      for (const entry of scan.entries) {
        const key = entry.launchPath.toLowerCase();
        const previous = byPath.get(key);
        seenPaths.add(key);
        if (!previous) added += 1;
        else if (previous.name !== entry.name || previous.source !== entry.source
          || previous.mtime_ms !== entry.mtimeMs) updated += 1;
        upsertApp.run(entry.id, entry.name, entry.launchPath, entry.source, entry.category, entry.mtimeMs, now, now);
      }

      for (const previous of existing) {
        if (scannedSources.has(previous.source) && !seenPaths.has(previous.launch_path.toLowerCase())) {
          deleteApp.run(previous.id);
          removed += 1;
        }
      }

      setMetadata.run('last_scan_at', now);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }

    return { added, updated, removed, total: count(), errors: scan.errors, lastScanAt: now };
  }

  function list(limit = 500) {
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 1000) : 500;
    return database.prepare(`
      SELECT apps.id, apps.name, apps.source, apps.category, apps.pinned,
        COALESCE(usage_stats.launch_count, 0) AS launchCount,
        usage_stats.last_launch_at AS lastLaunchAt
      FROM apps
      LEFT JOIN usage_stats ON usage_stats.app_id = apps.id
      ORDER BY apps.pinned DESC, launchCount DESC,
        CASE apps.source
          WHEN 'desktop_user' THEN 0
          WHEN 'desktop_public' THEN 1
          WHEN 'start_menu_user' THEN 2
          ELSE 3
        END,
        apps.name COLLATE NOCASE ASC
      LIMIT ?
    `).all(safeLimit);
  }

  function count() {
    return database.prepare('SELECT COUNT(*) AS total FROM apps').get().total;
  }

  function status() {
    const row = database.prepare("SELECT value FROM metadata WHERE key = 'last_scan_at'").get();
    return { totalApps: count(), lastScanAt: row?.value || null };
  }

  function iconSource(id) {
    if (typeof id !== 'string' || !/^app_[a-f0-9]{20}$/.test(id)) return null;
    const row = database.prepare('SELECT launch_path AS launchPath, mtime_ms AS mtimeMs FROM apps WHERE id = ?').get(id);
    return row || null;
  }

  function categoryList() {
    return database.prepare(`
      SELECT categories.id, categories.name, categories.icon, categories.color,
        categories.sort_order AS sortOrder, categories.is_preset AS isPreset,
        COUNT(apps.id) AS count
      FROM categories
      LEFT JOIN apps ON apps.category = categories.name
      GROUP BY categories.id
      ORDER BY categories.sort_order ASC, categories.name COLLATE NOCASE ASC
    `).all();
  }

  function validateCategoryInput(input) {
    const name = typeof input?.name === 'string' ? input.name.trim() : '';
    if (!name || Array.from(name).length > 10) throw new Error('分类名称需为 1–10 个字符');
    if (/[\u0000-\u001f]/u.test(name)) throw new Error('分类名称包含不可用字符');
    if (!CATEGORY_ICONS.has(input.icon)) throw new Error('请选择可用的分类图标');
    if (typeof input.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(input.color)) throw new Error('分类颜色无效');
    return { name, icon: input.icon, color: input.color.toLowerCase() };
  }

  function createCategory(input) {
    const category = validateCategoryInput(input);
    if (database.prepare('SELECT 1 FROM categories WHERE name = ? COLLATE NOCASE').get(category.name)) {
      throw new Error('已存在同名分类');
    }
    const id = `cat_${crypto.randomBytes(8).toString('hex')}`;
    const sortOrder = database.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS value FROM categories').get().value;
    const now = new Date().toISOString();
    database.prepare(`
      INSERT INTO categories (id, name, icon, color, sort_order, is_preset, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).run(id, category.name, category.icon, category.color, sortOrder, now, now);
    return categoryList().find((item) => item.id === id);
  }

  function updateCategory(id, input) {
    const existing = database.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) throw new Error('分类不存在');
    if (existing.is_preset) throw new Error('默认分类不可修改');
    const category = validateCategoryInput(input);
    const duplicate = database.prepare('SELECT id FROM categories WHERE name = ? COLLATE NOCASE AND id <> ?').get(category.name, id);
    if (duplicate) throw new Error('已存在同名分类');
    const now = new Date().toISOString();
    database.exec('BEGIN IMMEDIATE');
    try {
      database.prepare('UPDATE categories SET name = ?, icon = ?, color = ?, updated_at = ? WHERE id = ?')
        .run(category.name, category.icon, category.color, now, id);
      database.prepare('UPDATE apps SET category = ?, updated_at = ? WHERE category = ?')
        .run(category.name, now, existing.name);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
    return categoryList().find((item) => item.id === id);
  }

  function deleteCategory(id) {
    const existing = database.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) throw new Error('分类不存在');
    if (existing.is_preset) throw new Error('默认分类不可删除');
    const now = new Date().toISOString();
    database.exec('BEGIN IMMEDIATE');
    try {
      database.prepare("UPDATE apps SET category = '其他', updated_at = ? WHERE category = ?").run(now, existing.name);
      database.prepare('DELETE FROM categories WHERE id = ?').run(id);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
    return { success: true };
  }

  function setPinned(id, pinned) {
    if (typeof id !== 'string' || !/^app_[a-f0-9]{20}$/.test(id) || typeof pinned !== 'boolean') {
      throw new Error('固定状态参数无效');
    }
    const result = database.prepare('UPDATE apps SET pinned = ?, updated_at = ? WHERE id = ?')
      .run(pinned ? 1 : 0, new Date().toISOString(), id);
    if (!result.changes) throw new Error('应用已不在索引中');
    return { success: true, pinned };
  }

  function setCategory(appId, categoryId) {
    if (typeof appId !== 'string' || !/^app_[a-f0-9]{20}$/.test(appId) || typeof categoryId !== 'string') {
      throw new Error('应用或分类参数无效');
    }
    const category = database.prepare('SELECT name FROM categories WHERE id = ?').get(categoryId);
    if (!category) throw new Error('目标分类不存在');
    const result = database.prepare('UPDATE apps SET category = ?, updated_at = ? WHERE id = ?')
      .run(category.name, new Date().toISOString(), appId);
    if (!result.changes) throw new Error('应用已不在索引中');
    return { success: true, category: category.name };
  }

  async function launch(id, openPath) {
    if (typeof id !== 'string' || !/^app_[a-f0-9]{20}$/.test(id)) return { success: false, error: '无效的应用标识' };
    const item = database.prepare('SELECT launch_path FROM apps WHERE id = ?').get(id);
    if (!item) return { success: false, error: '应用已不在索引中，请重新扫描' };

    try {
      await fs.promises.access(item.launch_path, fs.constants.R_OK);
      const error = await openPath(item.launch_path);
      if (error) return { success: false, error };
      database.prepare(`
        INSERT INTO usage_stats (app_id, launch_count, last_launch_at) VALUES (?, 1, ?)
        ON CONFLICT(app_id) DO UPDATE SET
          launch_count = launch_count + 1,
          last_launch_at = excluded.last_launch_at
      `).run(id, new Date().toISOString());
      return { success: true };
    } catch {
      return { success: false, error: '快捷方式不可访问，请重新扫描' };
    }
  }

  function resolveApp(id) {
    if (typeof id !== 'string' || !/^app_[a-f0-9]{20}$/.test(id)) return null;
    return database.prepare('SELECT launch_path AS launchPath FROM apps WHERE id = ?').get(id) || null;
  }

  function clearUsage() {
    database.prepare('DELETE FROM usage_stats').run();
    return { success: true };
  }

  return {
    rescan,
    list,
    status,
    launch,
    categoryList,
    createCategory,
    updateCategory,
    deleteCategory,
    setPinned,
    setCategory,
    iconSource,
    resolveApp,
    clearUsage,
    close: () => database.close(),
  };
}

module.exports = { applicationId, createAppIndex, inferCategory, scanWindowsApps };
