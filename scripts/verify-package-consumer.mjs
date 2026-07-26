#!/usr/bin/env node
/**
 * Install the built package into a throwaway project and use it the way a customer does.
 *
 * Everything else verifies an earlier link in the chain: the test suite runs the generator out of
 * `lib/` via `node ./lib/generator.js`, and CI's package-test ran `npm pack --dry-run`, which lists
 * files without installing them. Nothing checked that the tarball installs, that its `bin` resolves,
 * or that `provider = "prisma-zod-generator"` — the form every doc and every user writes — works at
 * all. Not one test in the repo uses that form.
 *
 * So this packs `package/`, installs it into a temp project alongside prisma, @prisma/client and
 * zod, generates from a schema written the documented way, type-checks the result, and parses a
 * payload through an emitted schema. A packaging regression — a file missing from lib/, a broken bin
 * path, an absent config/schema.json — fails here and nowhere else.
 *
 * Run `./package.sh` first; this deliberately does not, so it stays quick to re-run and so CI can
 * reuse the package that job already built.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = process.cwd();
const PACKAGE_DIR = join(REPO, 'package');

const SCHEMA = `datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
  output   = "../generated/client"
}

generator zod {
  provider = "prisma-zod-generator"
  output   = "../generated/zod"
}

enum Role {
  OWNER
  MEMBER
}

model User {
  id    String @id @default(cuid())
  email String @unique
  role  Role   @default(MEMBER)
  meta  Json?
}
`;

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf-8', stdio: 'pipe', ...options });
}

function fail(message, detail) {
  console.error(`\n❌ ${message}`);
  if (detail) console.error(String(detail).split('\n').slice(0, 20).join('\n'));
  process.exit(1);
}

if (!existsSync(join(PACKAGE_DIR, 'package.json'))) {
  fail('No package/ directory. Run ./package.sh first.');
}

const consumer = mkdtempSync(join(tmpdir(), 'pzg-consumer-'));
let tarball;

try {
  console.log('📦 Packing the built package…');
  // --ignore-scripts because package/ inherits a `prepare: husky` script from the copied
  // package.json, and husky prints "`.git` can't be found" there — with no trailing newline, so it
  // glues itself onto the filename npm reports. The name is computed from the manifest rather than
  // parsed out of stdout for the same reason.
  run('npm', ['pack', '--ignore-scripts'], { cwd: PACKAGE_DIR });

  const manifest = JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf-8'));
  const name = `${manifest.name.replace(/^@/, '').replace('/', '-')}-${manifest.version}.tgz`;
  tarball = join(PACKAGE_DIR, name);
  if (!existsSync(tarball)) fail(`npm pack did not produce ${name}`);

  console.log(`🧪 Installing it into ${consumer}…`);
  mkdirSync(join(consumer, 'prisma'), { recursive: true });
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({ name: 'pzg-consumer', private: true, version: '0.0.0' }),
  );

  run('pnpm', ['add', '-D', tarball, 'prisma@7', '@prisma/client@7', 'zod'], { cwd: consumer });

  // The bin entries are what `provider = "prisma-zod-generator"` resolves through.
  for (const bin of ['prisma-zod-generator', 'pzg-pro']) {
    if (!existsSync(join(consumer, 'node_modules', '.bin', bin)))
      fail(`the installed package does not expose the ${bin} binary`);
  }

  // The JSON Schema is what `$schema` in a user's config points at; it is generated during
  // packaging rather than by tsc, so it is exactly the kind of file that goes missing.
  if (
    !existsSync(
      join(consumer, 'node_modules', 'prisma-zod-generator', 'lib', 'config', 'schema.json'),
    )
  )
    fail('lib/config/schema.json is missing from the installed package');

  writeFileSync(join(consumer, 'prisma', 'schema.prisma'), SCHEMA);
  writeFileSync(
    join(consumer, 'prisma.config.mjs'),
    `import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: '${join(consumer, 'prisma', 'schema.prisma')}',
  datasource: { url: 'postgresql://postgres:postgres@localhost:5432/postgres' },
});
`,
  );

  console.log('⚙️  Generating through the installed binary…');
  const generated = run('pnpm', ['exec', 'prisma', 'generate', '--config', 'prisma.config.mjs'], {
    cwd: consumer,
  });
  if (!/Generated Prisma Zod Generator/i.test(generated))
    fail('prisma generate did not report running this generator', generated);

  const objects = join(consumer, 'generated', 'zod', 'schemas', 'objects');
  if (!existsSync(objects) || readdirSync(objects).length === 0)
    fail('no object schemas were written');

  console.log('🔍 Type-checking the generated output…');
  writeFileSync(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'es2022',
        module: 'preserve',
        moduleResolution: 'bundler',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        esModuleInterop: true,
      },
      include: ['generated/zod/**/*.ts'],
    }),
  );

  try {
    run(join(REPO, 'node_modules', '.bin', 'tsc'), ['-p', 'tsconfig.json'], { cwd: consumer });
  } catch (error) {
    fail(
      'the generated output does not type-check in a consumer project',
      `${error.stdout ?? ''}${error.stderr ?? ''}`,
    );
  }

  console.log('▶️  Parsing a payload through an emitted schema…');
  writeFileSync(
    join(consumer, 'check.ts'),
    `import { UserCreateInputObjectSchema as schema } from './generated/zod/schemas/objects/UserCreateInput.schema';

const results = {
  valid: schema.safeParse({ email: 'someone@example.com' }).success,
  badEnum: schema.safeParse({ email: 'someone@example.com', role: 'NOPE' }).success,
  missingRequired: schema.safeParse({}).success,
};

if (results.valid !== true) throw new Error('a valid payload was rejected');
if (results.badEnum !== false) throw new Error('a value outside the enum was accepted');
if (results.missingRequired !== false) throw new Error('a payload missing email was accepted');
console.log('runtime validation behaved correctly');
`,
  );

  try {
    const output = run(join(REPO, 'node_modules', '.bin', 'tsx'), ['check.ts'], { cwd: consumer });
    if (!/behaved correctly/.test(output)) fail('the runtime check did not confirm', output);
  } catch (error) {
    fail(
      'the emitted schema misvalidated in a consumer project',
      `${error.stdout ?? ''}${error.stderr ?? ''}`,
    );
  }

  console.log(
    '\n✅ The packaged generator installs, runs and validates as a consumer would use it.',
  );
} finally {
  rmSync(consumer, { recursive: true, force: true });
  if (tarball) rmSync(tarball, { force: true });
}
