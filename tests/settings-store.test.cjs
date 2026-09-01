const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createSettingsStore } = require('../src/main/services/settings-store.cjs');

test('persists validated settings and imports an exported config', async (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'desktopdock-settings-'));
  t.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));
  const databasePath = path.join(temporaryDirectory, 'data.db');
  const configPath = path.join(temporaryDirectory, 'config.json');
  const store = createSettingsStore(databasePath);
  assert.equal(store.get().theme, 'dark');
  store.set('theme', 'dark');
  store.set('searchResultCount', 15);
  store.set('weatherCity', '上海');
  assert.equal(store.get().theme, 'dark');
  assert.throws(() => store.set('accentColor', 'red'), /无效/);
  assert.throws(() => store.set('weatherCity', ''), /无效/);
  await store.exportTo(configPath);
  store.set('theme', 'light');
  assert.equal((await store.importFrom(configPath)).settings.theme, 'dark');
  store.close();
});
