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
import { generateProFeatures } from './pzg-pro-generator';
import { runDriftGuardCLI } from '../pro';

const args = process.argv.slice(2);
const isCliInvocation = require.main === module && args.length > 0 && !args[0].startsWith('--');

if (isCliInvocation) {
  const [command, ...rest] = args;

  if (command === 'guard') {
    runDriftGuardCLI(rest)
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Drift Guard failed: ${message}`);
        process.exit(1);
      });
  } else {
    console.error(`Unknown command "${command}". Run "pzg-pro guard --help" for usage.`);
    process.exit(1);
  }
} else {
  generatorHandler({
    onManifest: () => ({
      defaultOutput: './generated/pro',
      prettyName: 'PZG Pro Generator',
    }),
    onGenerate: generateProFeatures,
  });
}
