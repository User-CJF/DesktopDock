const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { classifyFile, createDesktopOrganizer } = require('../src/main/services/desktop-organizer.cjs');

test('classifies, moves without overwriting, and restores desktop files', async (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'desktopdock-organize-'));
  t.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));
  const desktop = path.join(temporaryDirectory, 'desktop');
  const documents = path.join(temporaryDirectory, 'documents');
  const pictures = path.join(temporaryDirectory, 'pictures');
  const downloads = path.join(temporaryDirectory, 'downloads');
  const videos = path.join(temporaryDirectory, 'videos');
  const restoreDirectory = path.join(temporaryDirectory, 'restore');
  [desktop, documents, pictures, downloads, videos].forEach((directory) => fs.mkdirSync(directory));
  fs.writeFileSync(path.join(desktop, '报告.docx'), 'new');
  fs.writeFileSync(path.join(desktop, '海报.png'), 'image');
  fs.writeFileSync(path.join(desktop, '软件.lnk'), 'shortcut');
  fs.mkdirSync(path.join(desktop, '项目文件夹'));
  fs.writeFileSync(path.join(documents, '报告.docx'), 'existing');

  const organizer = createDesktopOrganizer({
    desktopDirectory: desktop,
    restoreDirectory,
    destinations: { documents, images: pictures, videos, archives: downloads, other: path.join(documents, '其他') },
  });
  const preview = await organizer.scan();
  assert.deepEqual({ shortcuts: preview.shortcuts, files: preview.files, folders: preview.folders, conflicts: preview.conflicts }, { shortcuts: 1, files: 2, folders: 1, conflicts: 1 });
  const result = await organizer.organize();
  assert.equal(result.organized, 2);
  assert.equal(fs.readFileSync(path.join(documents, '报告.docx'), 'utf8'), 'existing');
  assert.equal(fs.readFileSync(path.join(documents, '报告 (1).docx'), 'utf8'), 'new');
  assert.equal(fs.existsSync(path.join(desktop, '软件.lnk')), true);
  assert.equal(fs.existsSync(path.join(desktop, '项目文件夹')), true);
  const restored = await organizer.restoreLast();
  assert.equal(restored.restored, 2);
  assert.equal(fs.existsSync(path.join(desktop, '报告.docx')), true);
  assert.equal(fs.existsSync(path.join(desktop, '海报.png')), true);
});

test('classification covers the documented file groups', () => {
  assert.equal(classifyFile('a.pdf'), 'documents');
  assert.equal(classifyFile('a.webp'), 'images');
  assert.equal(classifyFile('a.mp4'), 'videos');
  assert.equal(classifyFile('a.7z'), 'archives');
  assert.equal(classifyFile('a.url'), 'shortcuts');
  assert.equal(classifyFile('a.bin'), 'other');
});
