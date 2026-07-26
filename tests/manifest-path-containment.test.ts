import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import {
  addDirectoryToManifest,
  addFileToManifest,
  createNewManifest,
} from '../src/utils/safeOutputManagement';

/**
 * The manifest is what the next run deletes. `performSmartCleanup` walks `manifest.files`,
 * resolves each with `path.join(outputPath, relativePath)` and unlinks it, swallowing errors.
 * Entries are recorded as `path.relative(outputPath, filePath)`, so a write outside the
 * output directory is stored as `../something.ts` — and on the following run the generator
 * deletes a file it never created, outside the tree it owns, silently.
 *
 * Nothing reaches that state through normal use: output paths and naming patterns come from
 * the user's own config. A `filePattern` of `"../shared/{Model}.ts"` is enough, though, and
 * the consequence is losing a file rather than a confusing error. Writing where the config
 * says is fine; tracking it for deletion is not, so escaping paths are refused with a warning
 * and the write itself is left alone.
 *
 * (`utils/securityUtils.ts` held a `sanitizeFilename` for "path traversal attacks" that
 * nothing ever called, and was removed. This is the part of that idea which is actually
 * reachable, at the point where it matters.)
 */
describe('manifest path containment', () => {
  const outputPath = join('/tmp', 'pzg-output');
  const manifest = () => createNewManifest(outputPath);

  it('records paths inside the output directory', () => {
    const m = manifest();
    addFileToManifest(m, join(outputPath, 'schemas', 'objects', 'UserCreateInput.schema.ts'), outputPath);

    expect(m.files).toEqual(['schemas/objects/UserCreateInput.schema.ts'.split('/').join(require('path').sep)]);
  });

  it('refuses a file path that escapes the output directory', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const m = manifest();

    addFileToManifest(m, join(outputPath, '..', 'stolen.ts'), outputPath);

    // Not recorded, so cleanup can never resolve back out to it.
    expect(m.files).toEqual([]);
    expect(m.directories).toEqual([]);

    warn.mockRestore();
    log.mockRestore();
  });

  it('refuses a directory path that escapes the output directory', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const m = manifest();

    addDirectoryToManifest(m, join(outputPath, '..', '..', 'src'), outputPath);

    expect(m.directories).toEqual([]);

    warn.mockRestore();
    log.mockRestore();
  });

  it('says something when it refuses, rather than dropping the entry silently', () => {
    // A silently ignored entry would look like the file was tracked.
    const messages: string[] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => {
      messages.push(a.join(' '));
    });
    const log = vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
      messages.push(a.join(' '));
    });

    addFileToManifest(manifest(), join(outputPath, '..', 'stolen.ts'), outputPath);

    expect(messages.join('\n')).toMatch(/stolen\.ts|outside/i);

    warn.mockRestore();
    log.mockRestore();
  });

  it('still records a sibling directory whose name merely starts the same way', () => {
    // `pzg-output-old` is not inside `pzg-output`, but a naive startsWith check would treat
    // it as if it were.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const m = manifest();

    addFileToManifest(m, `${outputPath}-old/User.ts`, outputPath);

    expect(m.files).toEqual([]);

    warn.mockRestore();
    log.mockRestore();
  });
});
