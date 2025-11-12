import { ConfigurationSchema } from '../lib/config/schema';
import { writeFile } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSONSCHEMA_PATH = path.join(ROOT, 'lib', 'config', 'schema.json');

writeFile(JSONSCHEMA_PATH, JSON.stringify(ConfigurationSchema, null, 2), (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});
