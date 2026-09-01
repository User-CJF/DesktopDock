const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULTS = Object.freeze({
  theme: 'system',
  accentColor: '#4f6bff',
  glassEffect: true,
  iconSize: 'medium',
  gridDensity: 'normal',
  autoStart: false,
  startMinimized: false,
  autoHideSearch: true,
  closeAfterLaunch: true,
  animations: true,
  hotkeySearch: 'Alt+Space',
  hotkeyMain: 'Alt+D',
  searchResultCount: 10,
});

function validateSetting(key, value) {
  if (!Object.hasOwn(DEFAULTS, key)) throw new Error('未知设置项');
  if (['glassEffect', 'autoStart', 'startMinimized', 'autoHideSearch', 'closeAfterLaunch', 'animations'].includes(key)) {
    if (typeof value !== 'boolean') throw new Error('设置值必须是布尔值');
  } else if (key === 'theme' && !['light', 'dark', 'system'].includes(value)) {
    throw new Error('主题设置无效');
  } else if (key === 'accentColor' && (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value))) {
    throw new Error('主色设置无效');
  } else if (key === 'iconSize' && !['small', 'medium', 'large'].includes(value)) {
    throw new Error('图标大小设置无效');
  } else if (key === 'gridDensity' && !['compact', 'normal', 'comfortable'].includes(value)) {
    throw new Error('网格密度设置无效');
  } else if (key === 'searchResultCount' && (!Number.isInteger(value) || value < 5 || value > 20)) {
    throw new Error('搜索结果数量应在 5–20 之间');
  } else if (['hotkeySearch', 'hotkeyMain'].includes(key)) {
    if (typeof value !== 'string' || value.length < 3 || value.length > 80 || /[\r\n]/.test(value)) throw new Error('快捷键设置无效');
  }
  return value;
}

function createSettingsStore(databasePath) {
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const insert = database.prepare(`INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`);
  const seededAt = new Date().toISOString();
  for (const [key, value] of Object.entries(DEFAULTS)) insert.run(key, JSON.stringify(value), seededAt);

  function get() {
    const result = { ...DEFAULTS };
    for (const row of database.prepare('SELECT key, value FROM settings').all()) {
      if (!Object.hasOwn(DEFAULTS, row.key)) continue;
      try {
        result[row.key] = validateSetting(row.key, JSON.parse(row.value));
      } catch {
        result[row.key] = DEFAULTS[row.key];
      }
    }
    return result;
  }

  function set(key, value) {
    const validValue = validateSetting(key, value);
    database.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`)
      .run(key, JSON.stringify(validValue), new Date().toISOString());
    return { success: true, key, value: validValue };
  }

  async function exportTo(filePath, extra = {}) {
    const payload = {
      format: 'desktopdock-config',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: get(),
      ...extra,
    };
    await fs.promises.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
    return { success: true, filePath };
  }

  async function importFrom(filePath) {
    const stat = await fs.promises.stat(filePath);
    if (stat.size > 1024 * 1024) throw new Error('配置文件过大');
    const payload = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
    if (payload?.format !== 'desktopdock-config' || payload.version !== 1 || !payload.settings || typeof payload.settings !== 'object') {
      throw new Error('不是有效的桌面舱配置文件');
    }
    const incoming = {};
    for (const [key, value] of Object.entries(payload.settings)) {
      if (Object.hasOwn(DEFAULTS, key)) incoming[key] = validateSetting(key, value);
    }
    database.exec('BEGIN IMMEDIATE');
    try {
      for (const [key, value] of Object.entries(incoming)) set(key, value);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
    const favoriteFolders = Array.isArray(payload.favoriteFolders) ? payload.favoriteFolders.slice(0, 50)
      .filter((folder) => folder && typeof folder.path === 'string' && folder.path.length <= 1024)
      .map((folder) => ({ name: typeof folder.name === 'string' ? folder.name.slice(0, 80) : path.basename(folder.path), path: path.resolve(folder.path) })) : [];
    return { success: true, settings: get(), favoriteFolders };
  }

  return { get, set, exportTo, importFrom, close: () => database.close() };
}

module.exports = { DEFAULTS, createSettingsStore, validateSetting };
