const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SHORTCUT_EXTENSIONS = new Set(['.lnk', '.url', '.appref-ms']);
const DOCUMENT_EXTENSIONS = new Set(['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf', '.txt', '.md', '.csv', '.rtf']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.heic']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv']);
const ARCHIVE_EXTENSIONS = new Set(['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2']);

function classifyFile(name) {
  const extension = path.extname(name).toLowerCase();
  if (SHORTCUT_EXTENSIONS.has(extension)) return 'shortcuts';
  if (DOCUMENT_EXTENSIONS.has(extension)) return 'documents';
  if (IMAGE_EXTENSIONS.has(extension)) return 'images';
  if (VIDEO_EXTENSIONS.has(extension)) return 'videos';
  if (ARCHIVE_EXTENSIONS.has(extension)) return 'archives';
  return 'other';
}

async function moveFile(source, destination) {
  try {
    await fs.promises.rename(source, destination);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;
    await fs.promises.copyFile(source, destination, fs.constants.COPYFILE_EXCL);
    try {
      await fs.promises.unlink(source);
    } catch (unlinkError) {
      await fs.promises.unlink(destination).catch(() => {});
      throw unlinkError;
    }
  }
}

async function availableDestination(directory, name, reserved = new Set()) {
  const parsed = path.parse(name);
  for (let suffix = 0; suffix < 10000; suffix += 1) {
    const candidateName = suffix === 0 ? name : `${parsed.name} (${suffix})${parsed.ext}`;
    const candidate = path.join(directory, candidateName);
    const key = candidate.toLowerCase();
    if (reserved.has(key)) continue;
    try {
      await fs.promises.access(candidate);
    } catch {
      reserved.add(key);
      return candidate;
    }
  }
  throw new Error(`无法为 ${name} 生成安全目标名称`);
}

function createDesktopOrganizer(options) {
  const desktopDirectory = path.resolve(options.desktopDirectory);
  const restoreDirectory = path.resolve(options.restoreDirectory);
  const shortcutVaultDirectory = path.resolve(options.shortcutVaultDirectory || path.join(restoreDirectory, 'shortcut-vault'));
  const destinations = Object.fromEntries(Object.entries(options.destinations).map(([key, value]) => [key, path.resolve(value)]));
  const additionalScanDirectories = (options.additionalScanDirectories || []).map((directory) => path.resolve(directory));
  const shortcutManifestPath = path.join(shortcutVaultDirectory, 'manifest.json');
  let shortcutLookup = new Map();

  function isWithin(parent, child) {
    const relative = path.relative(parent, child);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  function shortcutId(scope, name) {
    const digest = crypto.createHash('sha256').update(`${scope}:${name.toLowerCase()}`).digest('hex').slice(0, 20);
    return `shortcut_${digest}`;
  }

  async function shortcutEntries(directory, location, managed, scope) {
    try {
      const children = await fs.promises.readdir(directory, { withFileTypes: true });
      const items = [];
      for (const child of children) {
        if (!child.isFile() || classifyFile(child.name) !== 'shortcuts') continue;
        const fullPath = path.join(directory, child.name);
        try {
          const stat = await fs.promises.stat(fullPath);
          items.push({
            id: shortcutId(scope, child.name),
            name: path.parse(child.name).name,
            fileName: child.name,
            location,
            managed,
            fullPath,
            mtimeMs: Math.trunc(stat.mtimeMs),
          });
        } catch {
          // The next scan reconciles shortcuts changed during enumeration.
        }
      }
      return items;
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async function listShortcuts() {
    const groups = await Promise.all([
      shortcutEntries(desktopDirectory, 'desktop', true, 'user'),
      ...additionalScanDirectories.map((directory) => shortcutEntries(directory, 'public', false, `public:${directory.toLowerCase()}`)),
      shortcutEntries(shortcutVaultDirectory, 'stowed', true, 'user'),
    ]);
    const items = groups.flat().sort((left, right) => {
      const order = { desktop: 0, stowed: 1, public: 2 };
      return order[left.location] - order[right.location] || left.name.localeCompare(right.name, 'zh-CN');
    });
    shortcutLookup = new Map(items.map((item) => [item.id, item]));
    return items.map(({ fullPath, mtimeMs, fileName, ...item }) => item);
  }

  function resolveShortcut(id) {
    if (typeof id !== 'string' || !/^shortcut_[a-f0-9]{20}$/.test(id)) return null;
    return shortcutLookup.get(id) || null;
  }

  function shortcutIconSource(id) {
    const item = resolveShortcut(id);
    return item ? { launchPath: item.fullPath, mtimeMs: item.mtimeMs } : null;
  }

  async function scan() {
    let children;
    try {
      children = await fs.promises.readdir(desktopDirectory, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return { shortcuts: 0, files: 0, folders: 0, total: 0, conflicts: 0, groups: {} };
      throw error;
    }
    const groups = { documents: 0, images: 0, videos: 0, archives: 0, other: 0 };
    let shortcuts = 0;
    let folders = 0;
    let files = 0;
    let conflicts = 0;
    for (const child of children) {
      if (child.isDirectory()) {
        folders += 1;
        continue;
      }
      if (!child.isFile()) continue;
      const category = classifyFile(child.name);
      if (category === 'shortcuts') {
        shortcuts += 1;
        continue;
      }
      files += 1;
      groups[category] += 1;
      const destinationDirectory = destinations[category];
      if (destinationDirectory) {
        try {
          await fs.promises.access(path.join(destinationDirectory, child.name));
          conflicts += 1;
        } catch {
          // No collision.
        }
      }
    }
    const shortcutItems = await listShortcuts();
    const desktopShortcuts = shortcutItems.filter((item) => item.location === 'desktop').length;
    const publicShortcuts = shortcutItems.filter((item) => item.location === 'public').length;
    const stowedShortcuts = shortcutItems.filter((item) => item.location === 'stowed').length;
    shortcuts = shortcutItems.length;
    return {
      shortcuts,
      desktopShortcuts,
      publicShortcuts,
      stowedShortcuts,
      shortcutItems,
      files,
      folders,
      total: shortcuts + files,
      conflicts,
      groups,
    };
  }

  async function readShortcutManifest() {
    try {
      const value = JSON.parse(await fs.promises.readFile(shortcutManifestPath, 'utf8'));
      return Array.isArray(value.items) ? value : { items: [] };
    } catch {
      return { items: [] };
    }
  }

  async function writeShortcutManifest(manifest) {
    await fs.promises.mkdir(shortcutVaultDirectory, { recursive: true });
    const temporaryPath = `${shortcutManifestPath}.${process.pid}.tmp`;
    await fs.promises.writeFile(temporaryPath, JSON.stringify(manifest, null, 2), 'utf8');
    await fs.promises.rename(temporaryPath, shortcutManifestPath);
  }

  async function stowShortcuts() {
    const sources = [
      { directory: desktopDirectory, location: 'desktop', scope: 'user' },
      ...additionalScanDirectories.map((directory) => ({ directory, location: 'public', scope: `public:${directory.toLowerCase()}` })),
    ];
    const sourceErrors = [];
    const groups = await Promise.all(sources.map(async (source) => {
      try {
        return await shortcutEntries(source.directory, source.location, true, source.scope);
      } catch (error) {
        sourceErrors.push({ location: source.location, error: error.message });
        return [];
      }
    }));
    const items = groups.flat();
    if (!items.length) return { success: sourceErrors.length === 0, stowed: 0, failed: sourceErrors, movements: [] };
    await fs.promises.mkdir(shortcutVaultDirectory, { recursive: true });
    const manifest = await readShortcutManifest();
    const reserved = new Set();
    const moved = [];
    const failed = [...sourceErrors];
    for (const item of items) {
      try {
        const destination = await availableDestination(shortcutVaultDirectory, item.fileName, reserved);
        await moveFile(item.fullPath, destination);
        const movement = { originalPath: item.fullPath, newPath: destination, fileName: path.basename(destination) };
        moved.push(movement);
        manifest.items = manifest.items.filter((entry) => path.resolve(entry.newPath).toLowerCase() !== destination.toLowerCase());
        manifest.items.push({ ...movement, stowedAt: new Date().toISOString() });
      } catch (error) {
        failed.push({ name: item.fileName, location: item.location, error: error.message });
      }
    }
    await writeShortcutManifest(manifest);
    await listShortcuts();
    return { success: failed.length === 0, stowed: moved.length, failed, movements: moved };
  }

  async function importShortcuts(sourcePaths = []) {
    if (!Array.isArray(sourcePaths) || sourcePaths.length > 100) throw new Error('一次最多导入 100 个快捷方式');
    await fs.promises.mkdir(shortcutVaultDirectory, { recursive: true });
    const manifest = await readShortcutManifest();
    const reserved = new Set();
    const imported = [];
    const skipped = [];
    const importedBaseNames = new Set();
    for (const sourceValue of sourcePaths) {
      if (typeof sourceValue !== 'string' || !sourceValue.trim()) continue;
      const source = path.resolve(sourceValue);
      const extension = path.extname(source).toLowerCase();
      if (!SHORTCUT_EXTENSIONS.has(extension)) {
        skipped.push({ name: path.basename(source), reason: '仅支持 Windows 快捷方式' });
        continue;
      }
      let stat;
      try {
        stat = await fs.promises.stat(source);
      } catch {
        skipped.push({ name: path.basename(source), reason: '文件不可访问' });
        continue;
      }
      if (!stat.isFile()) continue;
      if (path.dirname(source).toLowerCase() === shortcutVaultDirectory.toLowerCase()) {
        const existing = (await listShortcuts()).find((item) => item.name === path.parse(source).name && item.location === 'stowed');
        if (existing) imported.push(existing);
        continue;
      }
      const destination = await availableDestination(shortcutVaultDirectory, path.basename(source), reserved);
      const fromUserDesktop = path.dirname(source).toLowerCase() === desktopDirectory.toLowerCase();
      try {
        if (fromUserDesktop) await moveFile(source, destination);
        else await fs.promises.copyFile(source, destination, fs.constants.COPYFILE_EXCL);
        const movement = { originalPath: source, newPath: destination, fileName: path.basename(destination) };
        manifest.items = manifest.items.filter((entry) => path.resolve(entry.newPath).toLowerCase() !== destination.toLowerCase());
        manifest.items.push({ ...movement, importedAt: new Date().toISOString(), copied: !fromUserDesktop });
        importedBaseNames.add(path.parse(destination).name.toLocaleLowerCase('zh-CN'));
      } catch (error) {
        skipped.push({ name: path.basename(source), reason: error.message });
      }
    }
    await writeShortcutManifest(manifest);
    const shortcuts = await listShortcuts();
    imported.push(...shortcuts.filter((item) => item.location === 'stowed' && importedBaseNames.has(item.name.toLocaleLowerCase('zh-CN'))));
    return { success: true, imported: [...new Map(imported.map((item) => [item.id, item])).values()], skipped };
  }

  async function restoreShortcuts() {
    const manifest = await readShortcutManifest();
    const stowed = await shortcutEntries(shortcutVaultDirectory, 'stowed', true, 'user');
    const manifestByDestination = new Map(manifest.items.map((item) => [path.resolve(item.newPath).toLowerCase(), item]));
    const restored = [];
    const conflicts = [];
    for (const item of stowed) {
      const recorded = manifestByDestination.get(item.fullPath.toLowerCase());
      const originalPath = recorded ? path.resolve(recorded.originalPath) : null;
      const managedOriginal = originalPath && [desktopDirectory, ...additionalScanDirectories]
        .some((directory) => isWithin(directory, originalPath));
      const destination = managedOriginal ? originalPath : path.join(desktopDirectory, item.fileName);
      try {
        await fs.promises.access(destination);
        conflicts.push(targetName);
        continue;
      } catch {
        // The original desktop position is available.
      }
      try {
        await moveFile(item.fullPath, destination);
        restored.push({ originalPath: item.fullPath, newPath: destination });
      } catch {
        conflicts.push(targetName);
      }
    }
    const restoredSources = new Set(restored.map((item) => item.originalPath.toLowerCase()));
    manifest.items = manifest.items.filter((item) => !restoredSources.has(path.resolve(item.newPath).toLowerCase()));
    await writeShortcutManifest(manifest);
    await listShortcuts();
    return { success: true, restored: restored.length, conflicts, movements: restored };
  }

  async function launchShortcut(id, openPath) {
    const item = resolveShortcut(id);
    if (!item) return { success: false, error: '快捷方式已不在桌面模块中，请重新扫描' };
    try {
      await fs.promises.access(item.fullPath, fs.constants.R_OK);
      const error = await openPath(item.fullPath);
      return error ? { success: false, error } : { success: true };
    } catch {
      return { success: false, error: '快捷方式不可访问，请重新扫描' };
    }
  }

  async function listMovableFiles() {
    const children = await fs.promises.readdir(desktopDirectory, { withFileTypes: true });
    return children.filter((child) => child.isFile() && classifyFile(child.name) !== 'shortcuts')
      .map((child) => ({ name: child.name, category: classifyFile(child.name), source: path.join(desktopDirectory, child.name) }));
  }

  async function organize() {
    const movable = await listMovableFiles();
    const restoreId = `restore_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const reserved = new Set();
    const moved = [];
    await fs.promises.mkdir(restoreDirectory, { recursive: true });
    try {
      for (const item of movable) {
        const destinationDirectory = destinations[item.category];
        if (!destinationDirectory) continue;
        await fs.promises.mkdir(destinationDirectory, { recursive: true });
        const destination = await availableDestination(destinationDirectory, item.name, reserved);
        await moveFile(item.source, destination);
        moved.push({ originalPath: item.source, newPath: destination, category: item.category });
      }
      const snapshot = { id: restoreId, createdAt: new Date().toISOString(), items: moved };
      const snapshotPath = path.join(restoreDirectory, `${restoreId}.json`);
      await fs.promises.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), { encoding: 'utf8', flag: 'wx' });
      await pruneRestorePoints();
      return { success: true, organized: moved.length, restoreId };
    } catch (error) {
      for (const item of moved.reverse()) {
        await moveFile(item.newPath, item.originalPath).catch(() => {});
      }
      throw error;
    }
  }

  async function restore(restoreId) {
    const safeId = typeof restoreId === 'string' && /^restore_[a-z0-9_]+$/i.test(restoreId) ? restoreId : null;
    if (!safeId) throw new Error('还原点标识无效');
    const snapshotPath = path.join(restoreDirectory, `${safeId}.json`);
    const snapshot = JSON.parse(await fs.promises.readFile(snapshotPath, 'utf8'));
    let restored = 0;
    const conflicts = [];
    for (const item of [...snapshot.items].reverse()) {
      const originalPath = path.resolve(item.originalPath);
      const newPath = path.resolve(item.newPath);
      if (!isWithin(desktopDirectory, originalPath) || !Object.values(destinations).some((directory) => isWithin(directory, newPath))) {
        conflicts.push(path.basename(originalPath));
        continue;
      }
      try {
        await fs.promises.access(originalPath);
        conflicts.push(path.basename(originalPath));
        continue;
      } catch {
        // Original location is free.
      }
      try {
        await fs.promises.access(newPath, fs.constants.R_OK);
        await moveFile(newPath, originalPath);
        restored += 1;
      } catch {
        conflicts.push(path.basename(originalPath));
      }
    }
    if (conflicts.length === 0) await fs.promises.unlink(snapshotPath).catch(() => {});
    return { success: true, restored, conflicts };
  }

  async function restorePoints() {
    await fs.promises.mkdir(restoreDirectory, { recursive: true });
    const entries = await fs.promises.readdir(restoreDirectory, { withFileTypes: true });
    const points = [];
    for (const entry of entries.filter((item) => item.isFile() && /^restore_.*\.json$/i.test(item.name))) {
      try {
        const snapshot = JSON.parse(await fs.promises.readFile(path.join(restoreDirectory, entry.name), 'utf8'));
        points.push({ id: snapshot.id, createdAt: snapshot.createdAt, count: snapshot.items.length });
      } catch {
        // Ignore malformed snapshots instead of risking a destructive restore.
      }
    }
    return points.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async function pruneRestorePoints() {
    const points = await restorePoints();
    for (const point of points.slice(5)) {
      await fs.promises.unlink(path.join(restoreDirectory, `${point.id}.json`)).catch(() => {});
    }
  }

  async function restoreLast() {
    const [latest] = await restorePoints();
    if (!latest) return { success: false, error: '没有可用的还原点' };
    return restore(latest.id);
  }

  return {
    scan,
    organize,
    restore,
    restoreLast,
    restorePoints,
    listShortcuts,
    stowShortcuts,
    importShortcuts,
    restoreShortcuts,
    launchShortcut,
    shortcutIconSource,
  };
}

module.exports = { classifyFile, createDesktopOrganizer };
