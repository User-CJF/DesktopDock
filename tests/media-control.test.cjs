const assert = require('node:assert/strict');
const test = require('node:test');
const { MEDIA_KEYS, resolveMediaKey } = require('../src/main/services/media-control.cjs');

test('only resolves the supported Windows media actions', () => {
  assert.equal(resolveMediaKey('playPause'), MEDIA_KEYS.playPause);
  assert.equal(resolveMediaKey('next'), 0xB0);
  assert.throws(() => resolveMediaKey('launch-program'), /不支持/);
});
