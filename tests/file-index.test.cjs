const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createFileIndex } = require('../src/main/services/file-index.cjs');

test('indexes configured roots, opens by opaque id, and reconciles changes', async (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'desktopdock-files-'));
  t.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));
  const documents = path.join(temporaryDirectory, 'documents');
  const custom = path.join(temporaryDirectory, 'custom');
  fs.mkdirSync(documents);
  fs.mkdirSync(custom);
  fs.writeFileSync(path.join(documents, '方案.docx'), 'proposal');
  fs.writeFileSync(path.join(custom, 'notes.md'), 'notes');

  const index = createFileIndex(path.join(temporaryDirectory, 'data.db'), [
    { id: 'documents', name: '文档', directory: documents, isSystem: true },
  ]);
  assert.equal(index.addRoot(custom, '资料').name, '资料');
  const scanned = await index.rescan();
  assert.equal(scanned.total, 2);
  assert.equal(index.search('方案').length, 1);
  const item = index.listRecent().find((file) => file.name === '方案.docx');
  let openedPath = null;
  assert.deepEqual(await index.open(item.id, async (target) => { openedPath = target; return ''; }), { success: true });
  assert.equal(openedPath, path.join(documents, '方案.docx'));
  assert.equal(index.listRecent().find((file) => file.id === item.id).openCount, 1);
  assert.deepEqual(index.clearRecent(), { success: true });
  assert.equal(index.listRecent().find((file) => file.id === item.id).openCount, 0);
  fs.unlinkSync(path.join(custom, 'notes.md'));
  assert.equal((await index.rescan()).removed, 1);
  assert.throws(() => index.removeRoot('documents'), /不可删除/);
  index.close();
});
