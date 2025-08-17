#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

// Get last release tag
let tag;
try {
  tag = execSync('git describe --tags --abbrev=0').toString().trim();
} catch {
  process.exit(0);
}
if (!tag) process.exit(0);

// Normalize tag to plain semver version (strip leading 'v' if present)
const normalized = tag.replace(/^v/, '');

// Skip if versioned docs already exist (check against normalized version)
if (existsSync(`website/versioned_docs/version-${normalized}`)) process.exit(0);

// Parse version parts and decide whether to snapshot patches
const [, major, minor, patch] = normalized.match(/^(\d+)\.(\d+)\.(\d+)$/) || [];
if (!major) process.exit(0);

const SNAPSHOT_PATCHES = ['1', 'true', 'yes'].includes(
  String(process.env.DOCS_VERSION_ON_PATCH || '').toLowerCase(),
);

// Only snapshot on minor/major by default; allow patches when DOCS_VERSION_ON_PATCH=1
if (!SNAPSHOT_PATCHES && patch !== '0') process.exit(0);

console.log(
  `Snapshotting docs for ${normalized}${SNAPSHOT_PATCHES ? ' (including patch releases)' : ''}`,
);
try {
  run(`npm run docs:version ${normalized}`);
} catch (e) {
  console.error('Docs version snapshot failed', e.message);
}
