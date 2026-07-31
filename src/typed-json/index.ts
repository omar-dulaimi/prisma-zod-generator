/**
 * Typed JSON and typed scalar fields, compatible with
 * prisma-json-types-generator (PJTG).
 *
 * Emitters should need only `resolveTypedJsonField`. The parser and the
 * converter are exported for tests and for anything that wants to inspect an
 * annotation without resolving it.
 *
 * Usage from an emitter, in the position where the base schema is chosen:
 *
 * ```ts
 * const typed = resolveTypedJsonField(
 *   { modelName, fieldName: field.name, documentation: field.documentation,
 *     isList: field.isList, outputSubdir: 'schemas/objects' },
 *   Transformer.getGeneratorConfig()?.typedJson,
 * );
 * const baseSchema =
 *   typed.status === 'resolved' ? typed.elementExpression : (customSchema || 'jsonSchema');
 * if (typed.status === 'unconvertible') logger.warn(typed.reason);
 * ```
 *
 * `elementExpression` is deliberately the element schema: both the CRUD emitter
 * and the pure-model emitter apply their own list wrapper afterwards. Use
 * `expression` only in an emitter that does not.
 */

export {
  detectPjtgAnnotation,
  parsePjtgAnnotation,
  type PjtgAnnotation,
  type PjtgAnnotationKind,
  type PjtgAnnotationParseResult,
} from './annotation-parser';

export {
  convertTsTypeToZod,
  quoteStringLiteral,
  type TsTypeConversionFailure,
  type TsTypeConversionOptions,
  type TsTypeConversionResult,
  type TsTypeConversionSuccess,
  type TypeNameResolution,
} from './ts-type-to-zod';

export {
  resolveImportSpecifier,
  resolveTypedJsonField,
  type TypedJsonFieldContext,
  type TypedJsonImport,
  type TypedJsonNone,
  type TypedJsonResolved,
  type TypedJsonResult,
  type TypedJsonSuperseded,
  type TypedJsonTypeUse,
  type TypedJsonUnconvertible,
} from './resolver';

// The configuration block, its defaults, and the `[TypeName]` resolution order
// live in src/config/typed-json.ts and are re-exported here so an emitter needs
// only one import. There is one implementation of resolution, not two.
export {
  DEFAULT_TYPED_JSON_NAMESPACE,
  DEFAULT_TYPED_JSON_SCHEMA_SUFFIX,
  resolveTypedJsonConfig,
  resolveTypedJsonType,
  type ResolvedTypedJsonConfig,
  type TypedJsonConfig,
  type TypedJsonTypeResolution,
} from '../config/typed-json';
