import fs from 'fs/promises';
import path from 'path';
import { formatFile } from './formatFile';
import { addIndexExport } from './writeIndexFile';

export const writeFileSafely = async (
  writeLocation: string,
  content: any,
  addToIndex = true,
) => {
  await fs.mkdir(path.dirname(writeLocation), {
    recursive: true,
  });

  await fs.writeFile(writeLocation, await formatFile(content));

  if (addToIndex) {
    await addIndexExport(writeLocation);
  }
  return true
};
