const fs = require('node:fs');
const path = require('node:path');

function createIconCache(directory, getFileIcon, resolveSource) {
  fs.mkdirSync(directory, { recursive: true });
  const inFlight = new Map();

  async function extract(appId) {
    if (typeof appId !== 'string' || !/^app_[a-f0-9]{20}$/.test(appId)) return null;
    const source = resolveSource(appId);
    if (!source) return null;
    const cachePath = path.join(directory, `${appId}.png`);

    try {
      const cached = await fs.promises.stat(cachePath);
      if (cached.size > 0 && cached.mtimeMs >= source.mtimeMs) {
        const buffer = await fs.promises.readFile(cachePath);
        return `data:image/png;base64,${buffer.toString('base64')}`;
      }
    } catch {
      // A missing or stale cache entry is regenerated below.
    }

    try {
      const image = await getFileIcon(source.launchPath);
      if (!image || image.isEmpty()) return null;
      const buffer = image.toPNG();
      if (!buffer.length) return null;
      await fs.promises.writeFile(cachePath, buffer);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch {
      return null;
    }
  }

  function get(appId) {
    if (inFlight.has(appId)) return inFlight.get(appId);
    const request = extract(appId).finally(() => inFlight.delete(appId));
    inFlight.set(appId, request);
    return request;
  }

  return { get };
}

module.exports = { createIconCache };
