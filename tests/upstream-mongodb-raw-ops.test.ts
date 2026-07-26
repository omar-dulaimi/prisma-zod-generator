import { getDMMF } from '@prisma/internals';
import { describe, expect, it } from 'vitest';

/**
 * Watch on prisma/prisma#14900.
 *
 * `helpers/helpers.ts` carries a workaround for MongoDB: Prisma's DMMF exposes the raw
 * operations in `mappings.modelOperations` (`findRaw: findPostRaw`) but does not emit the
 * matching argument input types, so `addMissingInputObjectTypesForMongoDbRawOpsAndQueries`
 * synthesises them. The TODO above it said "remove once Prisma fix this issue" with no record
 * of whether that had happened.
 *
 * It has not, as of Prisma 7.0.0 — verified here rather than by reading the issue tracker.
 *
 * **When this test fails, that is the signal, not a defect.** Prisma has started emitting the
 * types, and the workaround plus its resolveMongoDbRawQueryInputObjectTypes helper can be
 * deleted instead of layered on top of what Prisma now provides.
 */
describe('upstream: MongoDB raw operation argument types', () => {
  const SCHEMA = `
datasource db {
  provider = "mongodb"
}

generator client {
  provider = "prisma-client-js"
}

model Post {
  id    String @id @default(auto()) @map("_id") @db.ObjectId
  title String
}
`;

  it('are still missing from the DMMF, so the workaround is still needed', async () => {
    const dmmf = await getDMMF({ datamodel: SCHEMA });

    // The operations themselves are advertised…
    const mapping = dmmf.mappings.modelOperations.find((m) => m.model === 'Post') as
      | Record<string, unknown>
      | undefined;
    expect(mapping?.findRaw).toBe('findPostRaw');
    expect(mapping?.aggregateRaw).toBe('aggregatePostRaw');

    // …but their argument types are not, which is the gap being worked around.
    const inputNames = dmmf.schema.inputObjectTypes.prisma.map((type) => type.name);
    expect(inputNames).not.toContain('PostFindRawArgs');
    expect(inputNames).not.toContain('PostAggregateRawArgs');
  }, 120_000);
});
