const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createShortcutBoard } = require('../src/main/services/shortcut-board.cjs');

test('shortcut board keeps the warehouse fixed and user categories removable', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'desktopdock-board-'));
  const board = createShortcutBoard(path.join(directory, 'data.db'));
  const shortcut = { id: 'shortcut_11111111111111111111', name: 'Code', location: 'stowed', managed: true };
  const category = board.create({ name: '开发', color: '#1677ff' });
  assert.equal(board.categories([shortcut]).length, 1);
  board.assign(shortcut.id, category.id);
  assert.equal(board.annotate([shortcut])[0].categoryId, category.id);
  assert.equal(board.categories([shortcut])[0].count, 1);
  board.remove(category.id);
  assert.equal(board.annotate([shortcut])[0].categoryId, null);
  assert.deepEqual(board.categories([shortcut]), []);
  board.close();
});
