/**
 * Enum import path utilities
 * Centralizes relative path computation for generated enum schema imports.
 */
import path from 'path';

/**
 * Compute a relative import path (without extension) from a variant schema directory
 * (e.g., schemas/variants/pure) to the enums directory (schemas/enums).
 */
export function computeEnumImportPath(
  fromVariantDirAbs: string,
  enumsDirAbs: string,
  enumName: string,
): string {
  const rel = path.relative(fromVariantDirAbs, enumsDirAbs).replace(/\\/g, '/');
  const base = rel.startsWith('.') ? rel : `./${rel}`;
  return `${base}/${enumName}.schema`;
}

/**
 * Generate import lines for enum schemas based on depth from variants/<variant>/ to enums.
 * depthFromVariantDir = 2 corresponds to ../../enums/<Enum>.schema
 */
export function generateEnumSchemaImportLines(
  enumNames: string[],
  depthFromVariantDir = 2,
): string {
  if (!enumNames.length) return '';
  const upSegments = Array(depthFromVariantDir).fill('..').join('/');
  return enumNames
    .map((e) => `import { ${e}Schema } from '${upSegments}/enums/${e}.schema';`)
    .join('\n');
}
