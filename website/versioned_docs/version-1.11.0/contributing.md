---
id: contributing
title: Contributing
---

> ❤️ **Sustainability Matters** – Sponsorship directly funds maintenance, regression fixes, and new feature velocity.
<div style={{ margin: '.75rem 0 1.25rem' }}>
	<a href="https://github.com/sponsors/omar-dulaimi" className="button button--primary">Sponsor on GitHub</a>
</div>

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

---

### Support Roadmap & Impact

Sponsorship accelerates:
- Turnaround on reported regressions
- Prisma release compatibility validation
- Performance profiling & optimization
- Advanced JSON / Bytes features & recipes
- Documentation polish & DX tooling

<a href="https://github.com/sponsors/omar-dulaimi" className="button button--secondary button--sm">Become a Sponsor</a>
