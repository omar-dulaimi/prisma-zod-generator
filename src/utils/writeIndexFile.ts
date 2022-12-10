import path from 'path';
import { writeFileSafely } from './writeFileSafely';

const indexExports = new Set<string>();

export const addIndexExport = (filePath: string) => {
  indexExports.add(filePath);
}

function normalizePath(path: string) {
  if (typeof path !== 'string') {
    throw new TypeError('Expected argument path to be a string');
  }
  if (path === '\\' || path === '/') return '/';

  let len = path.length;
  if (len <= 1) return path;
  let prefix = '';
  if (len > 4 && path[3] === '\\') {
    let ch = path[2];
    if ((ch === '?' || ch === '.') && path.slice(0, 2) === '\\\\') {
      path = path.slice(2);
      prefix = '//';
    }
  }

  let segs = path.split(/[/\\]+/);
  return prefix + segs.join('/');
};


export const writeIndexFile = async (indexPath: string) => {
  const rows = Array.from(indexExports).map((filePath) => {
    let relativePath = path.relative(path.dirname(indexPath), filePath);
    if (relativePath.endsWith('.ts')) {
      relativePath = relativePath.slice(0, relativePath.lastIndexOf('.ts'))
    }
    const normalized = normalizePath(relativePath);
    return `export * from './${normalized}'`;
  });
  const content = rows.join('\n');
  await writeFileSafely(indexPath, content, false);
}
