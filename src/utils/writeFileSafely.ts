import fs from 'fs';
import path from 'path';
import { formatFile } from './formatFile';
import { addIndexExport } from './writeIndexFile';

export const writeFileSafely = async (
  writeLocation: string,
  content: string,
  addToIndex = true,
) => {
  try {
    const dir = path.dirname(writeLocation);
    fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(writeLocation, await formatFile(content));
    if (addToIndex) {
      addIndexExport(writeLocation);
    }
  } catch (err) {
    console.error(`[writeFileSafely] Failed to write: ${writeLocation}`);
    console.error('[writeFileSafely] Content that failed to format:');
    console.error(content);
    console.error('[writeFileSafely] Error details:');
    console.error(err);
  }
};
