import { z } from 'zod';
// Need value import for Prisma DbNull/JsonNull sentinels

// Central JSON helper schemas inspired by rival implementation, adapted for Prisma 6.
// Exported once and imported where JSON fields are present.

// Prisma 6 may not expose JsonValue / NullTypes at runtime for all client builds. We provide
// a structural JSON type and lightweight sentinel transformation without touching Prisma namespace values.
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };
export type InputJsonValue =
  | JsonPrimitive
  | InputJsonValue[]
  | { [k: string]: InputJsonValue | null };
export type NullableJsonInput = JsonValue | 'JsonNull' | 'DbNull' | null;

export const transformJsonNull = (v?: NullableJsonInput) => {
  if (v == null || v === 'DbNull') return null; // collapse to null
  if (v === 'JsonNull') return null; // treat both sentinels as null in pure model context
  return v as JsonValue;
};

// Recursive JSON value schema (runtime JSON shape). Allows null.
// Note: Precise typing of recursive JSON is tricky; we provide broad ZodType<any> then cast for convenience.
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.literal(null),
    z.record(
      z.string(),
      z.lazy(() => JsonValueSchema.optional()),
    ),
    z.array(z.lazy(() => JsonValueSchema)),
  ]),
) as z.ZodType<JsonValue>;

export type JsonValueType = z.infer<typeof JsonValueSchema>;

// Input JSON value schema (accepts toJSON objects + nullable branches).
export const InputJsonValueSchema: z.ZodType<InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.record(
      z.string(),
      z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)])),
    ),
    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
  ]),
) as z.ZodType<InputJsonValue>;

export type InputJsonValueType = z.infer<typeof InputJsonValueSchema>;

// Nullable JSON input with sentinel handling (DbNull / JsonNull strings for convenience)
export const NullableJsonValue = z
  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull'), z.literal(null)])
  .transform((v) => transformJsonNull(v as NullableJsonInput));

export type NullableJsonValueType = z.infer<typeof NullableJsonValue>;
