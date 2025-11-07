/**
 * Helper functions and utilities for Decimal type support
 * Matches zod-prisma-types implementation for seamless migration
 */

/**
 * Generate helper schemas for Decimal validation
 * These helpers enable proper Prisma.Decimal and Decimal.js support
 *
 * @param hasDecimalJs - Whether decimal.js is installed and should be imported
 * @param zodNamespace - The zod namespace to use (e.g., 'z' or 'zod')
 * @returns Object containing helper schema code and necessary imports
 */
export function generateDecimalHelpers(
  hasDecimalJs: boolean,
  zodNamespace: string = 'z',
  prismaImportPath: string = '@prisma/client',
): {
  helperCode: string;
  imports: string[];
} {
  const imports: string[] = [`import { Prisma } from '${prismaImportPath}';`];

  if (hasDecimalJs) {
    imports.push("import Decimal from 'decimal.js';");
  }

  const helperCode = `
// DECIMAL HELPERS
//------------------------------------------------------

export const DecimalJSLikeSchema: ${zodNamespace}.ZodType<Prisma.DecimalJsLike> = ${zodNamespace}.object({
  d: ${zodNamespace}.array(${zodNamespace}.number()),
  e: ${zodNamespace}.number(),
  s: ${zodNamespace}.number(),
  // Zod v3/v4 compatible callable check
  toFixed: ${zodNamespace}.custom<Prisma.DecimalJsLike['toFixed']>((v) => typeof v === 'function'),
});

// Accept canonical decimal strings (+/-, optional fraction, optional exponent), or Infinity/NaN.
export const DECIMAL_STRING_REGEX = /^(?:[+-]?(?:[0-9]+(?:\.[0-9]+)?(?:[eE][+\-]?[0-9]+)?|Infinity)|NaN)$/;

export const isValidDecimalInput = (
  v?: null | string | number | Prisma.DecimalJsLike,
): v is string | number | Prisma.DecimalJsLike => {
  if (v === undefined || v === null) return false;
  return (
    // Explicit instance checks first
    v instanceof Prisma.Decimal ||
    // If Decimal.js is present and imported by the generator, this symbol exists at runtime
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Decimal may be undefined when not installed; codegen controls the import
    (typeof Decimal !== 'undefined' && v instanceof Decimal) ||
    (typeof v === 'object' &&
      'd' in v &&
      'e' in v &&
      's' in v &&
      'toFixed' in v) ||
    (typeof v === 'string' && DECIMAL_STRING_REGEX.test(v)) ||
    typeof v === 'number'
  );
};
`.trim();

  return { helperCode, imports };
}

/**
 * Generate Decimal field schema for input types (Create, Update, etc.)
 * Uses union of multiple formats with refinement validation
 *
 * @param zodNamespace - The zod namespace to use (e.g., 'z' or 'zod')
 * @param hasDecimalJs - Whether decimal.js is installed
 * @param fieldName - Name of the field (for error messages)
 * @returns Zod schema string
 */
export function generateDecimalInputSchema(
  zodNamespace: string,
  hasDecimalJs: boolean,
  fieldName?: string,
): string {
  const unionTypes: string[] = [`${zodNamespace}.number()`, `${zodNamespace}.string()`];

  if (hasDecimalJs) {
    unionTypes.push(`${zodNamespace}.instanceof(Decimal)`);
  }

  unionTypes.push(`${zodNamespace}.instanceof(Prisma.Decimal)`, 'DecimalJSLikeSchema');

  const errorMessage = fieldName ? `Field '${fieldName}' must be a Decimal` : 'Must be a Decimal';

  return `${zodNamespace}.union([
  ${unionTypes.join(',\n  ')},
]).refine((v) => isValidDecimalInput(v), {
  message: "${errorMessage}",
})`;
}

/**
 * Generate Decimal field schema for pure models (output/result types)
 * Uses instanceof check for Prisma.Decimal
 *
 * @param zodNamespace - The zod namespace to use (e.g., 'z' or 'zod')
 * @param fieldName - Name of the field
 * @param modelName - Name of the model (for error messages)
 * @returns Zod schema string
 */
export function generateDecimalModelSchema(
  zodNamespace: string,
  fieldName: string,
  modelName: string,
): string {
  return `${zodNamespace}.instanceof(Prisma.Decimal, {
  message: "Field '${fieldName}' must be a Decimal. Location: ['Models', '${modelName}']",
})`;
}

/**
 * Check if decimal.js is installed in the project
 * @returns true if decimal.js is available
 */
export function isDecimalJsAvailable(): boolean {
  try {
    require.resolve('decimal.js');
    return true;
  } catch {
    return false;
  }
}
