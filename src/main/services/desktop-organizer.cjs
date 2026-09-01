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
  const destinations = Object.fromEntries(Object.entries(options.destinations).map(([key, value]) => [key, path.resolve(value)]));
  const additionalScanDirectories = (options.additionalScanDirectories || []).map((directory) => path.resolve(directory));

  function isWithin(parent, child) {
    const relative = path.relative(parent, child);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
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
    for (const directory of additionalScanDirectories) {
      try {
        const additional = await fs.promises.readdir(directory, { withFileTypes: true });
        shortcuts += additional.filter((child) => child.isFile() && classifyFile(child.name) === 'shortcuts').length;
      } catch {
        // Public desktop can be unavailable without preventing user-desktop organization.
      }
    }
    return { shortcuts, files, folders, total: shortcuts + files, conflicts, groups };
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

  return { scan, organize, restore, restoreLast, restorePoints };
}

module.exports = { classifyFile, createDesktopOrganizer };
