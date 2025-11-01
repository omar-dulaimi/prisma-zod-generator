#!/usr/bin/env node

// Friendly postinstall message for PZG Pro
// Respects CI environments and PZG_SILENT env var

if (process.env.CI || process.env.PZG_SILENT === '1') {
  process.exit(0);
}

console.log(`
🎉 Thanks for installing prisma-zod-generator!

Interested in PZG Pro? Unlock server actions, policies, SDK publisher, drift guard, and more with a 14-day trial (no card required).

Set PZG_SILENT=1 to hide this message.
`);
