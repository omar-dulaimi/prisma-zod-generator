/**
 * Source for the `helpers/json-helpers.ts` file written into generated output.
 *
 * This module used to be a working implementation *and* the generator carried a second,
 * hand-maintained copy of the same code as a template string in
 * `Transformer.ensureJsonHelpersFile`. Only the template shipped; nothing imported this
 * module. Two copies of one program, with nothing keeping them in step.
 *
 * It now follows the pattern `decimal-helpers.ts` already uses: one function returning the
 * source text, called by the writer. The emitted result is type-checked by
 * tests/generated-output-compiles.test.ts, whose fixture schema has a `Json` column, and its
 * behaviour is pinned by tests/emitted-json-helpers.test.ts — so the copy users receive is
 * the copy that is verified.
 *
 * `z` is assumed to be in scope: the caller prepends the zod import, whose binding style
 * depends on zodImportTarget.
 */
export function generateJsonHelpers(): string {
  return `export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };
export type InputJsonValue = Exclude<JsonPrimitive, null> | Array<InputJsonValue | null> | { [k: string]: InputJsonValue | null };
export type NullableJsonInput = JsonValue | 'JsonNull' | 'DbNull' | null;
export const transformJsonNull = (v?: NullableJsonInput) => {
  if (v == null || v === 'DbNull') return null;
  if (v === 'JsonNull') return null;
  return v as JsonValue;
};
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(), z.number(), z.boolean(), z.literal(null),
    z.record(z.string(), z.lazy(() => JsonValueSchema.optional())),
    z.array(z.lazy(() => JsonValueSchema)),
  ])
) as z.ZodType<JsonValue>;
export const InputJsonValueSchema: z.ZodType<InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(), z.number(), z.boolean(),
    z.record(z.string(), z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
  ])
) as z.ZodType<InputJsonValue>;
export const NullableJsonValue = z
  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull'), z.literal(null)])
  .transform((v) => transformJsonNull(v as NullableJsonInput));
`;
}
