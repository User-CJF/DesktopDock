const fs = require('node:fs');
const path = require('node:path');

const CACHE_MAX_AGE_MS = 30 * 60 * 1000;

function normalizeCity(value) {
  const city = typeof value === 'string' ? value.trim() : '';
  if (!city || city.length > 80 || /[\r\n\u0000]/u.test(city)) throw new Error('城市名称无效');
  return city;
}

async function requestJson(url) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new Error('无法连接天气服务，请检查网络后重试');
  }
  if (!response.ok) throw new Error(`天气服务暂时不可用（${response.status}）`);
  return response.json();
}

function createWeatherService(cachePath, fetchJson = requestJson) {
  let memoryCache = null;

  function readCache() {
    if (memoryCache) return memoryCache;
    try {
      const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (parsed?.city && parsed?.updatedAt && parsed?.current) memoryCache = parsed;
    } catch {
      // Missing or damaged cache is treated as an empty cache.
    }
    return memoryCache;
  }

  async function writeCache(payload) {
    memoryCache = payload;
    await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });
    const temporaryPath = `${cachePath}.${process.pid}.tmp`;
    await fs.promises.writeFile(temporaryPath, `${JSON.stringify(payload)}\n`, 'utf8');
    await fs.promises.rename(temporaryPath, cachePath);
  }

  function cachedFor(city) {
    const cached = readCache();
    if (!cached || cached.city.toLocaleLowerCase('zh-CN') !== city.toLocaleLowerCase('zh-CN')) return null;
    return cached;
  }

  async function forecastFor(location, city) {
    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
    forecastUrl.search = new URLSearchParams({
      latitude: String(location.latitude), longitude: String(location.longitude),
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure',
      hourly: 'temperature_2m,weather_code,precipitation_probability',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max',
      forecast_days: '7', timezone: 'auto',
    }).toString();
    const forecast = await fetchJson(forecastUrl.toString());
    if (!forecast?.current || !Array.isArray(forecast?.hourly?.time)) throw new Error('天气数据格式异常');
    const startIndex = Math.max(0, forecast.hourly.time.findIndex((time) => time >= forecast.current.time));
    const hourly = forecast.hourly.time.slice(startIndex, startIndex + 6).map((time, offset) => ({
      time, temperature: forecast.hourly.temperature_2m?.[startIndex + offset], weatherCode: forecast.hourly.weather_code?.[startIndex + offset], precipitationProbability: forecast.hourly.precipitation_probability?.[startIndex + offset],
    }));
    const payload = {
      city, locationName: [location.name, location.admin1].filter(Boolean).join(' · ') || city,
      latitude: location.latitude, longitude: location.longitude, updatedAt: new Date().toISOString(), timezone: forecast.timezone,
      current: {
        time: forecast.current.time, temperature: forecast.current.temperature_2m, apparentTemperature: forecast.current.apparent_temperature,
        relativeHumidity: forecast.current.relative_humidity_2m, precipitationProbability: forecast.current.precipitation_probability,
        weatherCode: forecast.current.weather_code, windSpeed: forecast.current.wind_speed_10m, windDirection: forecast.current.wind_direction_10m, pressure: forecast.current.surface_pressure,
      },
      hourly,
      daily: Array.isArray(forecast.daily?.time) ? forecast.daily.time.map((time, index) => ({
        time, weatherCode: forecast.daily.weather_code?.[index], temperatureMax: forecast.daily.temperature_2m_max?.[index], temperatureMin: forecast.daily.temperature_2m_min?.[index],
        sunrise: forecast.daily.sunrise?.[index], sunset: forecast.daily.sunset?.[index], uvIndex: forecast.daily.uv_index_max?.[index],
        precipitationProbability: forecast.daily.precipitation_probability_max?.[index], windSpeedMax: forecast.daily.wind_speed_10m_max?.[index],
      })) : [],
    };
    await writeCache(payload);
    return { ...payload, cached: false };
  }

  async function get(cityInput, options = {}) {
    const city = normalizeCity(cityInput);
    const cached = cachedFor(city);
    const age = cached ? Date.now() - Date.parse(cached.updatedAt) : Infinity;
    if (!options.force && cached && Number.isFinite(age) && age < CACHE_MAX_AGE_MS) return { ...cached, cached: true };

    try {
      const geocodingUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
      geocodingUrl.search = new URLSearchParams({ name: city, count: '1', language: 'zh', format: 'json' }).toString();
      const geocoding = await fetchJson(geocodingUrl.toString());
      const location = geocoding?.results?.[0];
      if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) throw new Error(`没有找到“${city}”的天气位置`);

      return forecastFor(location, city);
    } catch (error) {
      if (cached) return { ...cached, cached: true, stale: true, warning: error.message };
      throw error;
    }
  }

  async function getByCoordinates(latitude, longitude, options = {}) {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('当前位置坐标无效');
    const city = '当前位置';
    const cached = cachedFor(city);
    const age = cached ? Date.now() - Date.parse(cached.updatedAt) : Infinity;
    if (!options.force && cached && Number.isFinite(age) && age < CACHE_MAX_AGE_MS && Math.abs(cached.latitude - latitude) < .05 && Math.abs(cached.longitude - longitude) < .05) return { ...cached, cached: true };
    try { return await forecastFor({ latitude, longitude, name: '当前位置' }, city); }
    catch (error) { if (cached) return { ...cached, cached: true, stale: true, warning: error.message }; throw error; }
  }

  return { get, getByCoordinates };
}

module.exports = { CACHE_MAX_AGE_MS, createWeatherService, normalizeCity };
