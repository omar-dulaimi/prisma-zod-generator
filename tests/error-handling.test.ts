import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FileSystemError,
  LicenseError,
  logError,
  PZGProError,
  safeFileOperation,
} from '../src/utils/errorHandling';

/**
 * `src/license.ts` is this module's only consumer, and 23 of the file's 24 functions were
 * uncovered — most of it was unreachable and has been removed. What remains is the path a
 * customer hits when a Pro feature refuses to run, so it is worth holding still.
 */
describe('error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('safeFileOperation', () => {
    it('returns the value when the operation succeeds', async () => {
      await expect(safeFileOperation(() => 'contents', '/tmp/x', 'licence')).resolves.toBe(
        'contents',
      );
    });

    it('accepts a synchronous operation as well as a promise', async () => {
      await expect(
        safeFileOperation(async () => 'async contents', '/tmp/x', 'licence'),
      ).resolves.toBe('async contents');
    });

    it('wraps a failure with the path and feature, keeping the original message', async () => {
      const failing = () => {
        throw new Error('EACCES: permission denied');
      };

      await expect(safeFileOperation(failing, '/tmp/licence.json', 'licence')).rejects.toThrow(
        FileSystemError,
      );

      // Losing any of these three turns "something went wrong" into a support ticket.
      await expect(safeFileOperation(failing, '/tmp/licence.json', 'licence')).rejects.toThrow(
        /\/tmp\/licence\.json/,
      );
      await expect(safeFileOperation(failing, '/tmp/licence.json', 'licence')).rejects.toThrow(
        /EACCES: permission denied/,
      );
      await safeFileOperation(failing, '/tmp/licence.json', 'licence').catch((error) => {
        expect((error as FileSystemError).feature).toBe('licence');
      });
    });

    it('survives a thrown non-Error', async () => {
      await expect(
        safeFileOperation(() => {
          throw 'just a string';
        }, '/tmp/x', 'licence'),
      ).rejects.toThrow(/File operation failed/);
    });
  });

  describe('logError', () => {
    it('writes to stdout, because Prisma does not relay a generator’s stderr', () => {
      // The detail here — the error code and which feature was refused — is the actionable part.
      // On stderr none of it reaches someone running `prisma generate`.
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});

      logError(new LicenseError('no licence found', { feature: 'policies' }));

      expect(log).toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });

    it('reports the code, feature and message, and stamps the time', () => {
      const messages: unknown[][] = [];
      vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        messages.push(args);
      });

      logError(new LicenseError('licence expired'));

      const context = messages[0]?.[1] as Record<string, unknown>;
      expect(context.message).toBe('licence expired');
      expect(context.code).toBeDefined();
      expect(String(context.timestamp)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('withholds the raw context outside development', () => {
      // `context` can carry the originating error and file paths; only the safe summary should
      // be printed unless someone is debugging.
      const saved = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const messages: unknown[][] = [];
      vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        messages.push(args);
      });

      logError(new LicenseError('nope', { secretish: 'value' }));

      expect(messages[0]).toHaveLength(2);
      expect(JSON.stringify(messages[0])).not.toContain('secretish');

      if (saved === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = saved;
    });
  });

  describe('the error hierarchy', () => {
    it('gives every error a code and keeps it an Error', () => {
      for (const error of [
        new LicenseError('a'),
        new FileSystemError('b', 'licence'),
      ] as PZGProError[]) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(PZGProError);
        expect(error.code).toBeTruthy();
        // The name must survive subclassing, or `instanceof` checks in callers read oddly in logs.
        expect(error.name).toBe(error.constructor.name);
      }
    });
  });
});
