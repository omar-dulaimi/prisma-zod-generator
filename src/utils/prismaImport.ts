import path from 'path';
import Transformer from '../transformer';

export function getPrismaImportSpecifier(targetDir: string): string {
  const resolvedDir = path.resolve(targetDir);
  return Transformer.resolvePrismaImportPath(resolvedDir);
}
