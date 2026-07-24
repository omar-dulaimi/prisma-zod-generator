import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { TestEnvironment, GENERATION_TIMEOUT } from './helpers';

// Issue #367: generated schemas imported the new prisma-client provider's SERVER entry
// (<output>/client), which hard-imports node: builtins and breaks browser bundles.
// The generator must target the browser-safe entry (<output>/browser) and use the
// cross-runtime-copy safe Prisma.Decimal.isDecimal check instead of instanceof.

describe('Issue #367 — Decimal helpers are client-side bundle safe', () => {
  let testEnv: Awaited<ReturnType<typeof TestEnvironment.createTestEnv>> | null = null;
  let schemasDir = '';

  const collectTsFiles = async (dir: string): Promise<string[]> => {
    const out: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...(await collectTsFiles(full)));
      else if (entry.name.endsWith('.ts')) out.push(full);
    }
    return out;
  };

  beforeAll(async () => {
    testEnv = await TestEnvironment.createTestEnv('issue-367-decimal-client-safe');
    if (!testEnv) return;

    const configPath = join(testEnv.testDir, 'config.json');
    await fs.writeFile(configPath, JSON.stringify({ pureModels: true }, null, 2), 'utf8');

    const schema = `
generator client {
  provider = "prisma-client"
  output   = "${testEnv.outputDir}/client"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator zod {
  provider = "node ./lib/generator.js"
  output   = "${testEnv.outputDir}/schemas"
  config   = "./config.json"
}

model Order {
  id       Int     @id @default(autoincrement())
  price    Decimal
  discount Decimal @default(1.5)
}
`;

    await fs.writeFile(testEnv.schemaPath, schema, 'utf8');
    await testEnv.runGeneration();
    schemasDir = join(testEnv.outputDir, 'schemas');
  }, GENERATION_TIMEOUT);

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  it('imports Prisma from the browser-safe client entrypoint everywhere', async () => {
    const browserImportRe = /from '[^']*\/browser'/;

    for (const relPath of [
      join('models', 'Order.schema.ts'),
      join('objects', 'OrderCreateInput.schema.ts'),
      join('helpers', 'decimal-helpers.ts'),
    ]) {
      const content = await fs.readFile(join(schemasDir, relPath), 'utf8');
      expect(content, `${relPath} should import from the browser entry`).toMatch(browserImportRe);
    }

    // No generated file may reference the server entry (client/client)
    const allFiles = await collectTsFiles(schemasDir);
    expect(allFiles.length).toBeGreaterThan(0);
    for (const file of allFiles) {
      const content = await fs.readFile(file, 'utf8');
      expect(content, `${file} must not import the server entry`).not.toMatch(/client\/client'/);
    }
  });

  it('emits a cross-runtime-safe isDecimal check with the descriptive message in pure models', async () => {
    const content = await fs.readFile(join(schemasDir, 'models', 'Order.schema.ts'), 'utf8');

    expect(content).toMatch(
      /z\.custom<InstanceType<typeof Prisma\.Decimal>>\(\(v\) => Prisma\.Decimal\.isDecimal\(v\)/,
    );
    expect(content).toContain("must be a Decimal. Location: ['Models', 'Order']");
    expect(content).not.toMatch(/z\.instanceof\(Prisma\.Decimal/);
    // Defaults still construct a real Decimal value
    expect(content).toContain('.default(new Prisma.Decimal(1.5))');
  });

  it('accepts Decimal instances from both server and browser runtimes at parse time', async () => {
    const modelMod = await import(
      pathToFileURL(join(schemasDir, 'models', 'Order.schema.ts')).href
    );
    const { Decimal: ServerDecimal } = await import('@prisma/client/runtime/client');
    const { Decimal: BrowserDecimal } = await import('@prisma/client/runtime/index-browser');

    const serverValue = new ServerDecimal('1.5');
    const browserValue = new BrowserDecimal('2.5');

    // Distinct class copies: instanceof would fail across them, isDecimal must not
    expect(serverValue instanceof BrowserDecimal).toBe(false);

    expect(
      modelMod.OrderSchema.safeParse({ id: 1, price: serverValue, discount: serverValue }).success,
    ).toBe(true);
    expect(
      modelMod.OrderSchema.safeParse({ id: 1, price: browserValue, discount: browserValue })
        .success,
    ).toBe(true);
    expect(modelMod.OrderSchema.safeParse({ id: 1, price: 'not-a-decimal-instance' }).success).toBe(
      false,
    );

    // The .default() produces a usable Decimal
    const withDefault = modelMod.OrderSchema.parse({ id: 1, price: serverValue });
    expect(ServerDecimal.isDecimal(withDefault.discount)).toBe(true);
  });

  it('preserves foreign-runtime Decimal instances in input schemas instead of stripping them', async () => {
    const inputMod = await import(
      pathToFileURL(join(schemasDir, 'objects', 'OrderCreateInput.schema.ts')).href
    );
    const { Decimal: ServerDecimal } = await import('@prisma/client/runtime/client');
    const { Decimal: BrowserDecimal } = await import('@prisma/client/runtime/index-browser');

    const serverValue = new ServerDecimal('12.34');
    const parsedServer = inputMod.OrderCreateInputObjectSchema.parse({ price: serverValue });
    // Same instance, not a stripped { d, e, s, toFixed } plain object
    expect(parsedServer.price).toBe(serverValue);

    const browserValue = new BrowserDecimal('56.78');
    const parsedBrowser = inputMod.OrderCreateInputObjectSchema.parse({ price: browserValue });
    expect(parsedBrowser.price).toBe(browserValue);

    // Strings remain accepted by the input union
    expect(inputMod.OrderCreateInputObjectSchema.safeParse({ price: '1.23' }).success).toBe(true);
  });
});
