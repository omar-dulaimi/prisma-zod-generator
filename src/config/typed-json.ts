/**
 * `typedJson`: reading prisma-json-types-generator's annotations.
 *
 * PJTG annotates a column with `/// [TypeName]` or `/// ![<ts type>]` and types the
 * generated Prisma Client from it. It validates nothing at runtime. PZG validates at
 * runtime but has never seen those annotations, because `detectZodAnnotations` matches
 * only `/@zod\s*\./i`. Users therefore maintain the same shape twice, which is the drift
 * issue #386 actually reported.
 *
 * This module owns the configuration half of the fix: the shape of the `typedJson`
 * block, its defaults, and the rule that turns a `[TypeName]` into a schema expression.
 * It deliberately contains no emission logic, so both the CRUD path and the pure-model
 * path can resolve a type name the same way.
 *
 * The contract that outranks the feature: **when `typedJson` is absent, this module
 * answers `null`**, not "enabled with defaults". Nothing downstream may switch on, so
 * output stays byte-identical to 3.0.0.
 */

/** Suffix appended to a `[TypeName]` to find its schema. `[Foo]` -> `FooSchema`. */
export const DEFAULT_TYPED_JSON_SCHEMA_SUFFIX = 'Schema';

/** Global namespace the emitted declarations live in. Matches PJTG's own default. */
export const DEFAULT_TYPED_JSON_NAMESPACE = 'PrismaJson';

/** Where the `declare global` file goes, relative to the generator output directory. */
export const DEFAULT_TYPED_JSON_NAMESPACE_OUTPUT = './prisma-json-types.d.ts';

/** A TypeScript identifier, which is all a type name or a namespace name may be. */
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * User-facing `typedJson` configuration block.
 *
 * Named `typedJson` deliberately, not `jsonTypes`: `jsonSchemaCompatible` and
 * `jsonSchemaOptions` already exist here and concern JSON Schema as an *output format*,
 * an unrelated feature.
 */
export interface TypedJsonConfig {
  /**
   * Module that `[TypeName]` resolves from. With `schemaModule: './json-types'`,
   * `/// [WorkflowNode]` uses `WorkflowNodeSchema` imported from there.
   *
   * A relative specifier is relative to the generator output directory, and is rewritten
   * per emitted file so it resolves from wherever that file sits. A bare or scoped
   * package specifier is used verbatim.
   */
  schemaModule?: string;

  /** Suffix appended to the annotation's type name. Default: `Schema`. May be empty. */
  schemaSuffix?: string;

  /** Namespace the emitted `declare global` block declares. Default: `PrismaJson`. */
  namespace?: string;

  /**
   * Apply the annotation to `schemas/results/*` as well. **Default: false.**
   *
   * Off by default deliberately, and the reasoning is the point rather than the setting.
   * Without it PZG is self-inconsistent: the same field with the same annotation is
   * `z.enum(['A','B'])` in `WorkflowCreateInput` and `z.string()` in
   * `WorkflowFindManyResult`. That is a defect on its own terms.
   *
   * It is still not worth defaulting to true, because result schemas are emitted by
   * default - thirteen per model, with no `emit` config at all. So typing them by default
   * would not be a quiet nicety for people who opted into result validation; it would
   * change the READ path for everyone who turns `typedJson` on. A row written before the
   * annotation existed then throws on read, which is a production incident in someone
   * else's data, triggered by adding a comment to a schema.
   *
   * Weigh the two failure modes rather than the two principles. Default true breaks
   * reads of existing rows. Default false leaves the result schema disagreeing with the
   * input schema until the user opts in: confusing, documented, breaks nothing. The
   * second is the lesser harm and the only one that cannot page someone at night.
   */
  applyToResults?: boolean;

  /** Emit the `declare global` namespace file. Default: false. */
  emitNamespace?: boolean;

  /**
   * Path of the emitted namespace file, relative to the generator output directory.
   * Default: `./prisma-json-types.d.ts`.
   */
  namespaceOutput?: string;

  /**
   * Explicit `TypeName` -> Zod expression overrides, checked before `schemaModule`.
   * The escape hatch for anything the convention cannot express.
   */
  map?: Record<string, string>;
}

/** `TypedJsonConfig` with every default filled in. */
export interface ResolvedTypedJsonConfig {
  schemaModule: string | undefined;
  schemaSuffix: string;
  namespace: string;
  applyToResults: boolean;
  emitNamespace: boolean;
  namespaceOutput: string;
  map: Record<string, string>;
}

/**
 * How a `[TypeName]` resolved.
 *
 * `unresolved` is a first-class outcome, not an error: a schema annotated for PJTG alone
 * must keep generating unchanged when PZG is not configured for it. Callers leave the
 * field exactly as it is today and record the reason.
 */
export type TypedJsonTypeResolution =
  | { kind: 'mapped'; expression: string }
  | { kind: 'module'; importName: string; module: string; expression: string }
  | { kind: 'unresolved'; reason: string };

/**
 * Fill in the defaults for a configured `typedJson` block, or answer `null` when the key
 * is absent. `null` means "behave exactly as 3.0.0 did".
 */
export function resolveTypedJsonConfig(
  config: { typedJson?: TypedJsonConfig } | null | undefined,
): ResolvedTypedJsonConfig | null {
  const typedJson = config?.typedJson;
  if (!typedJson || typeof typedJson !== 'object') {
    return null;
  }

  return {
    schemaModule:
      typeof typedJson.schemaModule === 'string' && typedJson.schemaModule.trim().length > 0
        ? typedJson.schemaModule.trim()
        : undefined,
    // `??`, not `||`: an explicitly empty suffix means `[Foo]` -> `Foo`, which is a
    // legitimate convention and is not the same thing as leaving the key unset.
    schemaSuffix: typedJson.schemaSuffix ?? DEFAULT_TYPED_JSON_SCHEMA_SUFFIX,
    namespace: typedJson.namespace || DEFAULT_TYPED_JSON_NAMESPACE,
    // `=== true`, so anything short of an explicit opt-in leaves the read path alone.
    applyToResults: typedJson.applyToResults === true,
    emitNamespace: typedJson.emitNamespace === true,
    namespaceOutput: typedJson.namespaceOutput || DEFAULT_TYPED_JSON_NAMESPACE_OUTPUT,
    map: { ...(typedJson.map ?? {}) },
  };
}

/**
 * Resolve one `[TypeName]` to a Zod expression, by the order in the design:
 *
 * 1. `typedJson.map[TypeName]`, an exact expression.
 * 2. `<TypeName><schemaSuffix>` imported from `typedJson.schemaModule`.
 * 3. Neither: unresolved, with a reason worth putting in a warning.
 *
 * Accepts a raw `typedJson` block as well as a resolved one, and normalises before
 * reading anything. Not politeness: a raw block has no `schemaSuffix`, and reading it
 * unnormalised composes the import name `FooSchema` as `Fooundefined` - an identifier
 * that looks plausible in the emitted file, is missing from the user's module, and only
 * fails when *they* build. `resolveTypedJsonConfig` is idempotent, so normalising an
 * already-resolved config is free.
 */
export function resolveTypedJsonType(
  typeName: string,
  config: ResolvedTypedJsonConfig | TypedJsonConfig,
): TypedJsonTypeResolution {
  const name = typeName?.trim() ?? '';

  if (!IDENTIFIER.test(name)) {
    return {
      kind: 'unresolved',
      reason: `"${typeName}" is not a TypeScript identifier, so it cannot name a schema`,
    };
  }

  const settings = resolveTypedJsonConfig({ typedJson: config ?? {} }) ?? {
    schemaModule: undefined,
    schemaSuffix: DEFAULT_TYPED_JSON_SCHEMA_SUFFIX,
    namespace: DEFAULT_TYPED_JSON_NAMESPACE,
    applyToResults: false,
    emitNamespace: false,
    namespaceOutput: DEFAULT_TYPED_JSON_NAMESPACE_OUTPUT,
    map: {},
  };

  const mapped = settings.map[name];
  if (typeof mapped === 'string' && mapped.trim().length > 0) {
    return { kind: 'mapped', expression: mapped.trim() };
  }

  if (settings.schemaModule) {
    const importName = `${name}${settings.schemaSuffix}`;
    return {
      kind: 'module',
      importName,
      module: settings.schemaModule,
      expression: importName,
    };
  }

  return {
    kind: 'unresolved',
    reason:
      `no typedJson.schemaModule is configured and typedJson.map has no entry for "${name}", ` +
      `so there is nothing to resolve it to`,
  };
}

/** Whether two resolutions name the same schema, for conflict detection. */
export function sameTypedJsonResolution(
  a: TypedJsonTypeResolution,
  b: TypedJsonTypeResolution,
): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'module' && b.kind === 'module') {
    return a.importName === b.importName && a.module === b.module;
  }
  if (a.kind === 'mapped' && b.kind === 'mapped') {
    return a.expression === b.expression;
  }
  return true;
}
