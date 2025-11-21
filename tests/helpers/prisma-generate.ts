import { exec } from 'child_process';
import { promisify } from 'util';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const DEFAULT_DATASOURCE_URLS: Record<string, string> = {
  sqlite: 'file:./test.db',
  postgresql: 'postgresql://postgres:postgres@localhost:5432/postgres',
  mysql: 'mysql://root:root@localhost:3306/test',
  sqlserver:
    'sqlserver://localhost:1433;database=master;user=SA;password=YourStrong!Passw0rd;trustServerCertificate=true;',
  mongodb: 'mongodb://127.0.0.1:27017/test',
};

function sanitizeSchema(schemaPath: string): string {
  const raw = readFileSync(schemaPath, 'utf8');
  const providerMatch = raw.match(/datasource\s+\w+\s*{[^}]*provider\s*=\s*"([^"]+)"/);
  const provider = providerMatch?.[1] ?? 'postgresql';

  const withoutUrl = raw.replace(/^\s*url\s*=.*$/gm, '');
  const cleaned = withoutUrl.replace(
    /^\s*previewFeatures\s*=\s*\[([^\]]*)\]\s*$/gm,
    (_match, features) => {
      const filtered = (features as string)
        .split(',')
        .map((f) => f.trim())
        .filter((f) => !/driverAdapters/i.test(f.replace(/['"`]/g, '')))
        .filter(Boolean);
      return filtered.length > 0 ? `  previewFeatures = [${filtered.join(', ')}]` : '';
    },
  );

  writeFileSync(schemaPath, cleaned);
  return provider;
}

function writeConfig(schemaPath: string, provider: string): string {
  const configPath = path.join(path.dirname(schemaPath), 'prisma.config.mjs');
  const datasourceUrl = DEFAULT_DATASOURCE_URLS[provider] ?? DEFAULT_DATASOURCE_URLS.postgresql;
  const normalizedSchemaPath = schemaPath.replace(/\\/g, '/');

  const configContents = `import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: '${normalizedSchemaPath}',
  datasource: {
    url: '${datasourceUrl}',
  },
});
`;

  writeFileSync(configPath, configContents);
  return configPath;
}

export async function prismaGenerate(schemaPath: string, cwd: string = process.cwd()) {
  const provider = sanitizeSchema(schemaPath);
  const configPath = writeConfig(schemaPath, provider);
  return execAsync(`npx prisma generate --config "${configPath}"`, { cwd });
}

export function prismaGenerateSync(schemaPath: string, cwd: string = process.cwd()) {
  const provider = sanitizeSchema(schemaPath);
  const configPath = writeConfig(schemaPath, provider);
  execSync(`npx prisma generate --config ${configPath}`, { cwd, stdio: 'pipe' });
}
