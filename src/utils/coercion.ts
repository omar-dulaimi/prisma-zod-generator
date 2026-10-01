import { logger } from './logger';

/**
 * Resolve the effective Zod major version for a `zodImportTarget`.
 *
 * `'auto'` (the default) falls back to detecting the installed `zod` package,
 * matching the resolver used elsewhere in the generator.
 */
export function resolveZodVersion(target: 'auto' | 'v3' | 'v4'): 'v3' | 'v4' {
  if (target === 'v3' || target === 'v4') {
    return target;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const zodPackage = require('zod/package.json');
    const version = zodPackage.version;
    if (version) {
      const majorVersion = parseInt(version.split('.')[0], 10);
      return majorVersion >= 4 ? 'v4' : 'v3';
    }
  } catch {
    // fall through to alternate detection
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const zod = require('zod');
      if (typeof zod.z?.email === 'function') {
        return 'v4';
      }
    } catch {
      // ignore
    }
  }

  logger.warn('Failed to detect Zod version, defaulting to v3 syntax');
  return 'v3';
}

/**
 * Boolean schema that also accepts the string forms a query string / form body
 * produces (`'true'` / `'false'`).
 *
 * Plain `Boolean(x)` coercion is wrong here: any non-empty string is truthy, so
 * `'false'` would turn into `true`, and nested objects would be flattened. It
 * also makes an omitted required Boolean silently pass as `false`.
 *
 * The string-to-boolean mapping must survive `z.toJSONSchema()` (used by JSON
 * Schema compatibility mode), so a `.transform()` is out — it would not be
 * representable — and a `z.preprocess()` / `z.stringbool()` union is used
 * instead.
 *
 * Returns the member suffix (no leading `z.`) so callers compose it either as
 * `z.<suffix>` or within an already prefixed chain.
 *
 * - Zod v4: `z.stringbool()` rejects a real `true` from a JSON body, so the
 *   union with `z.boolean()` keeps that working.
 * - Zod v3: `z.stringbool()` does not exist, so a preprocess maps the two
 *   string forms onto the base boolean and passes everything else through.
 */
export function booleanCoercionExpr(target: 'auto' | 'v3' | 'v4'): string {
  if (resolveZodVersion(target) === 'v4') {
    return 'union([z.boolean(), z.stringbool()])';
  }
  return 'preprocess((v) => v === "true" ? true : v === "false" ? false : v, z.boolean())';
}

/**
 * `take` / `skip` field expressions for pagination `*Args` schemas.
 *
 * These are hardcoded in the transformer today; with input coercion enabled they
 * emit `z.coerce.number()` so query-string pagination (`?take=10&skip=5`) works,
 * matching the coercion applied to the `where` filters in the same schemas.
 */
export function takeSkipFields(inputCoercion: boolean): string {
  const numberSchema = inputCoercion ? 'coerce.number()' : 'number()';
  return `take: z.${numberSchema}.optional(), skip: z.${numberSchema}.optional()`;
}
