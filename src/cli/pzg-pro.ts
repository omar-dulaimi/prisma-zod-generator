#! /usr/bin/env node

/**
 * PZG Pro Generator
 *
 * A Prisma generator for PZG Pro features that works like the main prisma-zod-generator.
 * This generator:
 * 1. Uses Prisma's generatorHandler to receive DMMF data from Prisma
 * 2. Gets DMMF once and passes it to all pro features efficiently
 * 3. Supports all pro features: policies, server-actions, sdk, contracts, etc.
 *
 * Usage in schema.prisma:
 * generator pzgPro {
 *   provider = "node ./lib/cli/pzg-pro.js"
 *   output   = "./generated/pro"
 *   config   = "./zod-generator.config.json"
 * }
 */

import { generatorHandler } from '@prisma/generator-helper';
import { generateProFeatures, PRO_HELP_MESSAGE } from './pzg-pro-generator';

const args = process.argv.slice(2);
const isCliInvocation = require.main === module && args.length > 0 && !args[0].startsWith('--');

if (isCliInvocation) {
  const [command, ...rest] = args;

  if (command !== 'guard') {
    console.error(`Unknown command "${command}". Run "pzg-pro guard --help" for usage.`);
    process.exit(1);
  }

  try {
    const { runDriftGuardCLI } = loadProCliExports();
    runDriftGuardCLI(rest)
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        console.error(`❌ Drift Guard failed: ${detail}`);
        if (error instanceof Error && error.stack) {
          console.error(error.stack);
        }
        process.exit(1);
      });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(detail);
    process.exit(1);
  }
} else {
  generatorHandler({
    onManifest: () => ({
      defaultOutput: './generated/pro',
      prettyName: 'PZG Pro Generator (requires Pro license)',
    }),
    onGenerate: generateProFeatures,
  });
}

function loadProCliExports(): { runDriftGuardCLI: (argv: string[]) => Promise<void> } {
  const modulePath = ['..', 'pro'].join('/');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(modulePath);
    if (typeof mod.runDriftGuardCLI !== 'function') {
      throw new Error(`Missing runDriftGuardCLI export in ${modulePath}`);
    }
    return mod;
  } catch (error) {
    if (isMissingProModuleError(error, modulePath)) {
      throw new Error(PRO_HELP_MESSAGE);
    }
    throw error;
  }
}

function isMissingProModuleError(error: unknown, modulePath: string): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const nodeError = error as NodeJS.ErrnoException;
  if (nodeError.code !== 'MODULE_NOT_FOUND') {
    return false;
  }

  const normalized = modulePath.replace(/\\/g, '/');
  const message = nodeError.message?.replace(/\\/g, '/');
  return message?.includes('/pro/') || message?.includes(normalized) || false;
}
