import { promises as fs } from 'fs';
import path from 'path';

type Chunk = { filePath: string; content: string };

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let enabled = false;
let bundlePath = '';
let chunks: Chunk[] = [];
let needsZodImport = false;
let needsPrismaTypeImport = false; // import type { Prisma }
let needsPrismaValueImport = false; // import { Prisma } (as value)
const prismaValueImports = new Set<string>(); // enums etc.
let sawPrismaAlias = false; // whether __PrismaAlias was referenced
let prismaImportBase = '@prisma/client';
let needsJsonHelpers = false; // whether to inject json helpers block
// Same treatment as the JSON helpers, and for the same reason: the per-file imports are
// removed by the generic relative-import stripper below, so the bundle has to carry one
// hoisted copy of the definitions or every reference dangles.
let needsDecimalHelpers = false;
const exportedTypeNames = new Set<string>(); // track exported type identifiers to prevent collisions
// External imports declared via @zod.import (e.g. custom validator modules).
// Unlike internal schema imports, these point outside the generated tree and
// must be hoisted into the bundle rather than stripped (issue #335).
const customImportLines = new Set<string>();

export function setSingleFilePrismaImportPath(importPath: string, extension?: string) {
  let finalPath = (importPath || '@prisma/client').replace(/\\/g, '/');
  if (extension && !finalPath.endsWith(extension) && !finalPath.includes('node_modules')) {
    finalPath += extension;
  }
  prismaImportBase = finalPath;
}

export function initSingleFile(bundleFullPath: string) {
  enabled = true;
  bundlePath = bundleFullPath;
  chunks = [];
  needsZodImport = false;
  needsPrismaTypeImport = false;
  needsPrismaValueImport = false;
  prismaValueImports.clear();
  sawPrismaAlias = false;
  needsJsonHelpers = false;
  needsDecimalHelpers = false;
  exportedTypeNames.clear();
  customImportLines.clear();
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
  let inJsonSkip = false;
  let inInlineJsonSchemaSkip = false;
  const relImportRe = /^\s*import\s+[^'";]+from\s+['"](\.\.?\/)[^'"]+['"];?\s*$/;
  // Detect the Zod import by its `z` binding regardless of source path. The
  // generator only ever binds `z` for the zod import, so matching the binding
  // (not a hardcoded 'zod'/'zod/v4' path) correctly catches zod/v3 and custom
  // zodImportPath modules (issue #370) — otherwise they fall through to the
  // generic relative-import stripper and the hoisted import is lost.
  const zodImportRe = /^\s*import\s+(?:\{\s*z\s*\}|\*\s+as\s+z)\s+from\s+['"][^'"]+['"];?\s*$/;
  const escapedPrismaImport = escapeRegExp(prismaImportBase);
  // Match the Prisma type import by its `{ Prisma }` binding regardless of path:
  // generated files at different directory depths import it via different
  // relative paths (../client vs ../../client), and a path-specific regex missed
  // the non-canonical depths, leaking them into the custom-import hoist (#335).
  const prismaTypeImportRe = /^\s*import\s+type\s+\{\s*Prisma\s*\}\s+from\s+['"][^'"]+['"];?\s*$/;
  const prismaValueImportRe = new RegExp(
    `^\\s*import\\s+\\{\\s*([^}]+)\\s*\\}\\s+from\\s+['\"]${escapedPrismaImport}['\"];?\\s*$`,
  );
  const prismaAliasTypeRe = /^\s*type\s+__PrismaAlias\s*=\s*Prisma\./;
  // Relative re-exports don't make sense in a single bundled file
  const relExportStarRe = /^\s*export\s+\*\s+from\s+['"](\.\.?\/)[^'"]+['"];?\s*$/;
  const relExportNamesRe = /^\s*export\s+\{[^}]+\}\s+from\s+['"](\.\.?\/)[^'"]+['"];?\s*$/;

  // We'll collect lines then fix the common local "const Schema" alias to a unique name
  for (const line of lines) {
    // Detect and strip inline JSON helper blocks (comment + IIFE) keeping only a single hoisted version
    if (/JSON helper schemas/.test(line)) {
      needsJsonHelpers = true;
      // Skip this marker line and enter skip mode until block end
      inJsonSkip = true;
      continue;
    }
    if (typeof inJsonSkip !== 'undefined' && inJsonSkip) {
      // Block ends when we hit the closing IIFE line '})();'
      if (/^\s*\)\(\);\s*$/.test(line) || /^\s*\)\);\s*$/.test(line)) {
        inJsonSkip = false; // finished skipping block
      }
      continue; // skip all lines within block
    }
    if (
      /import\s+\{\s*JsonValueSchema\s+as\s+jsonSchema\s*\}\s+from\s+['"](?:\.{1,2}\/)+helpers\/json-helpers(?:\.js)?['"];?/.test(
        line,
      )
    ) {
      needsJsonHelpers = true;
      continue;
    }
    // Same for the Decimal helpers. Their import names vary with what the schema uses
    // (DecimalJSLikeSchema, isValidDecimalInput, DECIMAL_STRING_REGEX), so match on the
    // module rather than the binding list.
    if (/import\s+\{[^}]*\}\s+from\s+['"](?:\.{1,2}\/)+helpers\/decimal-helpers(?:\.js)?['"];?/.test(line)) {
      needsDecimalHelpers = true;
      // Set here rather than where the helpers are hoisted: the Prisma value import is
      // written to the header before that point, so a later flag would be ignored.
      needsPrismaValueImport = true;
      continue;
    }
    // Strip inline literalSchema definition (minimal mode)
    if (
      /^\s*const\s+literalSchema\s*=\s*z\.union\(\[z\.string\(\),\s*z\.number\(\),\s*z\.boolean\(\)\]\);?\s*$/.test(
        line,
      )
    ) {
      needsJsonHelpers = true;
      continue;
    }
    // Strip inline jsonSchema definition (minimal mode) - starts with "const jsonSchema: any = z.lazy"
    if (/^\s*const\s+jsonSchema\s*:\s*any\s*=\s*z\.lazy\(\(\)\s*=>\s*$/.test(line)) {
      needsJsonHelpers = true;
      inInlineJsonSchemaSkip = true;
      continue;
    }
    // Skip lines within inline jsonSchema definition until we hit the closing ");"
    if (inInlineJsonSchemaSkip) {
      if (/^\s*\);?\s*$/.test(line)) {
        inInlineJsonSchemaSkip = false;
      }
      continue;
    }
    if (zodImportRe.test(line)) {
      needsZodImport = true;
      continue;
    }
    if (prismaTypeImportRe.test(line)) {
      needsPrismaTypeImport = true;
      continue;
    }
    const m = line.match(prismaValueImportRe);
    if (m) {
      m[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((name) => {
          // Don't add Prisma to value imports if it's used as a type import
          if (name !== 'Prisma') {
            prismaValueImports.add(name);
          }
        });
      continue;
    }
    if (relImportRe.test(line)) {
      // Internal generated-schema imports are stripped (everything is inlined),
      // but external imports declared via @zod.import point outside the
      // generated tree and must be hoisted into the bundle instead (issue #335).
      const relPath = line.match(/from\s+['"]([^'"]+)['"]/)?.[1] ?? '';
      const bindingPortion = line.slice(0, Math.max(0, line.indexOf(' from ')));
      const isInternalSchemaImport =
        /(^|\/)(objects|enums|models|results|helpers)\//.test(relPath) ||
        /\.schema(\.[jt]s)?$/.test(relPath) ||
        // Prisma client output (any depth), handled by the canonical Prisma import
        /(^|\/)client(\/|$)/.test(relPath) ||
        /\bPrisma\b/.test(bindingPortion);
      if (!isInternalSchemaImport) {
        customImportLines.add(line.trim());
      }
      continue;
    }
    if (relExportStarRe.test(line)) {
      continue;
    }
    if (relExportNamesRe.test(line)) {
      continue;
    }
    if (prismaAliasTypeRe.test(line)) {
      sawPrismaAlias = true;
      continue;
    }
    kept.push(line);
  }

  let text = kept.join('\n');

  // If file uses the pattern: const Schema = ... ; export const XObjectSchema = Schema
  // rename local Schema to a unique identifier, and reference it in the export line
  const base = path
    .basename(filePath)
    .replace(/\.[jt]s$/, '')
    .replace(/[^a-zA-Z0-9_]/g, '_');
  const unique = `__Schema_${base}`;
  const uniqueMakeSchema = `__makeSchema_${base}`;

  // Replace only the first "const Schema[ :type]? =" per file, preserving any type annotation
  text = text.replace(
    /(^|\n)\s*const\s+Schema(\s*:\s*[^=]+)?\s*=\s*/m,
    (_m, p1, typeAnn = '') => `${p1}const ${unique}${typeAnn} = `,
  );
  text = text.replace(
    /export\s+const\s+(\w+)ObjectSchema\s*=\s*Schema/g,
    `export const $1ObjectSchema = ${unique}`,
  );

  // Handle makeSchema function declarations - rename to unique identifier
  text = text.replace(
    /(^|\n)\s*const\s+makeSchema\s*=\s*/m,
    (_m, p1) => `${p1}const ${uniqueMakeSchema} = `,
  );
  // Replace all references to makeSchema with the unique name
  text = text.replace(/\bmakeSchema\b/g, uniqueMakeSchema);

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

  // Check for actual Prisma value usage (not type positions)
  // Look for patterns like z.nativeEnum(Prisma.Something) but exclude type annotations
  const prismaValueUseRe = /z\.(enum|nativeEnum)\(Prisma\.([A-Za-z][A-Za-z0-9]*)\)/g;
  if (prismaValueUseRe.test(text)) {
    needsPrismaValueImport = true;
  }

  // Decimal helpers use Prisma.Decimal as a runtime value:
  // new Prisma.Decimal(...), Prisma.Decimal.isDecimal(...), z.instanceof(Prisma.Decimal)
  const prismaDecimalValueUseRe =
    /new\s+Prisma\.Decimal\s*\(|Prisma\.Decimal\.isDecimal\s*\(|instanceof\s*\(\s*Prisma\.Decimal|instanceof\s+Prisma\.Decimal/;
  if (prismaDecimalValueUseRe.test(text)) {
    needsPrismaValueImport = true;
  }

  // Check for Prisma type usage in ZodType generics like z.ZodType<Prisma.Something>
  const prismaTypeUseRe = /z\.ZodType<Prisma\.([A-Za-z][A-Za-z0-9]*)/g;
  if (prismaTypeUseRe.test(text)) {
    needsPrismaTypeImport = true;
  }

  text = dedupeExportTypeNames(text, filePath);

  return `// File: ${path.basename(filePath)}\n${text}\n`;
}

function dedupeExportTypeNames(text: string, filePath: string): string {
  const typeExportRe =
    /export\s+type\s+([A-Za-z0-9_]+)\s*=\s*z\.infer<typeof\s+([A-Za-z0-9_]+)\s*>;\s*/g;
  return text.replace(typeExportRe, (match, typeName: string, schemaRef: string) => {
    const finalName = reserveExportTypeName(typeName, schemaRef, filePath);
    if (finalName === typeName) {
      return match;
    }
    return `export type ${finalName} = z.infer<typeof ${schemaRef}>;`;
  });
}

function reserveExportTypeName(typeName: string, schemaRef: string, filePath: string): string {
  if (!exportedTypeNames.has(typeName)) {
    exportedTypeNames.add(typeName);
    return typeName;
  }

  const candidates: string[] = [];

  if (typeName.endsWith('Type')) {
    candidates.push(`${typeName.slice(0, -4)}Model`);
  }

  if (schemaRef.endsWith('Schema')) {
    const base = schemaRef.slice(0, -'Schema'.length);
    candidates.push(`${base}Model`);
    candidates.push(`${base}SchemaType`);
  }

  const baseName = path
    .basename(filePath)
    .replace(/\.[jt]s$/, '')
    .replace(/[^A-Za-z0-9_]/g, '');
  if (baseName) {
    candidates.push(`${baseName}Model`);
  }

  candidates.push(`${typeName}Model`);

  for (const candidate of candidates) {
    const sanitized = candidate.replace(/[^A-Za-z0-9_]/g, '_');
    if (sanitized && !exportedTypeNames.has(sanitized)) {
      exportedTypeNames.add(sanitized);
      return sanitized;
    }
  }

  let counter = 2;
  while (true) {
    const fallback = `${typeName}${counter}`;
    if (!exportedTypeNames.has(fallback)) {
      exportedTypeNames.add(fallback);
      return fallback;
    }
    counter += 1;
  }
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
  if (needsZodImport) {
    // Dynamically resolve Zod import based on generator config
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const transformer = require('../transformer').default;
      const zImport = transformer?.prototype?.generateImportZodStatement
        ? transformer.prototype.generateImportZodStatement.call(transformer)
        : "import * as z from 'zod';\n";
      header.push(zImport.trim());
    } catch {
      header.push(`import * as z from 'zod';`);
    }
  }
  // Handle Prisma imports - a value import also provides the types, so it wins
  // (emitting both an `import type` and a value import of the same name is a TS error)
  if (needsPrismaValueImport) {
    header.push(`import { Prisma } from '${prismaImportBase}';`);
  } else if (needsPrismaTypeImport) {
    header.push(`import type { Prisma } from '${prismaImportBase}';`);
  }

  if (prismaValueImports.size > 0) {
    // Don't duplicate Prisma if it's already imported above
    const valueImports = Array.from(prismaValueImports)
      .filter((name) => name !== 'Prisma')
      .sort();
    if (valueImports.length > 0) {
      header.push(`import { ${valueImports.join(', ')} } from '${prismaImportBase}';`);
    }
  }

  // Hoist external @zod.import custom imports (deduped) so references like
  // `customTypes.userMetadata` resolve in the bundle (issue #335). Sorted for
  // deterministic output. Paths are kept verbatim — they are relative to the
  // bundle location, as the user declared them in @zod.import.
  if (customImportLines.size > 0) {
    Array.from(customImportLines)
      .sort()
      .forEach((line) => header.push(line));
  }
  if (needsJsonHelpers) {
    header.push(`// JSON helper schemas (hoisted)`);
    header.push(`const literalSchema = z.union([z.string(), z.number(), z.boolean()]);`);
    header.push(`const jsonSchema: any = z.lazy(() =>`);
    header.push(
      `  z.union([literalSchema, z.array(jsonSchema.nullable()), z.record(z.string(), jsonSchema.nullable())])`,
    );
    header.push(`);`);
  }
  if (needsDecimalHelpers) {
    // Generated from the same source the multi-file `helpers/decimal-helpers.ts` uses, so
    // the two layouts cannot drift. `export` is dropped because these are internal to the
    // bundle, and `Prisma` is needed as a value here for Prisma.Decimal.isDecimal.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { generateDecimalHelpers, isDecimalJsAvailable } = require('../helpers/decimal-helpers');
    const hasDecimalJs = isDecimalJsAvailable();
    const { helperCode, imports } = generateDecimalHelpers(hasDecimalJs, 'z', prismaImportBase);

    if (hasDecimalJs) {
      const decimalJsImport = imports.find((line: string) => line.includes("'decimal.js'"));
      if (decimalJsImport) header.push(decimalJsImport);
    }

    header.push(`// Decimal helper schemas (hoisted)`);
    header.push(helperCode.replace(/^export /gm, ''));
  }
  if (sawPrismaAlias) {
    header.push(`type __PrismaAlias = Prisma.JsonValue | Prisma.InputJsonValue;`);
    // Ensure Prisma type import is present
    if (!needsPrismaTypeImport && !needsPrismaValueImport) {
      header.unshift(`import type { Prisma } from '${prismaImportBase}';`);
      needsPrismaTypeImport = true;
    }
  }
  header.push('');

  const dir = path.dirname(bundlePath);
  await fs.mkdir(dir, { recursive: true });
  const body = chunks.map((c) => c.content).join('\n');
  await fs.writeFile(bundlePath, header.join('\n') + body, 'utf8');

  // Reset state after writing
  enabled = false;
  bundlePath = '';
  chunks = [];
  needsZodImport = false;
  needsPrismaTypeImport = false;
  needsPrismaValueImport = false;
  prismaValueImports.clear();
  sawPrismaAlias = false;
  needsJsonHelpers = false;
  needsDecimalHelpers = false;
  exportedTypeNames.clear();
  customImportLines.clear();
}
