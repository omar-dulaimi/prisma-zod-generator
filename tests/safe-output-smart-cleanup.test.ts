import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { performSmartCleanup } from '../src/utils/safeOutputManagement';

describe('performSmartCleanup shared output directory (issue #365)', () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('preserves Prisma client generator output and user files, removes zod generator leftovers', async () => {
    dir = mkdtempSync(join(tmpdir(), 'pzg-smart-cleanup-'));

    // Files the prisma-client provider emits when sharing the directory (#365 layout)
    writeFileSync(
      join(dir, 'client.ts'),
      "import * as runtime from './internal/class';\n" +
        'export const PrismaClient = runtime.getPrismaClientClass();\n' +
        "export { Prisma } from './internal/prismaNamespace';\n",
    );
    writeFileSync(
      join(dir, 'models.ts'),
      "export type { User } from './models/User';\nexport const modelNames = ['User'];\n",
    );

    // A user file that merely mentions Prisma types
    writeFileSync(
      join(dir, 'my-helpers.ts'),
      "import { Prisma } from './client';\n" +
        'export const toJson = (v: Prisma.JsonValue) => JSON.stringify(v);\n',
    );

    // Genuine prisma-zod-generator leftovers from a pre-manifest run
    writeFileSync(
      join(dir, 'findManyUser.schema.ts'),
      "import * as z from 'zod';\n" +
        "import { UserSelectObjectSchema } from './objects/UserSelect.schema';\n" +
        'export const UserFindManySchema = z.object({ select: UserSelectObjectSchema });\n',
    );
    mkdirSync(join(dir, 'schemas'));
    writeFileSync(join(dir, 'schemas', 'index.ts'), "export * from './enums/SortOrder.schema';\n");

    await performSmartCleanup(dir);

    expect(existsSync(join(dir, 'client.ts'))).toBe(true);
    expect(existsSync(join(dir, 'models.ts'))).toBe(true);
    expect(existsSync(join(dir, 'my-helpers.ts'))).toBe(true);
    expect(existsSync(join(dir, 'findManyUser.schema.ts'))).toBe(false);
    expect(existsSync(join(dir, 'schemas'))).toBe(false);
  });
});

describe('performSmartCleanup nested generated directories (issue #412)', () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('removes generated files inside a known directory but preserves other files placed alongside them', async () => {
    dir = mkdtempSync(join(tmpdir(), 'pzg-smart-cleanup-nested-'));

    mkdirSync(join(dir, 'objects'));

    // Genuine prisma-zod-generator output living in the matched directory
    writeFileSync(
      join(dir, 'objects', 'UserWhereInput.schema.ts'),
      "import * as z from 'zod';\n" +
        "import { StringFilterObjectSchema } from './StringFilter.schema';\n" +
        'export const UserWhereInputObjectSchema = z.object({ id: StringFilterObjectSchema });\n',
    );

    // A file a separate script wrote into the same directory - not generator output,
    // and sharing none of isLikelyGeneratedFile's signatures.
    writeFileSync(
      join(dir, 'objects', 'index.ts'),
      '// Hand-maintained barrel written by a separate build script.\n' +
        "export * from './extra-notes';\n",
    );

    await performSmartCleanup(dir);

    expect(existsSync(join(dir, 'objects', 'UserWhereInput.schema.ts'))).toBe(false);
    expect(existsSync(join(dir, 'objects', 'index.ts'))).toBe(true);
  });

  it('removes a known directory entirely once every file inside it was generator output', async () => {
    dir = mkdtempSync(join(tmpdir(), 'pzg-smart-cleanup-nested-empty-'));

    mkdirSync(join(dir, 'enums'));
    writeFileSync(
      join(dir, 'enums', 'Role.schema.ts'),
      "import * as z from 'zod';\n" +
        "export const RoleSchema = z.enum(['ADMIN', 'USER']);\n" +
        'export default RoleSchema;\n',
    );

    await performSmartCleanup(dir);

    expect(existsSync(join(dir, 'enums'))).toBe(false);
  });
});
