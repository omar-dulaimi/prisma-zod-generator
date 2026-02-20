#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TEST_ENV_PREFIX = 'test-env-';
const TEST_ENV_TIMESTAMP_REGEX = /^test-env-.*-(\d{13})$/;

function parseArgs(argv) {
  let olderThanMs = null;
  let timestampedOnly = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--timestamped-only') {
      timestampedOnly = true;
      continue;
    }
    if (arg === '--older-than-ms') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --older-than-ms');
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Invalid --older-than-ms value: ${value}`);
      }
      olderThanMs = parsed;
      i++;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { olderThanMs, timestampedOnly };
}

function main() {
  const { olderThanMs, timestampedOnly } = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const now = Date.now();

  const dirs = fs
    .readdirSync(cwd, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(TEST_ENV_PREFIX))
    .map((entry) => entry.name)
    .sort();

  const removed = [];
  const skipped = [];

  for (const dirName of dirs) {
    const fullPath = path.join(cwd, dirName);
    const match = dirName.match(TEST_ENV_TIMESTAMP_REGEX);
    const isTimestamped = Boolean(match);

    if (timestampedOnly && !isTimestamped) {
      skipped.push(`${dirName} (non-timestamped)`);
      continue;
    }

    if (olderThanMs !== null) {
      if (!isTimestamped) {
        skipped.push(`${dirName} (no timestamp for age filter)`);
        continue;
      }

      const createdAt = Number(match[1]);
      const ageMs = now - createdAt;
      if (ageMs < olderThanMs) {
        skipped.push(`${dirName} (age ${ageMs}ms < ${olderThanMs}ms)`);
        continue;
      }
    }

    fs.rmSync(fullPath, { recursive: true, force: true });
    removed.push(dirName);
  }

  console.log(`[clean-test-envs] Removed ${removed.length} director${removed.length === 1 ? 'y' : 'ies'}.`);
  for (const dirName of removed) {
    console.log(`- ${dirName}`);
  }

  if (skipped.length > 0) {
    console.log(`[clean-test-envs] Skipped ${skipped.length} director${skipped.length === 1 ? 'y' : 'ies'}.`);
    for (const message of skipped) {
      console.log(`- ${message}`);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`[clean-test-envs] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
