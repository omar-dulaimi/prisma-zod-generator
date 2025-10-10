#!/usr/bin/env node
/*
 Simple banner to print AGENTS.md contents on session-related actions
 - Used by Husky hooks (post-checkout/post-merge)
 - Can be called manually via `pnpm agent:info`
*/
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const agentsPath = path.join(root, 'AGENTS.md');

function printBanner(text) {
  const lines = text.split(/\r?\n/);
  const max = Math.min(lines.length, 80); // avoid overwhelming the terminal
  const subset = lines.slice(0, max);
  const divider = '-'.repeat(60);
  const header = ' AGENTS.md — Repository Guidelines ';
  const pad = Math.max(0, Math.floor((60 - header.length) / 2));
  const title = `${' '.repeat(pad)}${header}`;

  console.log('\n' + divider);
  console.log(title);
  console.log(divider + '\n');
  console.log(subset.join('\n'));
  if (lines.length > max) {
    console.log('\n[truncated] Open AGENTS.md to read the full guidelines.');
  }
  console.log('\n' + divider + '\n');
}

try {
  const content = fs.readFileSync(agentsPath, 'utf8');
  printBanner(content);
} catch (err) {
  // Fail quietly if AGENTS.md not present
}

