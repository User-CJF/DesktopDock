const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createTodoService } = require('../src/main/services/todo-service.cjs');

test('todo service persists detail fields, completion and order', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'desktopdock-todo-'));
  const todos = createTodoService(path.join(directory, 'data.db'));
  const first = todos.create({ title: '提交周报', color: 'green', recurrence: 'weekly', reminderAt: '2026-09-01T08:00', attachments: ['C:\\work\\report.docx'] });
  const second = todos.create({ title: '整理桌面', color: 'blue' });
  const updated = todos.update(first.id, { title: first.title, completed: true, dueAt: '2026-09-02T18:00' });
  assert.equal(updated.completed, true);
  assert.equal(updated.recurrence, 'weekly');
  assert.equal(updated.attachments.length, 1);
  assert.equal(todos.list().filter((item) => item.title === '提交周报').length, 2);
  assert.equal(todos.dueReminders('2026-09-01T09:00:00.000Z').length, 0);
  todos.reorder([second.id, first.id]);
  assert.equal(todos.list().find((item) => !item.completed).id, second.id);
  assert.deepEqual(todos.remove(first.id), { success: true });
  todos.close();
});
