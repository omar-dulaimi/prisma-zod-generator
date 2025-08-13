---
id: release-and-versioning
title: Release & Versioning
---

Library uses semantic-release; docs site is versioned with Docusaurus.

Create a new docs version when publishing a feature or breaking change release:

```bash
npm run docs:version 1.0.5
```

This snapshots current `docs` into `versioned_docs/version-1.0.5` plus sidebar metadata. Repeat for subsequent releases.

Keep unreleased changes updated in main docs; only snapshot after tagging in git.
