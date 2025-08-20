---
id: contributing
title: Contributing
---

Tests use Vitest; comprehensive generation tests cover multi-provider & feature flags.

Typical workflow:

```bash
npm install
npm run build
npm test
```

Add new config surface:

1. Extend parser + defaults.
2. Write focused test (see `tests/config.test.ts`).
3. Update docs (this site) & add recipe if relevant.

Semantic release determines version bumps from conventional commits.
