#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

function run(cmd) { execSync(cmd, { stdio: 'inherit' }); }

// Get last release tag
let tag;
try { tag = execSync('git describe --tags --abbrev=0').toString().trim(); } catch { process.exit(0); }
if (!tag) process.exit(0);
// Skip if versioned docs already exist
if (existsSync(`website/versioned_docs/version-${tag}`)) process.exit(0);
// Only snapshot on minor or major (semantic versioning) not patches
const [, major, minor, patch] = tag.match(/^(?:v)?(\d+)\.(\d+)\.(\d+)$/) || [];
if (!major) process.exit(0);
if (patch !== '0') process.exit(0);
console.log(`Snapshotting docs for ${tag}`);
try {
  run(`npm run docs:version ${tag}`);
} catch (e) {
  console.error('Docs version snapshot failed', e.message);
}
