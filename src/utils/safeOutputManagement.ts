import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { logger } from './logger';
import type { ResolvedSafetyConfig, ConfigurableSafetyResult } from '../types/safety';

export const MANIFEST_FILENAME = '.prisma-zod-generator-manifest.json';

export interface GeneratedManifest {
  version: string;
  generatorVersion?: string;
  generatedAt: string;
  outputPath: string;
  files: string[];
  directories: string[];
  singleFileMode?: boolean;
  singleFileName?: string;
}

// Using ConfigurableSafetyResult from types/safety.ts instead
// export interface SafetyValidationResult - REMOVED

const DANGEROUS_PATHS = [
  'src',
  'lib',
  'components',
  'pages',
  'app',
  'utils',
  'hooks',
  'services',
  'api',
];
const PROJECT_FILES = [
  'package.json',
  'tsconfig.json',
  'next.config.js',
  'vite.config.js',
  'webpack.config.js',
  'rollup.config.js',
  '.gitignore',
  'README.md',
];
const USER_CODE_EXTENSIONS = [
  '.ts',
  '.js',
  '.tsx',
  '.jsx',
  '.vue',
  '.svelte',
  '.py',
  '.java',
  '.cs',
];

export async function validateOutputPathSafety(
  outputPath: string,
  config: ResolvedSafetyConfig,
): Promise<ConfigurableSafetyResult> {
  // If safety is disabled, always allow
  if (!config.enabled) {
    return {
      isSafe: true,
      warnings: [],
      errors: [],
      blocked: false,
      bypassReason: 'Safety system is disabled',
    };
  }

  const result: ConfigurableSafetyResult = {
    isSafe: true,
    warnings: [],
    errors: [],
    blocked: false,
  };

  try {
    const resolvedPath = path.resolve(outputPath);
    const dirName = path.basename(resolvedPath);

    // Combine built-in dangerous paths with custom ones
    const allDangerousPaths = [...DANGEROUS_PATHS, ...config.customDangerousPaths];

    // Check for dangerous path names
    if (allDangerousPaths.includes(dirName.toLowerCase())) {
      const message =
        `Output directory "${dirName}" is a common source code directory name. ` +
        `Consider using a dedicated subdirectory like "${dirName}/generated" instead.`;

      if (config.allowDangerousPaths) {
        result.warnings.push(`${message} (Allowed by configuration)`);
      } else {
        result.warnings.push(message);
      }
    }

    if (!fs.existsSync(resolvedPath)) {
      return result;
    }

    // Combine built-in project files with custom ones
    const allProjectFiles = [...PROJECT_FILES, ...config.customProjectFiles];

    for (const projectFile of allProjectFiles) {
      const projectFilePath = path.join(resolvedPath, projectFile);
      if (fs.existsSync(projectFilePath)) {
        const message =
          `Output directory contains project file "${projectFile}". ` +
          `This suggests it's a project root directory that should not be cleaned automatically.`;

        if (config.allowProjectRoots) {
          result.warnings.push(`${message} (Allowed by configuration)`);
        } else if (config.warningsOnly) {
          result.warnings.push(`${message} (Would block but warnings-only mode enabled)`);
        } else {
          result.errors.push(message);
          result.isSafe = false;
          result.blocked = true;
        }
      }
    }

    const files = await fsPromises.readdir(resolvedPath, { withFileTypes: true });
    const suspiciousFiles: string[] = [];
    const manifestExists = files.some((f) => f.name === MANIFEST_FILENAME);

    for (const file of files) {
      if (file.name === MANIFEST_FILENAME) continue;

      if (file.isFile()) {
        const ext = path.extname(file.name).toLowerCase();

        if (
          file.name.includes('.zod.') ||
          file.name.includes('.schema.') ||
          file.name === 'index.ts' ||
          file.name.startsWith('prisma-zod-')
        ) {
          continue;
        }

        if (
          USER_CODE_EXTENSIONS.includes(ext) ||
          !file.name.includes('.') ||
          file.name.startsWith('.env')
        ) {
          suspiciousFiles.push(file.name);
        }
      }
    }

    if (suspiciousFiles.length > 0 && !manifestExists) {
      const baseMessage =
        `Output directory contains ${suspiciousFiles.length} files that may be user code: ` +
        `${suspiciousFiles.slice(0, 3).join(', ')}${suspiciousFiles.length > 3 ? ', ...' : ''}. ` +
        `No manifest file found from previous generator runs.`;

      if (config.allowUserFiles) {
        result.warnings.push(`${baseMessage} (Allowed by configuration)`);
      } else if (suspiciousFiles.length > config.maxUserFiles) {
        const errorMessage =
          `Too many potentially user-generated files (${suspiciousFiles.length}) found. ` +
          `Maximum allowed: ${config.maxUserFiles}. For safety, automatic cleanup is disabled. ` +
          `Please use a dedicated directory for generated schemas.`;

        if (config.warningsOnly) {
          result.warnings.push(`${errorMessage} (Would block but warnings-only mode enabled)`);
        } else {
          result.errors.push(errorMessage);
          result.isSafe = false;
          result.blocked = true;
        }
      } else {
        result.warnings.push(baseMessage);
      }
    }
  } catch (error) {
    result.errors.push(`Failed to validate output path safety: ${error}`);
    result.isSafe = false;
  }

  return result;
}

export async function loadManifest(outputPath: string): Promise<GeneratedManifest | null> {
  const manifestPath = path.join(outputPath, MANIFEST_FILENAME);

  try {
    const content = await fsPromises.readFile(manifestPath, 'utf8');
    const manifest: GeneratedManifest = JSON.parse(content);

    if (
      !manifest.version ||
      !manifest.generatedAt ||
      !Array.isArray(manifest.files) ||
      !Array.isArray(manifest.directories)
    ) {
      logger.debug(`[safeOutputManagement] Invalid manifest structure in ${manifestPath}`);
      return null;
    }

    return manifest;
  } catch (error) {
    logger.debug(`[safeOutputManagement] Could not load manifest: ${error}`);
    return null;
  }
}

export async function saveManifest(outputPath: string, manifest: GeneratedManifest): Promise<void> {
  const manifestPath = path.join(outputPath, MANIFEST_FILENAME);

  try {
    const content = JSON.stringify(manifest, null, 2);
    await fsPromises.writeFile(manifestPath, content, 'utf8');
    logger.debug(`[safeOutputManagement] Manifest saved to ${manifestPath}`);
  } catch (error) {
    logger.debug(`[safeOutputManagement] Failed to save manifest: ${error}`);
  }
}

export function createNewManifest(
  outputPath: string,
  singleFileMode = false,
  singleFileName?: string,
): GeneratedManifest {
  return {
    version: '1.0',
    generatorVersion: process.env.npm_package_version || 'unknown',
    generatedAt: new Date().toISOString(),
    outputPath: path.resolve(outputPath),
    files: [],
    directories: [],
    singleFileMode,
    singleFileName,
  };
}

export function addFileToManifest(
  manifest: GeneratedManifest,
  filePath: string,
  outputPath: string,
): void {
  const relativePath = path.relative(outputPath, filePath);
  if (!manifest.files.includes(relativePath)) {
    manifest.files.push(relativePath);
  }

  const dir = path.dirname(relativePath);
  if (dir !== '.' && !manifest.directories.includes(dir)) {
    manifest.directories.push(dir);
  }
}

export function addDirectoryToManifest(
  manifest: GeneratedManifest,
  dirPath: string,
  outputPath: string,
): void {
  const relativePath = path.relative(outputPath, dirPath);
  if (relativePath !== '.' && !manifest.directories.includes(relativePath)) {
    manifest.directories.push(relativePath);
  }
}

async function isLikelyGeneratedFile(filePath: string): Promise<boolean> {
  try {
    const content = await fsPromises.readFile(filePath, 'utf8');

    const generatorSignatures = [
      '// Generated by prisma-zod-generator',
      '/* Generated by prisma-zod-generator',
      'from "@prisma/client"',
      'from "./objects/',
      'from "./enums/',
      'export const',
      'z.object({',
      'z.enum([',
      'PrismaClient',
      'Prisma.',
    ];

    const matchCount = generatorSignatures.reduce(
      (count, sig) => (content.includes(sig) ? count + 1 : count),
      0,
    );

    return matchCount >= 2;
  } catch (error) {
    logger.debug(`[safeOutputManagement] Could not analyze file ${filePath}: ${error}`);
    return false;
  }
}

async function performSmartCleanup(outputPath: string): Promise<void> {
  logger.debug('[safeOutputManagement] Performing smart cleanup using pattern analysis');

  try {
    const files = await fsPromises.readdir(outputPath, { withFileTypes: true });
    const cleanupPromises: Promise<void>[] = [];

    for (const file of files) {
      const fullPath = path.join(outputPath, file.name);

      if (file.isFile()) {
        if (file.name === MANIFEST_FILENAME) continue;

        cleanupPromises.push(
          isLikelyGeneratedFile(fullPath).then(async (isGenerated) => {
            if (isGenerated) {
              await fsPromises.unlink(fullPath);
              logger.debug(`[safeOutputManagement] Removed likely generated file: ${file.name}`);
            } else {
              logger.debug(`[safeOutputManagement] Preserved potentially user file: ${file.name}`);
            }
          }),
        );
      } else if (file.isDirectory()) {
        const knownGeneratedDirs = ['enums', 'objects', 'schemas', 'results'];
        if (knownGeneratedDirs.includes(file.name.toLowerCase())) {
          cleanupPromises.push(
            fsPromises.rm(fullPath, { recursive: true, force: true }).then(() => {
              logger.debug(`[safeOutputManagement] Removed generated directory: ${file.name}`);
            }),
          );
        }
      }
    }

    await Promise.all(cleanupPromises);
  } catch (error) {
    logger.debug(`[safeOutputManagement] Smart cleanup failed: ${error}`);
  }
}

async function performManifestBasedCleanup(
  outputPath: string,
  manifest: GeneratedManifest,
): Promise<void> {
  logger.debug('[safeOutputManagement] Performing manifest-based cleanup');

  const cleanupPromises: Promise<void>[] = [];

  for (const relativePath of manifest.files) {
    const fullPath = path.join(outputPath, relativePath);
    cleanupPromises.push(
      fsPromises
        .unlink(fullPath)
        .then(() => logger.debug(`[safeOutputManagement] Removed tracked file: ${relativePath}`))
        .catch(() => {}),
    );
  }

  const sortedDirs = [...manifest.directories].sort((a, b) => b.length - a.length);
  for (const relativePath of sortedDirs) {
    const fullPath = path.join(outputPath, relativePath);
    cleanupPromises.push(
      fsPromises
        .rmdir(fullPath)
        .then(() => logger.debug(`[safeOutputManagement] Removed empty directory: ${relativePath}`))
        .catch(() => {}),
    );
  }

  await Promise.all(cleanupPromises);
}

export async function safeCleanupOutput(
  outputPath: string,
  config: ResolvedSafetyConfig,
  singleFileMode = false,
  singleFileName?: string,
): Promise<GeneratedManifest> {
  logger.debug(`[safeOutputManagement] Starting safe cleanup for: ${outputPath}`);
  logger.debug(`[safeOutputManagement] Safety config: ${JSON.stringify(config)}`);

  const safetyResult = await validateOutputPathSafety(outputPath, config);

  for (const warning of safetyResult.warnings) {
    logger.debug(`[safeOutputManagement] WARNING: ${warning}`);
  }

  if (!safetyResult.isSafe && !safetyResult.bypassReason) {
    const errorMsg = safetyResult.errors.join(' ');
    logger.debug(`[safeOutputManagement] ERROR: ${errorMsg}`);
    throw new Error(
      `Unsafe output path detected: ${errorMsg}\n\n` +
        `To resolve this issue:\n` +
        `1. Use a dedicated directory for generated schemas (e.g., "./generated" or "./src/generated")\n` +
        `2. Or use a subdirectory within your source folder (e.g., "./src/zod-schemas")\n` +
        `3. Configure safety options to allow this path\n` +
        `4. Or disable safety checks entirely (not recommended)\n\n` +
        `This safety check prevents accidental deletion of your work.`,
    );
  }

  // If safety is bypassed, log the reason
  if (safetyResult.bypassReason) {
    logger.debug(`[safeOutputManagement] Safety bypassed: ${safetyResult.bypassReason}`);
  }

  // Skip cleanup and manifest operations if configured
  if (!config.skipManifest) {
    const existingManifest = await loadManifest(outputPath);

    if (existingManifest) {
      await performManifestBasedCleanup(outputPath, existingManifest);
    } else {
      await performSmartCleanup(outputPath);
    }
  } else {
    logger.debug(
      '[safeOutputManagement] Skipping cleanup and manifest operations (skipManifest enabled)',
    );
  }

  const newManifest = createNewManifest(outputPath, singleFileMode, singleFileName);

  logger.debug(`[safeOutputManagement] Safe cleanup completed for: ${outputPath}`);
  return newManifest;
}
