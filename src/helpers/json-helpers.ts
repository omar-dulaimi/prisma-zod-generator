import { z } from 'zod';
// Need value import for Prisma DbNull/JsonNull sentinels
import { Prisma } from '@prisma/client';

// Central JSON helper schemas inspired by rival implementation, adapted for Prisma 6.
// Exported once and imported where JSON fields are present.

export type NullableJsonInput = Prisma.JsonValue | null | 'JsonNull' | 'DbNull' | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull;

export const transformJsonNull = (v?: NullableJsonInput) => {
  if (v == null || v === 'DbNull') return Prisma.DbNull;
  if (v === 'JsonNull') return Prisma.JsonNull;
  return v;
};

// Recursive JSON value schema (runtime JSON shape). Allows null.
// Note: Precise typing of recursive JSON is tricky; we provide broad ZodType<any> then cast for convenience.
export const JsonValueSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.literal(null),
  z.record(z.string(), z.lazy(() => JsonValueSchema.optional())),
    z.array(z.lazy(() => JsonValueSchema)),
  ])
) as unknown as z.ZodType<Prisma.JsonValue>;

export type JsonValueType = z.infer<typeof JsonValueSchema>;

// Input JSON value schema (accepts toJSON objects + nullable branches).
export const InputJsonValueSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
  z.record(z.string(), z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
  ])
) as unknown as z.ZodType<Prisma.InputJsonValue>;

export type InputJsonValueType = z.infer<typeof InputJsonValueSchema>;

// Nullable JSON input with sentinel handling (DbNull / JsonNull strings for convenience)
export const NullableJsonValue = z
  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull')])
  .nullable()
  .transform((v) => transformJsonNull(v));

export type NullableJsonValueType = z.infer<typeof NullableJsonValue>;
