const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const CATEGORY_COLORS = new Set(['#1677ff', '#00a870', '#d97706', '#d84a4a', '#7c5ce7', '#168aad', '#697386', '#c2417d']);

function validateName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > 20 || /[\r\n\u0000]/u.test(name)) throw new Error('分类名称应为 1–20 个字符');
  return name;
}

function validateColor(value) {
  return CATEGORY_COLORS.has(value) ? value : '#1677ff';
}

function createShortcutBoard(databasePath) {
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS shortcut_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shortcut_assignments (
      shortcut_id TEXT PRIMARY KEY,
      category_id TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  function categories(shortcuts = []) {
    const counts = new Map();
    const validIds = new Set(shortcuts.map((item) => item.id));
    for (const row of database.prepare('SELECT shortcut_id AS shortcutId, category_id AS categoryId FROM shortcut_assignments').all()) {
      if (validIds.has(row.shortcutId) && row.categoryId) counts.set(row.categoryId, (counts.get(row.categoryId) || 0) + 1);
    }
    return database.prepare(`SELECT id, name, color, sort_order AS sortOrder FROM shortcut_categories ORDER BY sort_order, created_at`).all()
      .map((item) => ({ ...item, count: counts.get(item.id) || 0 }));
  }

  function annotate(shortcuts) {
    const assignments = new Map(database.prepare('SELECT shortcut_id AS shortcutId, category_id AS categoryId FROM shortcut_assignments').all()
      .map((item) => [item.shortcutId, item.categoryId]));
    const categoryIds = new Set(categories().map((item) => item.id));
    return shortcuts.map((item) => ({ ...item, categoryId: categoryIds.has(assignments.get(item.id)) ? assignments.get(item.id) : null }));
  }

  function create(input = {}) {
    const name = validateName(input.name);
    const color = validateColor(input.color);
    const duplicate = database.prepare('SELECT 1 FROM shortcut_categories WHERE name = ? COLLATE NOCASE').get(name);
    if (duplicate) throw new Error('已有同名分类');
    const id = `group_${crypto.randomBytes(10).toString('hex')}`;
    const sortOrder = database.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS value FROM shortcut_categories').get().value;
    const now = new Date().toISOString();
    database.prepare('INSERT INTO shortcut_categories (id, name, color, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, name, color, sortOrder, now, now);
    return { id, name, color, sortOrder, count: 0 };
  }

  function update(id, input = {}) {
    if (typeof id !== 'string' || !/^group_[a-f0-9]{20}$/.test(id)) throw new Error('分类标识无效');
    const name = validateName(input.name);
    const color = validateColor(input.color);
    const duplicate = database.prepare('SELECT 1 FROM shortcut_categories WHERE name = ? COLLATE NOCASE AND id <> ?').get(name, id);
    if (duplicate) throw new Error('已有同名分类');
    const result = database.prepare('UPDATE shortcut_categories SET name = ?, color = ?, updated_at = ? WHERE id = ?')
      .run(name, color, new Date().toISOString(), id);
    if (!result.changes) throw new Error('分类不存在');
    return categories().find((item) => item.id === id);
  }

  function remove(id) {
    if (typeof id !== 'string' || !/^group_[a-f0-9]{20}$/.test(id)) throw new Error('分类标识无效');
    database.exec('BEGIN IMMEDIATE');
    try {
      database.prepare('UPDATE shortcut_assignments SET category_id = NULL, updated_at = ? WHERE category_id = ?').run(new Date().toISOString(), id);
      const result = database.prepare('DELETE FROM shortcut_categories WHERE id = ?').run(id);
      if (!result.changes) throw new Error('分类不存在');
      database.exec('COMMIT');
      return { success: true };
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  function assign(shortcutId, categoryId = null) {
    if (typeof shortcutId !== 'string' || !/^shortcut_[a-f0-9]{20}$/.test(shortcutId)) throw new Error('快捷方式标识无效');
    if (categoryId !== null) {
      if (typeof categoryId !== 'string' || !database.prepare('SELECT 1 FROM shortcut_categories WHERE id = ?').get(categoryId)) throw new Error('目标分类不存在');
    }
    database.prepare(`INSERT INTO shortcut_assignments (shortcut_id, category_id, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(shortcut_id) DO UPDATE SET category_id=excluded.category_id, updated_at=excluded.updated_at`)
      .run(shortcutId, categoryId, new Date().toISOString());
    return { success: true, categoryId };
  }

  return { categories, annotate, create, update, remove, assign, close: () => database.close() };
}

module.exports = { CATEGORY_COLORS, createShortcutBoard, validateName };
