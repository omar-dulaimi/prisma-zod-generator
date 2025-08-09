import path from 'path';
import { writeFileSafely } from './writeFileSafely';

const indexExports = new Set<string>();

export const addIndexExport = (filePath: string) => {
  indexExports.add(filePath);
};

function normalizePath(path: string) {
  if (typeof path !== 'string') {
    throw new TypeError('Expected argument path to be a string');
  }
  if (path === '\\' || path === '/') return '/';

  const len = path.length;
  if (len <= 1) return path;
  let prefix = '';
  if (len > 4 && path[3] === '\\') {
    const ch = path[2];
    if ((ch === '?' || ch === '.') && path.slice(0, 2) === '\\\\') {
      path = path.slice(2);
      prefix = '//';
    }
  }

  const segs = path.split(/[/\\]+/);
  return prefix + segs.join('/');
}

export const writeIndexFile = async (indexPath: string) => {
  const rows = Array.from(indexExports).map((filePath) => {
    let relativePath = path.relative(path.dirname(indexPath), filePath);
    if (relativePath.endsWith('.ts')) {
      relativePath = relativePath.slice(0, relativePath.lastIndexOf('.ts'));
    }
    const normalized = normalizePath(relativePath);
    return `export * from './${normalized}'`;
  });
  // Additionally, ensure directory-level exports for common folders if their index.ts was not added explicitly
  const dirExports: string[] = [];
  const baseDir = path.dirname(indexPath);
  for (const dir of ['enums', 'objects', 'models']) {
    const dirIndex = path.join(baseDir, dir, 'index.ts');
    // If an index.ts exists, ensure it's exported
    try {
      const fs = await import('fs');
      if (fs.existsSync(dirIndex)) {
        const rel = normalizePath(path.relative(baseDir, dirIndex).replace(/\.ts$/, ''));
        const line = `export * from './${rel}'`;
        if (!rows.includes(line)) dirExports.push(line);
      }
    } catch {
      // ignore
    }
  }
  const content = [...rows, ...dirExports].join('\n');
  await writeFileSafely(indexPath, content, false);
};
