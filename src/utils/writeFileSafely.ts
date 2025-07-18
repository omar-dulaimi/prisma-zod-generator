import fs from 'fs';
import path from 'path';
import { formatFile } from './formatFile';
import { addIndexExport } from './writeIndexFile';

export const writeFileSafely = async (
  writeLocation: string,
  content: any,
  addToIndex = true,
) => {
  fs.mkdirSync(path.dirname(writeLocation), {
    recursive: true,
  });

  fs.writeFileSync(writeLocation, await formatFile(content));

  if (addToIndex) {
    addIndexExport(writeLocation);
  }
};
