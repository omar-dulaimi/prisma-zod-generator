/**
 * The parts of typed-JSON wiring that both emitters need.
 *
 * `src/typed-json/resolver.ts` answers "what schema does this field get?" and knows
 * nothing about files. This module covers the two things that only make sense once an
 * emitter is writing a file: which imports that file actually needs, and how to report a
 * diagnostic without repeating it once per generated schema.
 */

import type { CustomImport } from '../parsers/zod-comments';
import { logger } from '../utils/logger';
import type { TypedJsonResult } from './resolver';

/** Prisma scalar input types a PJTG annotation may replace. */
const TYPED_JSON_INPUT_TYPES = new Set(['Json', 'String', 'Int', 'Float']);

/**
 * The members of a `<Model><Create|Update><field>Input` list wrapper that hold values of
 * the wrapped column, and so inherit its annotation.
 *
 * `{ set: [...] }` and `{ push: ... }` are how a list column is written through Prisma,
 * which is the whole reason these wrappers need typing. The list is closed rather than
 * "everything in the file" so that any member Prisma adds later is left alone until
 * somebody has checked that a replacement is right for it.
 */
export const LIST_OPERATION_MEMBERS = new Set(['set', 'push']);

/**
 * Whether an annotation is allowed to replace this input type.
 *
 * Deliberately a short allow-list rather than "every scalar". These are the types the
 * upstream corpus annotates, and a type absent from it is one where nobody has checked
 * that a replacement composes with the rest of the pipeline. Widening it later is cheap;
 * shipping a wrong schema for `Bytes` is not.
 */
export function isTypedJsonInputType(inputType: unknown): boolean {
  return typeof inputType === 'string' && TYPED_JSON_INPUT_TYPES.has(inputType);
}

/**
 * Schema names that must never receive a typed replacement, even though their members are
 * named after model fields.
 *
 * `*ScalarWhereWithAggregatesInput` is the one that is easy to get wrong. Its inline
 * scalar branch looks exactly like `WhereInput`'s, but upstream requires it to stay
 * untyped: `{ price: { gt: 100 } }` has to keep typechecking there without a cast, since
 * an aggregate comparison is over the whole group and not over one annotated value.
 *
 * `Select` and the `*AggregateInput` family are boolean-flag schemas whose members happen
 * to share the field names; the existing `extractZodValidationsForField` bails on exactly
 * these two for the same reason.
 */
export function isTypedJsonExcludedSchema(schemaName: string | undefined | null): boolean {
  if (!schemaName) return false;
  if (schemaName.includes('Select')) return true;
  if (/ScalarWhereWithAggregatesInput$/.test(schemaName)) return true;
  if (/(?:Count|Min|Max|Sum|Avg)AggregateInput$/.test(schemaName)) return true;
  return false;
}

/**
 * Keep only the imports whose names the emitted body actually uses, then collapse them to
 * one statement per module.
 *
 * Both steps matter and the order matters. The resolver builds imports per field, so a
 * model with three annotated fields yields three statements from the same module; merging
 * makes that one. Filtering first means the merged statement names only what this
 * particular file references, so `WorkflowWhereInput` (which types scalar branches but not
 * Json ones) does not end up importing a schema it never mentions.
 *
 * Names are sorted so the emitted bytes do not depend on field order in the schema.
 */
export function mergeTypedJsonImports(
  imports: CustomImport[],
  schemaBody: string,
  /**
   * Emit one statement per imported name instead of one per module.
   *
   * For single-file mode, where every schema's imports are concatenated into one bundle and
   * de-duplicated by exact statement text. Merged statements differ from file to file
   * (`{ A }` here, `{ A, B, C }` there), so text de-duplication keeps both and the bundle
   * imports `A` twice - a duplicate-identifier error. One name per statement makes every
   * occurrence of a name byte-identical, so it collapses to exactly one.
   */
  oneNamePerStatement = false,
): CustomImport[] {
  if (imports.length === 0) return [];

  const bySource = new Map<string, Set<string>>();

  for (const candidate of imports) {
    for (const item of candidate.importedItems ?? []) {
      if (!item) continue;
      if (schemaBody && !new RegExp(`\\b${escapeRegExp(item)}\\b`).test(schemaBody)) continue;
      const names = bySource.get(candidate.source) ?? new Set<string>();
      names.add(item);
      bySource.set(candidate.source, names);
    }
  }

  const build = (source: string, importedItems: string[]): CustomImport => {
    const importStatement = `import { ${importedItems.join(', ')} } from '${source}'`;
    return {
      importStatement,
      source,
      importedItems,
      isDefault: false,
      isNamespace: false,
      isTypeOnly: false,
      originalStatement: importStatement,
    };
  };

  return [...bySource.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .flatMap(([source, names]) => {
      const importedItems = [...names].sort();
      return oneNamePerStatement
        ? importedItems.map((item) => build(source, [item]))
        : [build(source, importedItems)];
    });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Report a typed-JSON diagnostic once per generate.
 *
 * One annotated field reaches a dozen input schemas, so an un-deduplicated warning buries
 * everything else in the generator's output and trains people to ignore it.
 */
const reported = new Set<string>();

export function warnOnce(message: string): void {
  if (reported.has(message)) return;
  reported.add(message);
  logger.warn(`[typedJson] ${message}`);
}

/**
 * Log whatever a resolution has to say, at most once each.
 *
 * `unconvertible` is the important one: the field silently keeps its old schema, and
 * without a line in the output the user has no way to tell that their annotation did
 * nothing.
 */
export function reportTypedJsonResult(result: TypedJsonResult, describe: () => string): void {
  for (const warning of result.warnings) warnOnce(warning);

  if (result.status === 'unconvertible') {
    warnOnce(result.reason);
    return;
  }

  if (result.status === 'resolved' && result.hasZodAnnotations) {
    warnOnce(
      `${describe()}: the @zod annotations on this field are not applied, because ` +
        `${result.annotation.raw} already replaces its base schema.`,
    );
  }
}
