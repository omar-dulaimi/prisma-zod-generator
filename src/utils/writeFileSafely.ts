import fs from 'fs';
import path from 'path';
import Transformer from '../transformer';
import { formatFile } from './formatFile';
import { appendSingleFile, isSingleFileEnabled } from './singleFileAggregator';
import { addIndexExport } from './writeIndexFile';
import { addFileToManifest, addDirectoryToManifest } from './safeOutputManagement';

export const writeFileSafely = async (
  writeLocation: string,
  content: string,
  addToIndex = true,
) => {
  try {
    // In single-file mode, we don't write per-file; we append to aggregator
    if (isSingleFileEnabled()) {
      appendSingleFile(writeLocation, content);
      return;
    }

    const dir = path.dirname(writeLocation);
    fs.mkdirSync(dir, { recursive: true });

    // Track directory creation in manifest
    const manifest = Transformer.getCurrentManifest();
    const outputPath = Transformer.getOutputPath();
    if (manifest && outputPath) {
      addDirectoryToManifest(manifest, dir, outputPath);
    }

    // Control formatting via config, default off for schemas for speed
    const cfg = Transformer.getGeneratorConfig();
    const isSchemasFile = /[\\\/]schemas[\\\/]/.test(writeLocation);
    const shouldFormatSchemas = cfg?.formatGeneratedSchemas === true;
    if (isSchemasFile && !shouldFormatSchemas) {
      fs.writeFileSync(writeLocation, content);
    } else {
      fs.writeFileSync(writeLocation, await formatFile(content));
    }

    // Track file creation in manifest
    if (manifest && outputPath) {
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
    console.error(`[writeFileSafely] Failed to write: ${writeLocation}`);
    console.error('[writeFileSafely] Content that failed to format:');
    console.error(content);
    console.error('[writeFileSafely] Error details:');
    console.error(err);
  }
};
