import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GENERATION_TIMEOUT } from './helpers';
import { prismaGenerateSync } from './helpers/prisma-generate';

/**
 * `helpers/json-helpers.ts` is written into every generated project that has a
 * `Json` column, and its schemas run in the consumer's application rather than in
 * this generator. Nothing executed it: the suite checked only that generated files
 * *import* it at the right path (issue #196), never that what it exports works. So
 * the JSON validation shipped to every such project was unverified.
 *
 * These assertions run against the emitted file rather than anything under `src/`, because
 * the emitted file is what ships. There used to be two copies of this program — a template
 * string in `Transformer.ensureJsonHelpersFile` and a working implementation in
 * `src/helpers/json-helpers.ts` that nothing imported — kept in step only by hand. That
 * module is now the single source and returns the text, so there is one copy to verify.
 *
 * Its types are checked separately: tests/generated-output-compiles.test.ts compiles the
 * whole generated tree, and its fixture schema has a `Json` column, so this file is in
 * that run.
 */
type Helpers = {
  transformJsonNull: (v?: unknown) => unknown;
  JsonValueSchema: { safeParse: (v: unknown) => { success: boolean } };
  InputJsonValueSchema: { safeParse: (v: unknown) => { success: boolean } };
  NullableJsonValue: { parse: (v: unknown) => unknown };
};

const root = join(process.cwd(), `test-env-json-helpers-${process.pid}`);
const emittedPath = join(root, 'generated', 'helpers', 'json-helpers.ts');

const copies: Record<string, Helpers> = {};

beforeAll(async () => {
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, 'schema.prisma'),
    `datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
  output   = "./client"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "./generated"
}

model Event {
  id      String @id @default(cuid())
  payload Json
  extra   Json?
}
`,
  );

  prismaGenerateSync(join(root, 'schema.prisma'), process.cwd());

  copies.emitted = (await import(emittedPath)) as unknown as Helpers;
}, GENERATION_TIMEOUT);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('emitted JSON helpers', () => {
  it('is written where the generated schemas import it from', () => {
    expect(existsSync(emittedPath)).toBe(true);
  });

  describe('emitted copy', () => {
    const h = () => copies.emitted;

    describe('transformJsonNull', () => {
      it('collapses both Prisma null sentinels and absent values to null', () => {
        // DbNull (SQL NULL) and JsonNull (a JSON null value) are distinct in Prisma;
        // this helper deliberately collapses both, per the comment on the
        // implementation. Asserting it keeps that a decision rather than an accident.
        for (const input of [undefined, null, 'DbNull', 'JsonNull'])
          expect(h().transformJsonNull(input), String(input)).toBeNull();
      });

      it('passes real values through untouched', () => {
        const payload = { a: [1, 'two', false, null] };
        expect(h().transformJsonNull(payload)).toBe(payload);
        expect(h().transformJsonNull(0)).toBe(0);
        expect(h().transformJsonNull('')).toBe('');
      });
    });

    describe('JsonValueSchema', () => {
      it('accepts nested JSON, including null at the top level', () => {
        for (const value of [null, 'text', 42, true, [1, [2, [3]]], { a: { b: { c: [null, 1] } } }])
          expect(h().JsonValueSchema.safeParse(value).success, JSON.stringify(value)).toBe(true);
      });

      it('rejects values JSON cannot represent', () => {
        for (const value of [() => 1, Symbol('x'), new Map()])
          expect(h().JsonValueSchema.safeParse(value).success, String(value)).toBe(false);
      });
    });

    describe('InputJsonValueSchema', () => {
      it('rejects top-level null, which is what distinguishes it from JsonValue', () => {
        // Prisma's InputJsonValue excludes null: writing a JSON null needs the
        // JsonNull sentinel. If this ever starts accepting null, the two schemas have
        // silently become the same thing.
        expect(h().InputJsonValueSchema.safeParse(null).success).toBe(false);
        expect(h().JsonValueSchema.safeParse(null).success).toBe(true);
      });

      it('accepts null nested inside objects and arrays', () => {
        expect(h().InputJsonValueSchema.safeParse({ a: null }).success).toBe(true);
        expect(h().InputJsonValueSchema.safeParse([null, 1]).success).toBe(true);
      });
    });

    describe('NullableJsonValue', () => {
      it('turns the sentinels into null and leaves values alone', () => {
        expect(h().NullableJsonValue.parse('DbNull')).toBeNull();
        expect(h().NullableJsonValue.parse('JsonNull')).toBeNull();
        expect(h().NullableJsonValue.parse(null)).toBeNull();
        expect(h().NullableJsonValue.parse({ ok: true })).toEqual({ ok: true });
      });
    });
  });
});
