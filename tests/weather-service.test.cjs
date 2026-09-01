const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createWeatherService, normalizeCity } = require('../src/main/services/weather-service.cjs');

test('fetches, normalizes, and caches a city forecast', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'desktopdock-weather-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const calls = [];
  const fetchJson = async (url) => {
    calls.push(url);
    if (url.includes('geocoding-api')) return { results: [{ name: '深圳', admin1: '广东', latitude: 22.54, longitude: 114.06 }] };
    return {
      timezone: 'Asia/Shanghai',
      current: { time: '2026-09-01T10:00', temperature_2m: 31.2, apparent_temperature: 34.1, relative_humidity_2m: 69, precipitation_probability: 18, weather_code: 2, wind_speed_10m: 9.4 },
      hourly: { time: ['2026-09-01T09:00', '2026-09-01T10:00', '2026-09-01T11:00'], temperature_2m: [30, 31, 32], weather_code: [1, 2, 2], precipitation_probability: [10, 18, 20] },
    };
  };
  const service = createWeatherService(path.join(directory, 'weather.json'), fetchJson);
  const first = await service.get('深圳');
  assert.equal(first.locationName, '深圳 · 广东');
  assert.equal(first.current.temperature, 31.2);
  assert.equal(first.hourly.length, 2);
  const second = await service.get('深圳');
  assert.equal(second.cached, true);
  assert.equal(calls.length, 2);
  assert.equal(normalizeCity(' 上海 '), '上海');
  assert.throws(() => normalizeCity(''), /无效/);
});

