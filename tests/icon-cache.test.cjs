const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createIconCache } = require('../src/main/services/icon-cache.cjs');

test('deduplicates extraction, caches PNG data, and refreshes stale entries', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'desktopdock-icons-'));
  const appId = 'app_0123456789abcdefabcd';
  let extractionCount = 0;
  let sourceMtime = 1;
  const cache = createIconCache(
    directory,
    async () => {
      extractionCount += 1;
      return { isEmpty: () => false, toPNG: () => Buffer.from(`png-${extractionCount}`) };
    },
    async (id) => id === appId ? { launchPath: 'C:\\Apps\\Example.lnk', mtimeMs: sourceMtime } : null,
  );

  const [first, concurrent] = await Promise.all([cache.get(appId), cache.get(appId)]);
  assert.equal(first, concurrent);
  assert.match(first, /^data:image\/png;base64,/);
  assert.equal(extractionCount, 1);

  const cached = await cache.get(appId);
  assert.equal(cached, first);
  assert.equal(extractionCount, 1);

  sourceMtime = Date.now() + 10_000;
  const refreshed = await cache.get(appId);
  assert.notEqual(refreshed, first);
  assert.equal(extractionCount, 2);
  assert.equal(await cache.get('invalid'), null);
});
