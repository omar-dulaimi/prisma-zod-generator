import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeFileSafely } from '../src/utils/writeFileSafely';

/**
 * writeFileSafely used to catch every error - including a genuine failure to
 * create the directory or write the file - log it as a warning, and return
 * normally. generate()'s own outer catch was already fixed for the identical
 * reason ("swallowing here made `prisma generate` exit 0 after a failed
 * generation, so a broken setup looked like success and simply produced no
 * schemas" - src/prisma-generator.ts) but this write path still had the gap:
 * a real fs failure meant one file silently missing from otherwise-successful
 * output, with no non-zero exit code and no thrown error to explain why
 * (issue #412, reported as a nondeterministic missing file).
 */
describe('writeFileSafely surfaces real write failures (issue #412)', () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('throws instead of silently swallowing a failed write', async () => {
    dir = mkdtempSync(join(tmpdir(), 'pzg-write-failure-'));

    // A real, unmocked failure: a plain file already occupies a path segment
    // that fs.mkdirSync(..., { recursive: true }) needs to create as a directory.
    const blockedSegment = join(dir, 'objects');
    writeFileSync(blockedSegment, 'not a directory');

    const targetFile = join(blockedSegment, 'User.schema.ts');

    await expect(writeFileSafely(targetFile, 'export const x = 1;\n')).rejects.toThrow();
  });
});
