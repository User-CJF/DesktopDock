const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const MAX_FILES_PER_ROOT = 3000;
const MAX_DEPTH = 6;
const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', '.svn', '$recycle.bin', 'system volume information']);
const APPLICATION_SHORTCUT_EXTENSIONS = new Set(['.lnk', '.url', '.appref-ms']);

function fileId(filePath) {
  return `file_${crypto.createHash('sha256').update(path.resolve(filePath).toLowerCase()).digest('hex').slice(0, 20)}`;
}

async function scanFileRoot(root) {
  const files = [];
  const pending = [{ directory: root.directory, depth: 0 }];
  try {
    await fs.promises.access(root.directory, fs.constants.R_OK);
  } catch (error) {
    return { root, available: false, files, error: error.code === 'ENOENT' ? null : error.message };
  }

  while (pending.length && files.length < MAX_FILES_PER_ROOT) {
    const current = pending.pop();
    let children;
    try {
      children = await fs.promises.readdir(current.directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const child of children) {
      if (files.length >= MAX_FILES_PER_ROOT) break;
      if (child.name.startsWith('.')) continue;
      const fullPath = path.join(current.directory, child.name);
      if (child.isDirectory()) {
        if (current.depth < MAX_DEPTH && !IGNORED_DIRECTORIES.has(child.name.toLowerCase())) {
          pending.push({ directory: fullPath, depth: current.depth + 1 });
        }
        continue;
      }
      if (!child.isFile()) continue;
      if (APPLICATION_SHORTCUT_EXTENSIONS.has(path.extname(child.name).toLowerCase())) continue;
      try {
        const stat = await fs.promises.stat(fullPath);
        files.push({
          id: fileId(fullPath),
          name: child.name.slice(0, 260),
          fullPath,
          extension: path.extname(child.name).toLowerCase().slice(0, 32),
          size: stat.size,
          modifiedAt: new Date(stat.mtimeMs).toISOString(),
          rootId: root.id,
        });
      } catch {
        // Files can disappear while indexing; the next scan reconciles them.
      }
    }
  }
  return { root, available: true, files, error: null };
}

function createFileIndex(databasePath, initialRoots = []) {
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS indexed_roots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      is_system INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS indexed_files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      full_path TEXT NOT NULL UNIQUE,
      extension TEXT NOT NULL DEFAULT '',
      size INTEGER NOT NULL DEFAULT 0,
      modified_at TEXT NOT NULL,
      root_id TEXT NOT NULL,
      indexed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_indexed_files_modified ON indexed_files(modified_at DESC);
    CREATE INDEX IF NOT EXISTS idx_indexed_files_name ON indexed_files(name);
    CREATE TABLE IF NOT EXISTS file_usage (
      file_id TEXT PRIMARY KEY,
      open_count INTEGER NOT NULL DEFAULT 0,
      last_opened_at TEXT
    );
    CREATE TABLE IF NOT EXISTS file_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);

  const seedRoot = database.prepare(`
    INSERT OR IGNORE INTO indexed_roots (id, name, path, is_system, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  initialRoots.forEach((root, index) => seedRoot.run(root.id, root.name, path.resolve(root.directory), root.isSystem ? 1 : 0, index, now));

  function roots() {
    return database.prepare(`
      SELECT id, name, path, is_system AS isSystem, sort_order AS sortOrder
      FROM indexed_roots ORDER BY sort_order, name COLLATE NOCASE
    `).all();
  }

  function addRoot(directory, name) {
    const resolved = path.resolve(directory);
    const existing = database.prepare('SELECT id FROM indexed_roots WHERE path = ? COLLATE NOCASE').get(resolved);
    if (existing) return roots().find((root) => root.id === existing.id);
    const id = `root_${crypto.createHash('sha256').update(resolved.toLowerCase()).digest('hex').slice(0, 16)}`;
    const displayName = String(name || path.basename(resolved) || resolved).trim().slice(0, 80);
    const order = database.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS value FROM indexed_roots').get().value;
    database.prepare(`INSERT INTO indexed_roots (id, name, path, is_system, sort_order, created_at) VALUES (?, ?, ?, 0, ?, ?)`)
      .run(id, displayName, resolved, order, new Date().toISOString());
    return roots().find((root) => root.id === id);
  }

  function removeRoot(id) {
    const root = database.prepare('SELECT is_system AS isSystem FROM indexed_roots WHERE id = ?').get(id);
    if (!root) throw new Error('收藏目录不存在');
    if (root.isSystem) throw new Error('系统快捷目录不可删除');
    database.exec('BEGIN IMMEDIATE');
    try {
      database.prepare('DELETE FROM indexed_files WHERE root_id = ?').run(id);
      database.prepare('DELETE FROM indexed_roots WHERE id = ?').run(id);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
    return { success: true };
  }

  function resolveRoot(id) {
    if (typeof id !== 'string' || !/^(root_[a-f0-9]{16}|[a-z_]+)$/.test(id)) return null;
    return database.prepare('SELECT path FROM indexed_roots WHERE id = ?').get(id) || null;
  }

  async function rescan() {
    const configuredRoots = roots().map((root) => ({ ...root, directory: root.path }));
    const scans = await Promise.all(configuredRoots.map(scanFileRoot));
    const availableRootIds = new Set(scans.filter((scan) => scan.available).map((scan) => scan.root.id));
    const found = scans.flatMap((scan) => scan.files);
    const existing = database.prepare('SELECT id, full_path, size, modified_at, root_id FROM indexed_files').all();
    const byPath = new Map(existing.map((item) => [item.full_path.toLowerCase(), item]));
    const seen = new Set();
    const indexedAt = new Date().toISOString();
    let added = 0;
    let updated = 0;
    let removed = 0;
    const upsert = database.prepare(`
      INSERT INTO indexed_files (id, name, full_path, extension, size, modified_at, root_id, indexed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(full_path) DO UPDATE SET name=excluded.name, extension=excluded.extension,
        size=excluded.size, modified_at=excluded.modified_at, root_id=excluded.root_id, indexed_at=excluded.indexed_at
    `);
    database.exec('BEGIN IMMEDIATE');
    try {
      for (const file of found) {
        const key = file.fullPath.toLowerCase();
        const previous = byPath.get(key);
        seen.add(key);
        if (!previous) added += 1;
        else if (previous.size !== file.size || previous.modified_at !== file.modifiedAt || previous.root_id !== file.rootId) updated += 1;
        upsert.run(file.id, file.name, file.fullPath, file.extension, file.size, file.modifiedAt, file.rootId, indexedAt);
      }
      for (const previous of existing) {
        if (availableRootIds.has(previous.root_id) && !seen.has(previous.full_path.toLowerCase())) {
          database.prepare('DELETE FROM indexed_files WHERE id = ?').run(previous.id);
          database.prepare('DELETE FROM file_usage WHERE file_id = ?').run(previous.id);
          removed += 1;
        }
      }
      database.prepare(`INSERT INTO file_metadata (key, value) VALUES ('last_scan_at', ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(indexedAt);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
    return { added, updated, removed, total: count(), lastScanAt: indexedAt, errors: scans.filter((scan) => scan.error).map((scan) => scan.error) };
  }

  function listRecent(limit = 20) {
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
    return database.prepare(`
      SELECT indexed_files.id, indexed_files.name, indexed_files.extension, indexed_files.size,
        indexed_files.modified_at AS modifiedAt, indexed_roots.name AS rootName,
        COALESCE(file_usage.open_count, 0) AS openCount, file_usage.last_opened_at AS lastOpenedAt
      FROM indexed_files
      JOIN indexed_roots ON indexed_roots.id = indexed_files.root_id
      LEFT JOIN file_usage ON file_usage.file_id = indexed_files.id
      ORDER BY COALESCE(file_usage.last_opened_at, indexed_files.modified_at) DESC
      LIMIT ?
    `).all(safeLimit);
  }

  function search(query, limit = 20) {
    const term = String(query || '').trim().slice(0, 100);
    if (!term) return listRecent(limit);
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
    return database.prepare(`
      SELECT indexed_files.id, indexed_files.name, indexed_files.extension, indexed_files.size,
        indexed_files.modified_at AS modifiedAt, indexed_roots.name AS rootName
      FROM indexed_files JOIN indexed_roots ON indexed_roots.id = indexed_files.root_id
      WHERE indexed_files.name LIKE ? ESCAPE '\\'
      ORDER BY CASE WHEN indexed_files.name LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END,
        indexed_files.modified_at DESC LIMIT ?
    `).all(`%${term.replace(/[\\%_]/g, '\\$&')}%`, `${term.replace(/[\\%_]/g, '\\$&')}%`, safeLimit);
  }

  function count() {
    return database.prepare('SELECT COUNT(*) AS total FROM indexed_files').get().total;
  }

  function status() {
    const last = database.prepare("SELECT value FROM file_metadata WHERE key='last_scan_at'").get();
    return { totalFiles: count(), lastScanAt: last?.value || null, totalRoots: roots().length };
  }

  function resolveFile(id) {
    if (typeof id !== 'string' || !/^file_[a-f0-9]{20}$/.test(id)) return null;
    return database.prepare('SELECT full_path AS fullPath FROM indexed_files WHERE id = ?').get(id) || null;
  }

  async function open(id, openPath) {
    const item = resolveFile(id);
    if (!item) return { success: false, error: '文件已不在索引中' };
    try {
      await fs.promises.access(item.fullPath, fs.constants.R_OK);
      const error = await openPath(item.fullPath);
      if (error) return { success: false, error };
      database.prepare(`INSERT INTO file_usage (file_id, open_count, last_opened_at) VALUES (?, 1, ?)
        ON CONFLICT(file_id) DO UPDATE SET open_count=open_count+1, last_opened_at=excluded.last_opened_at`)
        .run(id, new Date().toISOString());
      return { success: true };
    } catch {
      return { success: false, error: '文件不可访问，请重新扫描' };
    }
  }

  function clearRecent() {
    database.prepare('DELETE FROM file_usage').run();
    return { success: true };
  }

  function clearUsage() {
    database.prepare('DELETE FROM file_usage').run();
    return { success: true };
  }

  return { roots, addRoot, removeRoot, resolveRoot, rescan, listRecent, search, status, resolveFile, open, clearRecent, clearUsage, close: () => database.close() };
}

module.exports = { createFileIndex, fileId, scanFileRoot };
