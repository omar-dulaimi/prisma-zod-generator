/**
 * The public entry point for typed JSON and typed scalar fields.
 *
 * Given a field's `documentation` plus its metadata, this returns either a Zod
 * expression and the imports it needs, or a reason it could not be produced.
 * It reads no DMMF, writes no files, and knows nothing about any emitter, so
 * every emitter can call it the same way.
 *
 * Two guarantees the callers depend on:
 *
 * - **With no `typedJson` config the answer is always `none`.** Generated
 *   output is then byte-identical to today, which is the compatibility contract
 *   for the many schemas that carry PJTG annotations for a different generator.
 * - **The returned expression carries no optionality and no null sentinel.**
 *   It replaces exactly the base-schema token the emitter would otherwise have
 *   used, and the emitter keeps applying `.optional()`, `.nullable()` and the
 *   `JsonNullValueInput` union exactly as it does now.
 */

import * as path from 'path';
import {
  resolveTypedJsonType,
  type ResolvedTypedJsonConfig,
  type TypedJsonTypeResolution,
} from '../config/typed-json';
import type { CustomImport } from '../parsers/zod-comments';
import { parsePjtgAnnotation, type PjtgAnnotation } from './annotation-parser';
import { convertTsTypeToZod, type TypeNameResolution } from './ts-type-to-zod';

/** An import to add to the emitted file, shaped like the `@zod.import` pipeline's. */
export type TypedJsonImport = CustomImport;

export interface TypedJsonFieldContext {
  fieldName: string;
  modelName?: string;
  /** The field's `documentation`, straight from the DMMF. */
  documentation?: string | null;
  /** True for a list field. The annotation then describes the ELEMENT type. */
  isList?: boolean;
  /** Informational. Optionality is applied by the caller, never here. */
  isOptional?: boolean;
  /**
   * Directory of the file being emitted, relative to the generator output root,
   * for example `schemas/objects` or `schemas/variants/pure`. Used to rewrite a
   * relative `schemaModule`. Omit it and the specifier is used as configured.
   */
  outputSubdir?: string;
  /** Extension to append to relative specifiers, e.g. `.js` under NodeNext. */
  importExtension?: string;
}

interface TypedJsonResultBase {
  /** Diagnostics worth logging. Never fatal. */
  warnings: string[];
  /** True when the field also carries any `@zod.` annotation. */
  hasZodAnnotations: boolean;
}

/** One `[TypeName]` the field's schema depends on, and how it resolved. */
export interface TypedJsonTypeUse {
  typeName: string;
  resolution: TypedJsonTypeResolution;
}

export interface TypedJsonResolved extends TypedJsonResultBase {
  status: 'resolved';
  /**
   * The schema for one value of the field. For a list field this is the element
   * schema, which is what the CRUD and pure-model emitters both want, because
   * each already applies its own list wrapper.
   */
  elementExpression: string;
  /** The whole field's schema: `elementExpression`, wrapped in `z.array` if it is a list. */
  expression: string;
  /** Imports the expression needs. Empty when it needs none. */
  imports: TypedJsonImport[];
  annotation: PjtgAnnotation;
  /**
   * Every type name the expression used, with the resolution it came from.
   * Feeds `buildTypedJsonNamespace`, which must declare the schema actually
   * used for the field rather than form a second opinion about it.
   */
  typeUses: TypedJsonTypeUse[];
  /**
   * True only when `expression` is rooted in `z.string()`, so a native
   * `@db.VarChar(n)` length constraint may still be appended to it.
   *
   * The CRUD emitter appends `.max(n)` for `@db.VarChar(n)` on every `String`
   * field, replaced base schema or not, and `z.enum([...]).max(8)` is a module
   * that throws `TypeError: z.enum(...).max is not a function` the moment it is
   * imported. Callers must skip that step when this is false.
   */
  allowsStringLengthConstraints: boolean;
}

export interface TypedJsonNone extends TypedJsonResultBase {
  status: 'none';
}

export interface TypedJsonSuperseded extends TypedJsonResultBase {
  status: 'superseded';
  reason: string;
  annotation: PjtgAnnotation;
}

export interface TypedJsonUnconvertible extends TypedJsonResultBase {
  status: 'unconvertible';
  reason: string;
  annotation: PjtgAnnotation | null;
}

export type TypedJsonResult =
  | TypedJsonResolved
  | TypedJsonNone
  | TypedJsonSuperseded
  | TypedJsonUnconvertible;

/**
 * Resolve one field's PJTG annotation to a Zod expression.
 *
 * Never throws. Returns `none` when there is nothing to do, which includes the
 * case of `typedJson` not being configured at all.
 */
export function resolveTypedJsonField(
  context: TypedJsonFieldContext,
  config: ResolvedTypedJsonConfig | undefined | null,
): TypedJsonResult {
  // The regression contract: unconfigured means untouched, without so much as
  // parsing the comment.
  if (!config) {
    return { status: 'none', warnings: [], hasZodAnnotations: false };
  }

  try {
    return resolveConfigured(context, config);
  } catch (error) {
    // This runs inside `prisma generate`. An exception escaping here aborts the
    // user's whole generate over one doc comment, so an unexpected failure
    // degrades to "leave the field as it is" and says why.
    return {
      status: 'unconvertible',
      reason: `${describe(context)}: typed JSON resolution failed unexpectedly (${
        error instanceof Error ? error.message : String(error)
      }). The field keeps its current schema.`,
      annotation: null,
      warnings: [],
      hasZodAnnotations: false,
    };
  }
}

function resolveConfigured(
  context: TypedJsonFieldContext,
  config: ResolvedTypedJsonConfig,
): TypedJsonResult {
  const parsed = parsePjtgAnnotation(context.documentation);
  const warnings = parsed.warnings;
  const hasZodAnnotations = parsed.hasZodAnnotations;
  const { annotation } = parsed;

  if (!annotation) {
    if (warnings.length > 0) {
      return {
        status: 'unconvertible',
        reason: warnings[0],
        annotation: null,
        warnings,
        hasZodAnnotations,
      };
    }
    return { status: 'none', warnings, hasZodAnnotations };
  }

  if (parsed.hasZodCustomUse || parsed.hasZodCustom) {
    return {
      status: 'superseded',
      reason: `${describe(context)}: ${annotation.raw} is ignored because @zod${
        parsed.hasZodCustomUse ? '...custom.use(...)' : '.custom({...})'
      } already replaces the base schema.`,
      annotation,
      warnings,
      hasZodAnnotations,
    };
  }

  const collected: string[] = [];
  const typeUses: TypedJsonTypeUse[] = [];
  const resolveTypeName = (name: string): TypeNameResolution => {
    // Errors here are deliberately unprefixed. The one caller adds the
    // `Model.field` prefix and the "keeps its current schema" tail exactly once,
    // whether the reference failed on its own or from inside an inline type.
    const bare = stripNamespace(name, config.namespace);
    if (bare === null) {
      return {
        error: `"${name}" is not in the "${config.namespace}" namespace, so there is nothing to resolve it to`,
      };
    }

    const resolution = resolveTypedJsonType(bare, config);
    if (resolution.kind === 'unresolved') {
      return { error: resolution.reason };
    }

    if (!typeUses.some((use) => use.typeName === bare))
      typeUses.push({ typeName: bare, resolution });
    if (resolution.kind === 'module' && !collected.includes(resolution.importName)) {
      collected.push(resolution.importName);
    }
    return { expression: resolution.expression };
  };

  const unconvertible = (cause: string): TypedJsonUnconvertible => ({
    status: 'unconvertible',
    reason: `${describe(context)}: cannot convert ${annotation.raw} to a Zod schema because ${cause}. The field keeps its current schema.`,
    annotation,
    warnings,
    hasZodAnnotations,
  });

  let elementExpression: string;
  if (annotation.kind === 'namespace-ref') {
    const resolution = resolveTypeName(annotation.value);
    if ('error' in resolution) return unconvertible(resolution.error);
    elementExpression = resolution.expression;
  } else {
    const converted = convertTsTypeToZod(annotation.value, { resolveTypeName });
    if (!converted.ok) return unconvertible(converted.reason);
    elementExpression = converted.expression;
  }

  // z.array(X), never X.array(): the CRUD emitter appends its list wrapper only
  // when the expression does not already contain `.array()`.
  const expression = context.isList ? `z.array(${elementExpression})` : elementExpression;

  // The converter can never produce the postfix form, but `typedJson.map` takes
  // a verbatim expression, so a user can. On a list field that makes the emitter
  // skip its own wrapper and ship a schema one dimension too shallow.
  if (context.isList && elementExpression.includes('.array()')) {
    warnings.push(
      `${describe(context)}: the typedJson.map expression for ${annotation.raw} contains ".array()". ` +
        `On a list field that can cost the outer array wrapper; write z.array(X) instead of X.array().`,
    );
  }

  return {
    status: 'resolved',
    elementExpression,
    expression,
    imports: buildImports(collected, context, config),
    annotation,
    typeUses,
    warnings,
    hasZodAnnotations,
    allowsStringLengthConstraints: /^z\.string\(\)/.test(expression),
  };
}

/**
 * Drop a leading `<namespace>.` qualifier, or answer null when the qualifier is
 * something else. `PrismaJson.Simple` and `Simple` mean the same thing; anything
 * else is a type we have no business guessing at.
 */
function stripNamespace(name: string, namespace: string): string | null {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return name;
  return name.slice(0, dot) === namespace ? name.slice(dot + 1) : null;
}

/** One import statement per module, listing every name the expression uses. */
function buildImports(
  importedItems: string[],
  context: TypedJsonFieldContext,
  config: ResolvedTypedJsonConfig,
): TypedJsonImport[] {
  if (importedItems.length === 0 || !config.schemaModule) return [];

  const source = resolveImportSpecifier(config.schemaModule, context);
  const importStatement = `import { ${importedItems.join(', ')} } from '${source}'`;

  return [
    {
      importStatement,
      source,
      importedItems: [...importedItems],
      isDefault: false,
      isNamespace: false,
      isTypeOnly: false,
      originalStatement: importStatement,
    },
  ];
}

/**
 * Rewrite `schemaModule` so it resolves from the directory being emitted into.
 *
 * A relative specifier is read from the generator output root, because one
 * literal string cannot be correct in `schemas/objects`, `schemas/models` and
 * `schemas/variants/pure` at once. Package specifiers pass through untouched.
 */
export function resolveImportSpecifier(
  schemaModule: string,
  context: Pick<TypedJsonFieldContext, 'outputSubdir' | 'importExtension'>,
): string {
  if (!isRelativeSpecifier(schemaModule)) return schemaModule;

  let specifier = schemaModule;
  const subdir = (context.outputSubdir ?? '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

  if (subdir !== '') {
    const target = path.posix.normalize(schemaModule);
    const relative = path.posix.relative(subdir, target);
    specifier = relative.startsWith('.') ? relative : `./${relative}`;
  }

  const extension = context.importExtension ?? '';
  if (extension !== '' && !path.posix.basename(specifier).includes('.', 1)) {
    specifier += extension;
  }

  return specifier;
}

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../') || specifier === '.';
}

function describe(context: TypedJsonFieldContext): string {
  return context.modelName ? `${context.modelName}.${context.fieldName}` : context.fieldName;
}
