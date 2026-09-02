const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const TODO_COLORS = new Set(['blue', 'green', 'amber', 'red', 'purple', 'teal', 'slate', 'pink']);
const RECURRENCES = new Set(['none', 'daily', 'weekly', 'monthly']);

function cleanText(value, maximum, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > maximum || /\u0000/u.test(text)) throw new Error(`${label}内容无效`);
  return text;
}

function localDateTimeValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function createTodoService(databasePath) {
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'blue',
      due_at TEXT,
      reminder_at TEXT,
      reminder_notified_at TEXT,
      recurrence TEXT NOT NULL DEFAULT 'none',
      attachments TEXT NOT NULL DEFAULT '[]',
      pinned INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  if (!database.prepare('PRAGMA table_info(todos)').all().some((column) => column.name === 'reminder_notified_at')) {
    database.exec('ALTER TABLE todos ADD COLUMN reminder_notified_at TEXT');
  }
  if (!database.prepare('PRAGMA table_info(todos)').all().some((column) => column.name === 'pinned')) {
    database.exec('ALTER TABLE todos ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0');
  }

  const parse = (row) => row ? ({
    ...row,
    completed: Boolean(row.completed),
    pinned: Boolean(row.pinned),
    attachments: (() => { try { return JSON.parse(row.attachments); } catch { return []; } })(),
  }) : null;

  function list() {
    return database.prepare(`SELECT id, title, notes, color, due_at AS dueAt, reminder_at AS reminderAt, reminder_notified_at AS reminderNotifiedAt,
      recurrence, attachments, pinned, completed, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt
      FROM todos ORDER BY pinned DESC, completed, sort_order, created_at`).all().map(parse);
  }

  function normalize(input, existing = {}) {
    const title = cleanText(input.title ?? existing.title, 120, '任务标题');
    const notesValue = input.notes ?? existing.notes ?? '';
    const notes = typeof notesValue === 'string' && notesValue.length <= 4000 && !/\u0000/u.test(notesValue) ? notesValue.trim() : '';
    const color = TODO_COLORS.has(input.color) ? input.color : (existing.color || 'blue');
    const recurrence = RECURRENCES.has(input.recurrence) ? input.recurrence : (existing.recurrence || 'none');
    const dueAt = input.dueAt === '' ? null : (input.dueAt ?? existing.dueAt ?? null);
    const reminderAt = input.reminderAt === '' ? null : (input.reminderAt ?? existing.reminderAt ?? null);
    const attachments = Array.isArray(input.attachments) ? input.attachments.slice(0, 20).filter((item) => typeof item === 'string' && item.length <= 1024) : (existing.attachments || []);
    return { title, notes, color, recurrence, dueAt, reminderAt, attachments };
  }

  function create(input = {}) {
    const todo = normalize(input);
    const id = `todo_${crypto.randomBytes(10).toString('hex')}`;
    const sortOrder = database.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS value FROM todos').get().value;
    const now = new Date().toISOString();
    database.prepare(`INSERT INTO todos (id, title, notes, color, due_at, reminder_at, recurrence, attachments, pinned, completed, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`).run(id, todo.title, todo.notes, todo.color, todo.dueAt, todo.reminderAt, todo.recurrence, JSON.stringify(todo.attachments), input.pinned ? 1 : 0, sortOrder, now, now);
    return list().find((item) => item.id === id);
  }

  function update(id, input = {}) {
    const existing = list().find((item) => item.id === id);
    if (!existing) throw new Error('任务不存在');
    const todo = normalize(input, existing);
    const completed = typeof input.completed === 'boolean' ? input.completed : existing.completed;
    const pinned = typeof input.pinned === 'boolean' ? input.pinned : existing.pinned;
    const reminderNotifiedAt = todo.reminderAt === existing.reminderAt ? existing.reminderNotifiedAt : null;
    database.prepare(`UPDATE todos SET title=?, notes=?, color=?, due_at=?, reminder_at=?, reminder_notified_at=?, recurrence=?, attachments=?, pinned=?, completed=?, updated_at=? WHERE id=?`)
      .run(todo.title, todo.notes, todo.color, todo.dueAt, todo.reminderAt, reminderNotifiedAt, todo.recurrence, JSON.stringify(todo.attachments), pinned ? 1 : 0, completed ? 1 : 0, new Date().toISOString(), id);
    if (!existing.completed && completed && todo.recurrence !== 'none') {
      const advance = (value) => {
        if (!value) return null;
        const date = new Date(value);
        if (todo.recurrence === 'daily') date.setDate(date.getDate() + 1);
        if (todo.recurrence === 'weekly') date.setDate(date.getDate() + 7);
        if (todo.recurrence === 'monthly') date.setMonth(date.getMonth() + 1);
        return localDateTimeValue(date);
      };
      create({ ...todo, dueAt: advance(todo.dueAt), reminderAt: advance(todo.reminderAt) });
    }
    return list().find((item) => item.id === id);
  }

  function remove(id) {
    const result = database.prepare('DELETE FROM todos WHERE id = ?').run(id);
    if (!result.changes) throw new Error('任务不存在');
    return { success: true };
  }

  function reorder(ids) {
    if (!Array.isArray(ids) || ids.length > 1000) throw new Error('任务顺序无效');
    database.exec('BEGIN IMMEDIATE');
    try {
      const statement = database.prepare('UPDATE todos SET sort_order = ?, updated_at = ? WHERE id = ?');
      const now = new Date().toISOString();
      ids.forEach((id, index) => statement.run(index, now, id));
      database.exec('COMMIT');
      return { success: true };
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  function dueReminders(now = null) {
    const comparisonTime = now || localDateTimeValue();
    const due = database.prepare(`SELECT id, title, notes FROM todos WHERE completed = 0 AND reminder_at IS NOT NULL AND reminder_at <= ? AND reminder_notified_at IS NULL ORDER BY reminder_at LIMIT 20`).all(comparisonTime);
    if (!due.length) return [];
    const mark = database.prepare('UPDATE todos SET reminder_notified_at = ? WHERE id = ?');
    database.exec('BEGIN IMMEDIATE');
    try { due.forEach((item) => mark.run(new Date().toISOString(), item.id)); database.exec('COMMIT'); }
    catch (error) { database.exec('ROLLBACK'); throw error; }
    return due;
  }

  return { list, create, update, remove, reorder, dueReminders, close: () => database.close() };
}

module.exports = { TODO_COLORS, createTodoService };
