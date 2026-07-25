import fs from 'fs';
import path from 'path';
import Transformer from '../transformer';
import { formatFile } from './formatFile';
import { appendSingleFile, isSingleFileEnabled } from './singleFileAggregator';
import { addIndexExport } from './writeIndexFile';
import { addFileToManifest, addDirectoryToManifest } from './safeOutputManagement';
import logger from './logger';

/**
 * Format for the target file type, falling back to the raw content.
 *
 * Formatting is a nicety; the file is the deliverable. Prettier used to be
 * invoked with a hard-coded `typescript` parser for every write, so a `.sql`,
 * `.json`, `.md` or `.py` artefact threw, hit the catch below, and never
 * reached disk — while generation still reported success and exited 0.
 */
const formatOrPassThrough = async (content: string, writeLocation: string): Promise<string> => {
  try {
    return await formatFile(content, writeLocation);
  } catch (err) {
    logger.warn(
      `⚠️  Could not format ${path.basename(writeLocation)}; writing it unformatted. ` +
        `(${err instanceof Error ? err.message.split('\n')[0] : String(err)})`,
    );
    return content;
  }
};

export const writeFileSafely = async (
  writeLocation: string,
  content: string,
  addToIndex = true,
) => {
  try {
    // In single-file mode, we don't write per-file; we append to aggregator
    // BUT skip single file mode for Pro generator files (api-docs, etc.)
    const isProGeneratorFile =
      writeLocation.includes('/generated/pro/') && !writeLocation.includes('/generated/zod/');
    if (isSingleFileEnabled() && !isProGeneratorFile) {
      appendSingleFile(writeLocation, content);
      return;
    }

    const dir = path.dirname(writeLocation);
    fs.mkdirSync(dir, { recursive: true });

    // Track directory creation in manifest (but skip for Pro generator files)
    const manifest = Transformer.getCurrentManifest();
    const outputPath = Transformer.getOutputPath();

    if (manifest && outputPath && !isProGeneratorFile) {
      addDirectoryToManifest(manifest, dir, outputPath);
    }

    // Control formatting via config, default off for schemas for speed
    const cfg = Transformer.getGeneratorConfig();
    const isSchemasFile = /[\\\/]schemas[\\\/]/.test(writeLocation);
    const shouldFormatSchemas = cfg?.formatGeneratedSchemas === true;

    // For Pro generator files, write directly without formatting or manifest tracking
    if (isProGeneratorFile) {
      fs.writeFileSync(writeLocation, content);
    } else {
      if (isSchemasFile && !shouldFormatSchemas) {
        fs.writeFileSync(writeLocation, content);
      } else {
        fs.writeFileSync(writeLocation, await formatOrPassThrough(content, writeLocation));
      }
    }

    // Track file creation in manifest (but skip for Pro generator files)
    if (manifest && outputPath && !isProGeneratorFile) {
      addFileToManifest(manifest, writeLocation, outputPath);
    }

    if (addToIndex) {
      try {
        // Avoid bloating index in minimal mode: don't add object schemas or helper files
        const isObjectSchema = /\/objects\//.test(writeLocation);
        const isHelper = /Include\.schema|Select\.schema|Aggregate|GroupBy/i.test(writeLocation);
        const isResult = /\/results\//.test(writeLocation);
        if (!(isObjectSchema || isHelper) || isResult) {
          addIndexExport(writeLocation);
        }
      } catch {
        // Fallback to adding without filtering if any error occurs
        addIndexExport(writeLocation);
      }
    }
  } catch (err) {
    // Surfaced via logger.warn (stdout): Prisma does not relay a generator's
    // stderr, so a console.error here would leave the user with a successful
    // run and a missing file.
    logger.warn(`❌ [writeFileSafely] Failed to write: ${writeLocation}`);
    logger.warn(`   ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    logger.debug('[writeFileSafely] Content that failed to write:', content);
    logger.debug('[writeFileSafely] Error details:', err);
  }
};
