import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const execAsync = promisify(exec);

// Verifies that when the Prisma generator block omits an output attribute,
// but the JSON config file defines one, the JSON output path is used.
describe('JSON config output precedence (no output in generator block)', () => {
  const tempDir = path.join(__dirname, 'tmp-json-output');
  const jsonOutputRel = './zod-json-out';
  const schemaPath = path.join(tempDir, 'schema.prisma');
  const jsonConfigPath = path.join(tempDir, 'zod-generator.config.json');
  const expectedOutputDir = path.join(tempDir, 'zod-json-out');

  beforeAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    await fs.mkdir(tempDir, { recursive: true });

    const jsonConfig = {
      mode: 'custom',
      output: jsonOutputRel,
      useMultipleFiles: true,
      pureModels: false,
    };
    await fs.writeFile(jsonConfigPath, JSON.stringify(jsonConfig, null, 2));

    const schema = `
    generator client { provider = "prisma-client-js" }
    datasource db { provider = "sqlite"; url = "file:./dev.db" }
    generator zod { provider = "node ../../lib/generator.js" config = "./zod-generator.config.json" }
    model Foo { id Int @id @default(autoincrement()) name String }
    `;
    await fs.writeFile(schemaPath, schema);

    // Build once
    await execAsync('tsc', { cwd: path.join(__dirname, '..') });

    // Run generate (no output attribute in block)
    await execAsync(`npx prisma generate --schema="${schemaPath}"`, {
      cwd: path.join(__dirname, '..'),
    });
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it('should use output path from JSON config when generator block omits output', async () => {
    const exists = await fs
      .access(expectedOutputDir)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);

    const indexFile = path.join(expectedOutputDir, 'schemas', 'index.ts');
    const indexExists = await fs
      .access(indexFile)
      .then(() => true)
      .catch(() => false);
    expect(indexExists).toBe(true);
  });
});
