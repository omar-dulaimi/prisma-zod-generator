import path from 'path';
import normalizePath from 'normalize-path';
import { writeFileSafely } from './writeFileSafely';

const indexExports = new Set<string>();

export const addIndexExport = (filePath: string) => {
  indexExports.add(filePath);
}

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
