import { promises as fs } from 'fs';
import path from 'path';

type Chunk = { filePath: string; content: string };

let enabled = false;
let bundlePath = '';
let chunks: Chunk[] = [];
let needsZodImport = false;
let needsPrismaTypeImport = false; // import type { Prisma }
const prismaValueImports = new Set<string>(); // enums etc.
let sawPrismaAlias = false; // whether __PrismaAlias was referenced

export function initSingleFile(bundleFullPath: string) {
  enabled = true;
  bundlePath = bundleFullPath;
  chunks = [];
  needsZodImport = false;
  needsPrismaTypeImport = false;
  prismaValueImports.clear();
  sawPrismaAlias = false;
}

export function isSingleFileEnabled() {
  return enabled;
}

export function appendSingleFile(filePath: string, rawContent: string) {
  if (!enabled) return;

  // Strip imports and rename conflicting local identifiers
  const content = transformContentForSingleFile(filePath, rawContent);
  chunks.push({ filePath, content });
}

function transformContentForSingleFile(filePath: string, source: string): string {
  const lines = source.split(/\r?\n/);
  const kept: string[] = [];
  const relImportRe = /^\s*import\s+[^'";]+from\s+['"](\.\.?\/)[^'"]+['"];?\s*$/;
  const zodImportRe = /^\s*import\s+\{\s*z\s*\}\s+from\s+['"]zod['"];?\s*$/;
  const prismaTypeImportRe = /^\s*import\s+type\s+\{\s*Prisma\s*\}\s+from\s+['"]@prisma\/client['"];?\s*$/;
  const prismaValueImportRe = /^\s*import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]@prisma\/client['"];?\s*$/;
  const prismaAliasTypeRe = /^\s*type\s+__PrismaAlias\s*=\s*Prisma\./;
  // Relative re-exports don't make sense in a single bundled file
  const relExportStarRe = /^\s*export\s+\*\s+from\s+['"](\.\.?\/)[^'"]+['"];?\s*$/;
  const relExportNamesRe = /^\s*export\s+\{[^}]+\}\s+from\s+['"](\.\.?\/)[^'"]+['"];?\s*$/;

  // We'll collect lines then fix the common local "const Schema" alias to a unique name
  for (const line of lines) {
    if (zodImportRe.test(line)) { needsZodImport = true; continue; }
    if (prismaTypeImportRe.test(line)) { needsPrismaTypeImport = true; continue; }
    const m = line.match(prismaValueImportRe);
    if (m) {
      m[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((name) => prismaValueImports.add(name));
      continue;
    }
    if (relImportRe.test(line)) { continue; }
    if (relExportStarRe.test(line)) { continue; }
    if (relExportNamesRe.test(line)) { continue; }
    if (prismaAliasTypeRe.test(line)) { sawPrismaAlias = true; continue; }
    kept.push(line);
  }

  let text = kept.join('\n');

  // If file uses the pattern: const Schema = ... ; export const XObjectSchema = Schema
  // rename local Schema to a unique identifier, and reference it in the export line
  const base = path.basename(filePath).replace(/\.[jt]s$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
  const unique = `__Schema_${base}`;
  // Replace only the first "const Schema[ :type]? =" per file, preserving any type annotation
  text = text.replace(/(^|\n)\s*const\s+Schema(\s*:\s*[^=]+)?\s*=\s*/m, (_m, p1, typeAnn = '') => `${p1}const ${unique}${typeAnn} = `);
  text = text.replace(/export\s+const\s+(\w+)ObjectSchema\s*=\s*Schema/g, `export const $1ObjectSchema = ${unique}`);

  // Uniquify duplicate SelectSchema identifiers that appear across different files
  const selectDeclRe = /export\s+const\s+([A-Za-z0-9_]+SelectSchema)\b/g;
  const selectZodDeclRe = /export\s+const\s+([A-Za-z0-9_]+SelectZodSchema)\b/g;
  const renameMap = new Map<string, string>();
  const suffix = `__${base}`;
  for (const re of [selectDeclRe, selectZodDeclRe]) {
    re.lastIndex = 0;
    let m2: RegExpExecArray | null;
    while ((m2 = re.exec(text)) !== null) {
      const orig = m2[1];
      if (!renameMap.has(orig)) renameMap.set(orig, `${orig}${suffix}`);
    }
  }
  if (renameMap.size > 0) {
    for (const [orig, renamed] of renameMap) {
      const idRe = new RegExp(`\\b${orig}\\b`, 'g');
      text = text.replace(idRe, renamed);
    }
  }


  // Heuristic: if native enums are referenced (e.g., z.enum(Role) or z.nativeEnum(Role)),
  // hoist those enum names as value imports from @prisma/client
  const enumUseRe = /z\.(?:enum|nativeEnum)\(([_A-Za-z][_A-Za-z0-9]*)\)/g;
  let em: RegExpExecArray | null;
  enumUseRe.lastIndex = 0;
  while ((em = enumUseRe.exec(text)) !== null) {
    const name = em[1];
    // Avoid picking up local Schema identifiers
    if (name && !name.endsWith('Schema')) prismaValueImports.add(name);
  }

  return `// File: ${path.basename(filePath)}\n${text}\n`;
}

export async function flushSingleFile(): Promise<void> {
  if (!enabled || !bundlePath) return;

  const header: string[] = [
    '/**',
    ' * Prisma Zod Generator - Single File (inlined)',
    ' * Auto-generated. Do not edit.',
    ' */',
    '',
  ];
  if (needsZodImport) header.push(`import { z } from 'zod';`);
  if (needsPrismaTypeImport) header.push(`import type { Prisma } from '@prisma/client';`);
  if (prismaValueImports.size > 0) header.push(`import { ${Array.from(prismaValueImports).sort().join(', ')} } from '@prisma/client';`);
  if (sawPrismaAlias) {
    header.push(`type __PrismaAlias = Prisma.JsonValue | Prisma.InputJsonValue;`);
    // Ensure Prisma type import is present
    if (!needsPrismaTypeImport) {
      header.unshift(`import type { Prisma } from '@prisma/client';`);
      needsPrismaTypeImport = true;
    }
  }
  header.push('');

  const dir = path.dirname(bundlePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(bundlePath, header.concat(chunks.map(c => c.content)).join('\n'), 'utf8');

  // Reset state after writing
  enabled = false;
  bundlePath = '';
  chunks = [];
  needsZodImport = false;
  needsPrismaTypeImport = false;
  prismaValueImports.clear();
  sawPrismaAlias = false;
}
