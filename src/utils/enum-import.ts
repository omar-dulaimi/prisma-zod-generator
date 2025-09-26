/**
 * Enum import path utilities
 * Centralizes relative path computation for generated enum schema imports.
 */
import path from 'path';

/**
 * Compute a relative import path (optionally with extension) from a variant schema directory
 * (e.g., schemas/variants/pure) to the enums directory (schemas/enums).
 */
export function computeEnumImportPath(
  fromVariantDirAbs: string,
  enumsDirAbs: string,
  enumName: string,
  ext = '',
): string {
  const rel = path.relative(fromVariantDirAbs, enumsDirAbs).replace(/\\/g, '/');
  const base = rel.startsWith('.') ? rel : `./${rel}`;
  return path.posix.join(base, `${enumName}.schema${ext}`);
}

/**
 * Generate import lines for enum schemas based on depth from variants/<variant>/ to enums.
 * depthFromVariantDir = 2 corresponds to ../../schemas/enums/<Enum>.schema
 */
export function generateEnumSchemaImportLines(
  enumNames: string[],
  depthFromVariantDir = 2,
  ext = '',
): string {
  if (!enumNames.length) return '';
  const upSegments = Array(depthFromVariantDir).fill('..').join('/');
  return enumNames
    .map((e) => {
      const p = path.posix.join(upSegments, 'schemas', 'enums', `${e}.schema${ext}`);
      return `import { ${e}Schema } from '${p}';`;
    })
    .join('\n');
}
