const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createAppIndex, inferCategory } = require('../src/main/services/app-index.cjs');

test('scans shortcuts, persists usage, and reconciles removed entries', async () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'desktopdock-index-'));
  const shortcuts = path.join(temporaryDirectory, 'shortcuts');
  const desktop = path.join(temporaryDirectory, 'desktop');
  fs.mkdirSync(shortcuts);
  fs.mkdirSync(desktop);
  fs.writeFileSync(path.join(shortcuts, 'Visual Studio Code.lnk'), 'test');
  fs.writeFileSync(path.join(shortcuts, '微信.url'), 'test');
  fs.writeFileSync(path.join(shortcuts, 'ignore.txt'), 'test');
  fs.writeFileSync(path.join(desktop, 'Visual Studio Code.lnk'), 'duplicate');

  const index = createAppIndex(path.join(temporaryDirectory, 'data.db'), [
    { source: 'test', directory: shortcuts },
    { source: 'desktop_public', directory: desktop },
  ]);
  const firstScan = await index.rescan();
  assert.equal(firstScan.added, 2);
  assert.equal(firstScan.total, 2);
  const vscode = index.list().find((app) => app.name === 'Visual Studio Code');
  assert.equal(vscode.category, '开发');
  assert.equal(index.categoryList().length, 7);

  const customCategory = index.createCategory({ name: '学习', icon: '📚', color: '#4f6bff' });
  assert.equal(index.categoryList().length, 8);
  assert.deepEqual(index.setPinned(vscode.id, true), { success: true, pinned: true });
  assert.equal(index.list()[0].id, vscode.id);
  assert.deepEqual(index.setCategory(vscode.id, customCategory.id), { success: true, category: '学习' });
  await index.rescan();
  assert.equal(index.list().find((item) => item.id === vscode.id).category, '学习');

  index.updateCategory(customCategory.id, { name: '学习资料', icon: '🧪', color: '#7953c6' });
  assert.equal(index.list().find((item) => item.id === vscode.id).category, '学习资料');
  index.deleteCategory(customCategory.id);
  assert.equal(index.list().find((item) => item.id === vscode.id).category, '其他');
  assert.throws(() => index.deleteCategory('office'), /默认分类不可删除/);
  assert.throws(() => index.createCategory({ name: '办公', icon: '📚', color: '#4f6bff' }), /已存在同名分类/);

  const app = index.list().find((item) => item.name === '微信');
  assert.deepEqual(await index.launch(app.id, async () => ''), { success: true });
  assert.equal(index.list().find((item) => item.id === app.id).launchCount, 1);

  fs.unlinkSync(path.join(shortcuts, '微信.url'));
  const secondScan = await index.rescan();
  assert.equal(secondScan.removed, 1);
  assert.equal(secondScan.total, 1);
  index.close();
});

test('categorizes common application names', () => {
  assert.equal(inferCategory('Figma', 'C:\\Apps\\Figma.lnk'), '设计');
  assert.equal(inferCategory('Steam', 'C:\\Games\\Steam.lnk'), '娱乐');
  assert.equal(inferCategory('Postman', 'C:\\Apps\\Postman.lnk'), '开发');
  assert.equal(inferCategory('Unknown', 'C:\\Apps\\Unknown.lnk'), '其他');
});
