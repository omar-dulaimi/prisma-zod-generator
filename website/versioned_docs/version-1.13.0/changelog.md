---
title: Changelog
description: Release history and version changes for Prisma Zod Generator
sidebar_position: 100
---

# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

:::tip Latest Release
The latest version is **v1.13.0**. See the [GitHub Releases](https://github.com/omar-dulaimi/prisma-zod-generator/releases) page for downloads and detailed release notes.
:::

## [1.10.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.10.0...v1.10.1) (2025-08-15)

### 🐛 Bug Fixes

- ensure consistent nullable handling for optional fields across all types ([a732f19](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a732f195d7ea102b81ca7ad79a6dfe7c25d24c0d))

### ♻️ Code Refactoring

- standardize enum handling across all variant types ([b94f2fa](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b94f2fa5d8a60763a5f25c90d7325ec0ccb8a398))

### 📚 Documentation

- add automated changelog sync to website ([b2390e2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b2390e2ee28784e3644ce5da8dc93f6d8e948db4))

## [1.10.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.9.3...v1.10.0) (2025-08-14)

### 🚀 Features

- add MongoDB ObjectId max length validation support ([1c139c1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1c139c1ab4cab2e5f7eea5da5874cbf71bf33f6a)), closes [#167](https://github.com/omar-dulaimi/prisma-zod-generator/issues/167)
- add native type max length validation for varchar/char fields ([74c6ad4](https://github.com/omar-dulaimi/prisma-zod-generator/commit/74c6ad462aa4b1b47c4ba57e087049827ccb34d4)), closes [#167](https://github.com/omar-dulaimi/prisma-zod-generator/issues/167)

### 🐛 Bug Fixes

- correct YAML indentation in CI workflow ([876d637](https://github.com/omar-dulaimi/prisma-zod-generator/commit/876d6372b8bde83306c5454f4646893e5ea32f57))
- enhance native type constraint handling and conflict resolution ([4cd8cad](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4cd8cad7244565c0d693457070ce0730de01ebf6))

### 📚 Documentation

- add comprehensive native type max length validation documentation ([9389b0f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9389b0f44f07a7a76ceb442acd8f14e101d3c743)), closes [#167](https://github.com/omar-dulaimi/prisma-zod-generator/issues/167)
- **ci:** gate docs deploy to docs changes or feat/fix commits ([34b089b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/34b089b5c3f4cb03ee673a6ece42e63d9df22ce1))
- modernize website with responsive design and automated metrics ([e810676](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e810676c7440e18eacb21f21fe0cedeaf41d8a53))
- **readme:** modernize intro, tidy quick start and prerequisites, refine header subline and star cue ([cff65d9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cff65d995f826ba14fcbbf1a87b08e7aca20d8aa))

## [1.9.3](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.9.2...v1.9.3) (2025-08-14)

### 🐛 Bug Fixes

- docs workflow build process ([864668f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/864668f1ca3d188d695b6079f1d87161d07666c5))

### 📚 Documentation

- add version 1.9.2 documentation ([a7c2d91](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a7c2d91942cbd75f3ef046ed3757b33df2c73919))

## [1.9.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.9.1...v1.9.2) (2025-08-13)

### 🐛 Bug Fixes

- **prisma-import:** point Zod schema Prisma imports to client entry for new prisma-client generator ([f009211](https://github.com/omar-dulaimi/prisma-zod-generator/commit/f009211f3793a61c5033dd339526e0e2ab0f54f0))

## [1.9.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.9.0...v1.9.1) (2025-08-13)

### 🐛 Bug Fixes

- **docs:** resolve Docusaurus SSG error by fixing MDX style/class props and update internal links ([#contributing](https://github.com/omar-dulaimi/prisma-zod-generator/issues/contributing), homepage) ([0f04448](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0f04448b146c130dd65450c54ea94775b9dcc5b8))

### 📚 Documentation

- **readme:** restore prominent docs website badge/link ([9105ef3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9105ef36a43ca58a7a5cd5af0d098595edc3475e))
- **readme:** streamline quick start, sponsor & contribute guidance, add badges ([596a8f3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/596a8f32b13cd7caf3c6d2b9c32ec8dc075607f7))

## [1.9.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.8.0...v1.9.0) (2025-08-13)

### 🚀 Features

- **docs,homepage:** mobile hero refinements, button redesign, badge replacement, GitHub CTA styling ([529bbc8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/529bbc8bef4632fed6767c418d45e5aa4feae829))

### ♻️ Code Refactoring

- **types:** remove explicit any in source/tests and ignore docusaurus build artifacts ([163d6be](https://github.com/omar-dulaimi/prisma-zod-generator/commit/163d6be77e4e35e5e7afd29f8b30a8ba445fd0c5))

### 📚 Documentation

- add Docusaurus site, version 1.8.0 snapshot, automation & link checks ([8590d02](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8590d023626c0a99fcf600605bfc30a3a73ba859))

## [1.8.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.7.0...v1.8.0) (2025-08-13)

### ⚠ BREAKING CHANGES

- **pure-models:** pure model exports are now \*Schema and only &lt;Model&gt;.schema.ts files are generated (no &lt;Model&gt;.model.ts). Updated README. Adjust your imports accordingly.
- **pureModels:** pureModels no longer emits relation (object) fields unless pureModelsIncludeRelations=true. Set that flag to retain prior behavior. Added config parsing, defaults, docs, and tests.

### 🚀 Features

- **config:** add pureModelsLean and dateTimeStrategy options with docs and schema updates ([dc3784c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/dc3784cea2eff15fcc0b0722c488a35604b3a506))
- **custom-use:** add [@zod](https://github.com/zod).custom.use override, helper exports, and tests ([72f7b4d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/72f7b4d8bc42476ff28d35eaa343ebe32bcdffd4))
- **models:** overhaul pure model generation (Model naming, lean mode, enum schema refs, DateTime strategies, single-file optimization) ([8462d32](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8462d32687d452660876da34188dab434e863d86))
- **naming:** add stable naming customization presets and docs ([8d611d8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8d611d8fe53c037af65859a4d5dd9e260daa7f2a))
- **pure-models:** unify pure model naming to \*Schema and single .schema.ts output ([5234631](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5234631c5c974b905ea064816ef37f19670e8063))
- **pureModels:** omit relation fields by default; add pureModelsIncludeRelations flag ([cf9eef4](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cf9eef4b8d6b04a63a5ffa39b7b9b7a0761d344b))
- **pure:** support pure-only variant mode (skip CRUD/object schemas when only pure enabled) ([9d4527b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9d4527b8c8fd1fb903e3e65351e6a984fe3cf556))
- **variants,imports:** unify enum schema usage across variant generators and dynamic Prisma client import paths ([a2e126a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a2e126ac994c74d74983ab60ba8748b9f713a115))
- **variants): refined enum handling for pure variant & chore(test:** migrate from deprecated basic reporter ([375fcb8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/375fcb8591b50c13f75016ebc6222ec944b97aaa))

### 🐛 Bug Fixes

- **config:** honor JSON config output when generator block omits output\n\nDefers output path initialization so JSON 'output' is used if schema block lacks output (block > JSON > default). ([5bc90b9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5bc90b9a13f9f871ce108a82fcdb42f5ae5799ed))
- **generator:** honor config output path and correct enum import paths in pure model schemas ([5393d98](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5393d9864a6682e3a18cbda323bc9b9510d79014))
- **json:** align helper file after template update ([77ecfe5](https://github.com/omar-dulaimi/prisma-zod-generator/commit/77ecfe59b96b3cbc5178fce81adcbf44995c0612))
- **json:** drop Prisma.JsonValue references for v6 compatibility and use structural JSON types ([8fef5f7](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8fef5f7e991dc952391124ba6e30edec5db6b69a))
- **prisma-client-preview:** correct import path handling for preview prisma-client generator and file extensions ([65925e2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/65925e2aae08c4510e8add1e653ce1b9e1381eeb))

### ♻️ Code Refactoring

- **json:** centralize JSON helper schema generation and adjust single-file bundling ([2102256](https://github.com/omar-dulaimi/prisma-zod-generator/commit/21022561f469655fa196772e0779acfa654e1281))

### 📚 Documentation

- **recipes:** add CRUD-only, input-only, result-only recipe examples ([36d6702](https://github.com/omar-dulaimi/prisma-zod-generator/commit/36d67029fb142d984b4d91e8cb7d50d6d62479ff))
- **recipes:** add pure-models-lean recipe with DateTime strategy examples ([dcd773a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/dcd773acb9679d102e4535108faf31f5a3794645))

## [Unreleased]

### 🚀 Features

- **naming:** introduce stable naming customization (presets: zod-prisma, zod-prisma-types, legacy-model-suffix) with tokenized file/export patterns and legacy alias support.

### 📚 Documentation

- **readme:** add comprehensive naming customization guide (presets, migration tips, precedence) and mark feature stable.

---

## [1.7.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.6.0...v1.7.0) (2025-08-12)

### 🚀 Features

- **bytes:** align Prisma Bytes mapping with v6 (Uint8Array) and update tests\n\n- I/O schemas: map Bytes to z.instanceof(Uint8Array)\n- Pure models: default to base64 string with size checks; opt-out to Uint8Array via config\n- Update tests and docs/comments accordingly\n\nBREAKING CHANGE: Prisma Bytes now validated as Uint8Array in generated I/O schemas. Pure model default remains base64 string, with config to use Uint8Array. ([15ca502](https://github.com/omar-dulaimi/prisma-zod-generator/commit/15ca502812e87c20ffc5148e744e8c56977ef4ae))

### 📚 Documentation

- **recipes:** fix wrong file names and snippet paths in recipe READMEs; clarify usage steps ([20ec581](https://github.com/omar-dulaimi/prisma-zod-generator/commit/20ec581e048569cc93f845c215d2d1ccbe94665a))
- **recipes:** remove top-level snippets and update references to recipes/\*\n\n- Delete snippets/ folder\n- Update README and recipes/README to point to recipes/&lt;name&gt;/schema.prisma\n- Keep historical mention in CHANGELOG as-is ([3aa4009](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3aa4009bafcc27ee35f12753766adbd1f5503e84))

## [1.6.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.5.0...v1.6.0) (2025-08-11)

### 🚀 Features

- **docs:** add recipes and snippets with generator block examples and configs ([bb284c7](https://github.com/omar-dulaimi/prisma-zod-generator/commit/bb284c7b4a39fbb6824a02c6d2f4fecb985deffa))

### 🐛 Bug Fixes

- **prisma:** add User.password to align generated create inputs with tests ([8485187](https://github.com/omar-dulaimi/prisma-zod-generator/commit/84851874101deaea8e5dfd6aeb754dc6adb39f04))

### ♻️ Code Refactoring

- **config:** improve option parsing and precedence; add tagged warnings and info messages ([81b0d91](https://github.com/omar-dulaimi/prisma-zod-generator/commit/81b0d9125276e98f06df899586152347ddabe866))

### 📚 Documentation

- **readme:** clarify config precedence and logging with tagged messages ([96d705b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/96d705b59ee445727a855953317cfb81de0f7d9f))

## [1.5.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.4.2...v1.5.0) (2025-08-10)

### 🚀 Features

- **config,transformer:** add strictCreateInputs/preserveRequiredScalarsOnCreate and apply to Create-like inputs; use `Omit<>` for typed exports when filtered\n\n- config: introduce strictCreateInputs (default true) and preserveRequiredScalarsOnCreate (default true)\n- transformer: respect flags for Create\* inputs; re-add required scalars in filtered mode; track excluded fields and wrap typed exports with `Omit<>`\n- tests/recipes/docs: update helpers and recipes; document options in README ([cf48027](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cf480274d1a5e66c3d8744645711794d0bab6b4e))

### 🐛 Bug Fixes

- ensure enum value imports are present in variant schemas (post-merge release trigger) ([aed7e61](https://github.com/omar-dulaimi/prisma-zod-generator/commit/aed7e61a3e5e597573d527c51de82b7621d2a99b))

## [1.4.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.4.1...v1.4.2) (2025-08-10)

### 🐛 Bug Fixes

- ensure enum value imports are present in variant schemas (post-merge release trigger) ([b3dde64](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b3dde645435eeab49ff02e37be4b9eef2eddd772))

## [1.4.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.4.0...v1.4.1) (2025-08-09)

### 🐛 Bug Fixes

- **transformer:** correct list handling to avoid duplicate array() and support DateTime[] union\n\n- Use z.union([z.date().array(), z.iso.datetime().array()]) for DateTime lists\n- Append .array() only once and collapse accidental duplicates\n- Preserve optionality behavior with enhanced schemas ([2e75b93](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2e75b9366365acc6a1593e6b0fe7b0e2eb73c54d))

## [1.4.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.3.1...v1.4.0) (2025-08-09)

### 🚀 Features

- **logging:** hide verbose logs by default and gate them behind DEBUG_PRISMA_ZOD/DEBUG\n\n- Add central logger (src/utils/logger.ts)\n- Convert noisy console.log to logger.debug/info/warn\n- Keep warnings/errors visible without DEBUG ([703f716](https://github.com/omar-dulaimi/prisma-zod-generator/commit/703f716e1de8d76b27921aedaab460d7512f40f7))

## [1.3.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.3.0...v1.3.1) (2025-08-09)

### 🐛 Bug Fixes

- **objects:** inline object schema exports and add dual exports (typed + pure Zod) ([4af455c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4af455cd9ae264072b3e4c7b37457de49c250942))
- **whereUniqueInput:** require and restrict fields to unique identifiers only for WhereUniqueInput ([becd08b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/becd08b1185f867beeb464bed24101b57cedc023))

## [1.3.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.2.0...v1.3.0) (2025-08-09)

### 🚀 Features

- Add comprehensive debug logging for filtering ([5309680](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5309680ddd99dd608f153228c2ceb17bfba197b3))
- add core configuration and type system ([2923825](https://github.com/omar-dulaimi/prisma-zod-generator/commit/29238255ac2b3294ef60bd79c8bec00d2a31c4b6))
- Add example configuration and update test schema ([aca8311](https://github.com/omar-dulaimi/prisma-zod-generator/commit/aca8311adac3a162b042bb2b5fa89548bf3f9a82))
- Add legacy configuration transformation and auto-discovery ([f5612a5](https://github.com/omar-dulaimi/prisma-zod-generator/commit/f5612a5009ddf25823cfb0b5af693ca2fe357891))
- add schema variant system ([f133d1a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/f133d1ad9e30503aecb1ad257243109b3f3ffc20))
- add utility modules ([3446571](https://github.com/omar-dulaimi/prisma-zod-generator/commit/34465710d0e6dcb19c17eb0f3e7c3c93a5b3fe03))
- Enhance configuration auto-discovery in generator ([2985a4b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2985a4b453bd513d12f73e171035d4fe9448d66d))
- **generator:** add strict single-file output mode with in-process aggregator; skip variants in single-file; place bundle at output root by default via placeSingleFileAtRoot; include tests and validation tsconfig ([2296b30](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2296b30396293ff86ebef8854fd9519114f8ea05))
- implement foreign key preservation for excluded relation fields ([52897f3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/52897f3347edec6373e5e9ee3cc1d29b9c743123))
- integrate advanced filtering and configuration ([20a5313](https://github.com/omar-dulaimi/prisma-zod-generator/commit/20a53135810bcf0cff2a7edc3e3383a9a89b4d8c))
- integrate zod-integration system with main generator pipeline ([fcc396e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/fcc396e38d8861d66bfb968039d2847857f33146))
- **validation:** add comprehensive schema validation infrastructure ([6da9e61](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6da9e6170846118eccf80a139fdbc9d9d33d7c2e))
- **variants:** generate array/object variants under schemas/variants by default and add variants barrel to main index; fix index exports\n\nAlso: pure models improvements (Bytes base64 mapping, JSON record handling, dedupe defaults), union formatting to single line, enum string arrays, and minimal-mode schema emission stability. All feature tests pass. ([9ea8a46](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9ea8a46cd62ed20d41513de2afec764e59a43b15))

### 🐛 Bug Fixes

- **ci:** generate per-file schemas in example to satisfy tests (useMultipleFiles=true) ([c32e6b8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c32e6b8bef9d5873e936d07a75a7f6849374f10a))
- **config:** resolve tsconfig.json typeRoots and include paths ([976fb49](https://github.com/omar-dulaimi/prisma-zod-generator/commit/976fb49dfe6de37f2b9cbd4535a492fc0bd84e99))
- correct config path handling in field exclusion tests ([67bcbf2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/67bcbf2ae072e1fd2c967c8ed116da775e2e8f5c))
- correct test configurations and schema generation issues ([d1af961](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d1af961a63d1be8c8c986d923ea601ad205d8915))
- enhance [@zod](https://github.com/zod) annotation parsing and validation ([f965e22](https://github.com/omar-dulaimi/prisma-zod-generator/commit/f965e22ba334a8e849a7d425e24ed317c3157291))
- enhance [@zod](https://github.com/zod) method parameter validation for custom error messages ([4d06ec4](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4d06ec44aeac96921da5c0714f31f86692fc2379))
- Enhance model filtering to prevent disabled model schemas in nested folders ([c34e995](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c34e995b5d1a500972e2e4953b16326b9f864958))
- **generator:** correct Zod method chaining order for optional and nullable fields ([0effdf2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0effdf277763ee6717f431e0bcf8de9ef1c7180c))
- implement comprehensive Zod comment parsing engine ([154aaa1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/154aaa1953e0d0dd3a62a263507c741ae97d0d1f))
- Improve field exclusion system and foreign key preservation ([e857e6a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e857e6ac67b2b2814c6dad79b840ea382109bd8f))
- improve regex validation and resolve optional redundancy in zod schema generation ([5ccce49](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5ccce495f1f4cd9eed972ee7dd5fd8435fa8862f))
- prevent duplicate .optional() calls in enhanced zod schemas ([b7eb5e0](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b7eb5e008fcb0df9546c8c66745eac7d458a4642))
- remove unused ObjectSchema imports from result schemas ([488e838](https://github.com/omar-dulaimi/prisma-zod-generator/commit/488e83807d05798213f25772ac3bcc4def0b76f9))
- replace deprecated Zod API usage ([9e46bcc](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9e46bcc482d0dc5c0cf2007474b7cf4c58d13ecf))
- replace deprecated Zod API usage ([92d2537](https://github.com/omar-dulaimi/prisma-zod-generator/commit/92d25376ecaac59a2fb7f589c29a9596f0cbd184))
- resolve [@zod](https://github.com/zod) annotation method validation and parameter formatting ([918d15c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/918d15cb24bbadb480d0492a49ca4b3de26ce26b))
- Resolve config path resolution issues in tests ([2cdb6fc](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2cdb6fcc7c5704a5c01bd5c2ad0f9627cd1b5708))
- resolve ESLint errors to unblock release (unused vars, require->import) ([becfbdb](https://github.com/omar-dulaimi/prisma-zod-generator/commit/becfbdb28da17904ec0299b42c36baa04b13b0c2))
- resolve field exclusion system configuration issues ([2f50c4a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2f50c4aaed7d79884ca17409c6fbac9fe6c144ae))
- resolve test configuration and template variable issues ([fc10758](https://github.com/omar-dulaimi/prisma-zod-generator/commit/fc10758b6f992c862f3593f81c9c4da2c6b4b5bd))
- update supporting modules and test infrastructure ([0bd5d56](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0bd5d56acc1c7862c6e1f54e2b2bca3a537a7a41))

### ♻️ Code Refactoring

- enhance helper modules with filtering support ([4938d6e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4938d6e4359726ab464b02c6b83cbf5c161fe11b))
- **parser:** remove duplicate base type method configurations ([4f5f7f1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4f5f7f1c216af8a36bff3b10aef862fc919246e4))

### 📚 Documentation

- add comprehensive documentation ([d96c872](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d96c8721d44558f4bbeb75d43346698b26db7d61))

## [1.2.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.1.1...v1.2.0) (2025-08-07)

### 🚀 Features

- implement community generator aggressive inlining pattern ([d5675c0](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d5675c0b4938da374927c8f448193c411ccf8a68))
- implement dual schema export strategy to solve TypeScript method trade-off ([9cba538](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9cba5386b5fd83f91d41c6a688bb336d0587bc81))
- implement selective inlining for select schemas ([0a1c921](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0a1c921f3e61b4c0ea510df2986ff63bed694d9f))
- implement true select schema inlining following community generator pattern ([be01d20](https://github.com/omar-dulaimi/prisma-zod-generator/commit/be01d20fe4a29acddd9c1ae2f9c28df1f54d46ff))
- removes the forced ZodType to allow the use of ZodObject properties and methods ([df36da4](https://github.com/omar-dulaimi/prisma-zod-generator/commit/df36da4a21322597ca27ab1781c6f04fe4cdd2bb))

### 🐛 Bug Fixes

- dual export configuration parsing bug ([e4b6853](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e4b68534f1ef184b8b2ef19786c2d254cdb44c07))
- improve TypeScript type inference with explicit Prisma bindings ([cb14493](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cb144935524eb2dc53c304ae098fc7994d2d5ebe))
- model hiding functionality for @@Gen.model(hide: true) ([fe4567e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/fe4567e7e222156cae22a05777d54a99cc9b67d6))
- resolve field name detection bug in generateObjectSchemaField ([94508ae](https://github.com/omar-dulaimi/prisma-zod-generator/commit/94508aefb9f21b68d59f0512b2bbfd548605f9a8))
- resolve FindMany union validation issue and improve composition approach ([92d9301](https://github.com/omar-dulaimi/prisma-zod-generator/commit/92d9301bf3cfdb9c2d51de678f85038549cc91ba))
- use Buffer instead of Uint8Array for bytes field in test ([4608156](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4608156460e91dc394c7d37c87e02bca734de7d4))

### 📚 Documentation

- add composition approach design documentation ([dc4ecc5](https://github.com/omar-dulaimi/prisma-zod-generator/commit/dc4ecc5c6ef2649be5613825b0ed22df08aac3a0))
- add comprehensive dual export configuration guide ([6628842](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6628842436641b8e67af2d3006c01cf1204be779))
- update comparison with aggressive inlining achievement ([b47449f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b47449fa2a2ecaabd106fa2261c50dcf195fe17b))

## [1.1.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.1.0...v1.1.1) (2025-07-30)

### 🐛 Bug Fixes

- improve ESM import handling and type validation ([c07d384](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c07d384d2ec4672271d653446f1c6576f0c2c4d4))
- resolve ESLint errors in ESM configuration tests ([9687c1d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9687c1d0a2e6d3b6cf703d3bac74bd2c318cd7aa))

### 📚 Documentation

- add preview features support section to README ([a348446](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a348446b379da3ab77c9558eb77a9d27a872c1e9))
- remove beta sections and references from README ([32edf33](https://github.com/omar-dulaimi/prisma-zod-generator/commit/32edf3374c4f96f3e482dc37f79e985ccc1b39f0))

## [1.1.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.7...v1.1.0) (2025-07-25)

### 🚀 Features

- add support for new prisma-client generator ([46cdc02](https://github.com/omar-dulaimi/prisma-zod-generator/commit/46cdc027a0229cc8da648d1daac243b2e62e6748)), closes [#127](https://github.com/omar-dulaimi/prisma-zod-generator/issues/127)

## [1.0.7](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.6...v1.0.7) (2025-07-25)

### 🐛 Bug Fixes

- add explicit type annotations to prevent TypeScript implicit any errors ([ef50308](https://github.com/omar-dulaimi/prisma-zod-generator/commit/ef503088af6cd0728267a8fb30b9adab782453b8))

## [1.0.6](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.5...v1.0.6) (2025-07-25)

### 🐛 Bug Fixes

- correct skipDuplicates support for database providers ([0511785](https://github.com/omar-dulaimi/prisma-zod-generator/commit/051178560b0fee4940779c1d941a06f547f16317))

## [1.0.5](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.4...v1.0.5) (2025-07-25)

### 🐛 Bug Fixes

- remove package/package.json from git add in release workflow ([254ad28](https://github.com/omar-dulaimi/prisma-zod-generator/commit/254ad281cbe1ff5e7b96a85437d72c9917c8a9fc))
- resolve TypeScript compilation errors in generated schemas ([85d10a8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/85d10a8e7f494365d8912120d492e6061d9b52dc))

## [1.0.5](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.4...v1.0.5) (2025-07-23)

### 🐛 Bug Fixes

- remove package/package.json from git add in release workflow ([254ad28](https://github.com/omar-dulaimi/prisma-zod-generator/commit/254ad281cbe1ff5e7b96a85437d72c9917c8a9fc))

## [1.0.4](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.3...v1.0.4) (2025-07-23)

### 🐛 Bug Fixes

- remove unused error parameters in test catch blocks ([025b822](https://github.com/omar-dulaimi/prisma-zod-generator/commit/025b82201bb3e615968118c81276f28e3c46874a))
- resolve output directory duplication when path ends with 'schemas' ([e200115](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e200115de9a73d43b5dd540c4f48e75d1bc70612)), closes [#118](https://github.com/omar-dulaimi/prisma-zod-generator/issues/118)

## [1.0.3](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.2...v1.0.3) (2025-07-22)

### 🐛 Bug Fixes

- resolve TypeScript inference issues with z.lazy() relations ([6da8eb8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6da8eb800d3610da52f022146d9448d963111ec1))

### 📚 Documentation

- remove hardcoded version numbers from README ([95d6cbd](https://github.com/omar-dulaimi/prisma-zod-generator/commit/95d6cbdb08fd6fd897ee0e0f99ada71c9fbe8a1f))

## [1.0.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.1...v1.0.2) (2025-07-22)

### 🐛 Bug Fixes

- resolve schema compilation errors in Issue [#119](https://github.com/omar-dulaimi/prisma-zod-generator/issues/119) ([3f29b48](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3f29b486a0486b7fa45dff44c1a1b8ca493162e3))
- resolve Vitest worker timeout in CI ([08a5546](https://github.com/omar-dulaimi/prisma-zod-generator/commit/08a5546743bafc5ee16c57f9aaafb8fdb61c069c))

## [1.0.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.0...v1.0.1) (2025-07-22)

### 🐛 Bug Fixes

- remove broken logo image from README ([eb2ba51](https://github.com/omar-dulaimi/prisma-zod-generator/commit/eb2ba51aaed0005b6489de4c8d84f21c6ea4edaf))

### 📚 Documentation

- update README for v1.0.0 stable release ([0f267c9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0f267c9b7144685530e2a5dd3d3420c9e3e2b5f3))

## 1.0.0 (2025-07-22)

### 🚀 Features

- add comprehensive CI/CD automation and release workflows ([cb562f5](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cb562f5317a1d4d11462c8866dc657cdf780ecab))
- add support for new prisma-client generator ([8224aed](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8224aed0a5ae9a24c76969d655abe9e38e9bafa9)), closes [#116](https://github.com/omar-dulaimi/prisma-zod-generator/issues/116)
- configure semantic-release for beta releases from upgrade branch ([6dfdd98](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6dfdd9885b5f4e295427256d92e0f7f26095cfd2))
- enable semantic-release for upgrade branch ([d6ef9b3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d6ef9b3fd4e8f3515cdddffbc3ab955a61b21e1a))
- remove strict requiresGenerators constraint ([6e1d41b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6e1d41b613145a1bd535f23140ca738cc5cce2d5)), closes [#116](https://github.com/omar-dulaimi/prisma-zod-generator/issues/116)

### 🐛 Bug Fixes

- add MongoDB schema generation step to CI workflow ([b120f12](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b120f127ee39681faeb0632bc06b14754966ff64))
- add skipDuplicates option to createMany query ([710d522](https://github.com/omar-dulaimi/prisma-zod-generator/commit/710d52215b0c5c4e0f026a2e52fdfe8864085179))
- adjust MongoDB test expectations for CI compatibility ([0c53f60](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0c53f6075f481973eb9d9ff3a30018386a678659))
- adjust provider discovery test and fix more ESLint issues ([bb83e97](https://github.com/omar-dulaimi/prisma-zod-generator/commit/bb83e97c19aa0d54b0b2788cbea1679f15f1b553))
- adjust test expectations and resolve remaining ESLint issues ([d1ae46e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d1ae46e7bd7d862020437b9956ff123b139b549f))
- convert vitest config to JavaScript for better Node 18 compatibility ([0106c4f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0106c4f4f3ead2c16d4432ece73eeef481ccc2ce))
- correct branch references from main to master in CI/CD workflows ([009aa79](https://github.com/omar-dulaimi/prisma-zod-generator/commit/009aa79c2312e78a35d342398ab3b5bcddd0ed3f))
- no array around createManyInput ([a244cac](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a244cac1f0475f77948c49c5efec328c59aa8060))
- prevent NaN errors in MongoDB test success rate calculations ([1498a80](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1498a80565ffb9b306e271d3a069d0ffda494853))
- replace absolute paths with relative paths in provider schemas ([97cb362](https://github.com/omar-dulaimi/prisma-zod-generator/commit/97cb36215245966369c20ab1e29f1b970206f8a7))
- resolve all remaining ESLint any type warnings ([b26ea59](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b26ea593d7e4663908be5e70d58d1f73cccd6621))
- resolve CI test failures and ESLint issues ([89ba9e6](https://github.com/omar-dulaimi/prisma-zod-generator/commit/89ba9e60dd8f6f741d3d1725821ef12b2e2c4a94))
- resolve ESLint configuration and CI issues ([df52348](https://github.com/omar-dulaimi/prisma-zod-generator/commit/df5234862e18583f26643c93eb38acf9d2773e82))
- resolve MongoDB schema coverage test import issues ([989addd](https://github.com/omar-dulaimi/prisma-zod-generator/commit/989addd452df84fed45e6f530bdeeb6cbd6bace2))
- skip vitest tests for Node 18 due to Vite 7.x requirements ([93605e1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/93605e1fb361597bac1191c1371f08d3f6a8c453))
- update dependabot configuration ([d5f57fb](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d5f57fb36a28698861cfb23ee95c0f6efe5d985f))
- update package-lock.json with semantic-release dependencies ([814be64](https://github.com/omar-dulaimi/prisma-zod-generator/commit/814be64def5b449fec7b3bab9d4192dc3361f0ec))
- update vitest config for v3 compatibility with Node 18 ([7f34eab](https://github.com/omar-dulaimi/prisma-zod-generator/commit/7f34eab86040ef99ba89c4455a11cf84f9fadf8e))
- use correct DMMF namespace import alias ([a495445](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a495445e6a943db2b750d0ddb082add4d491ce10))

### 📚 Documentation

- add beta testing announcement to README ([1b0bfb2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1b0bfb20fefecf32674f45a9e00bfc8158254d4d))
- add comprehensive CI/CD workflow usage guide ([3da4f92](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3da4f921f7ef55533d259844c9102e6acac0e962))
- add prominent support section to README ([0803dc3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0803dc3a094fd69f8c1173de489d2c01b9d9831e))
- clarify GitHub secrets setup for repository vs environment secrets ([c8ea5cc](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c8ea5cc8eafd7860e4df8d3b56ba74ca8a735c03))
- clarify test schema purpose for new generator ([659c4e0](https://github.com/omar-dulaimi/prisma-zod-generator/commit/659c4e0a113eeb0b23179dcb3aa1e97c0fff7a71))
- comprehensive README improvements ([9d014b9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9d014b940c1c21e8afc3714736f3f7d539393a2d))
- correct link in table of contents ([918f862](https://github.com/omar-dulaimi/prisma-zod-generator/commit/918f8628d89bcccf5d98003598008dfb35afa09a))
- focus beta announcement on Prisma 6 & Zod 4 compatibility ([087c257](https://github.com/omar-dulaimi/prisma-zod-generator/commit/087c25734b7560e04488764342cadfea37c61129))
- improve NPM token setup instructions and troubleshooting ([8f379f9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8f379f9b7fe8890117830ca102267225c9527145))
- modernize README with enhanced styling and comprehensive content ([1f226a1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1f226a163ce9676c2aa5a1316faa1283607a9da5))
- update README for Prisma 6 and Zod 4 support ([bdac9dd](https://github.com/omar-dulaimi/prisma-zod-generator/commit/bdac9ddbd3e2956031eed3422a36c7d3812d5d72))
- update to v0.8.15-beta.0 with new generator support ([7372825](https://github.com/omar-dulaimi/prisma-zod-generator/commit/7372825e797d47b87d155a7b78c08b62fd380bed))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive CI/CD pipeline with GitHub Actions
- Automated release workflow with semantic versioning
- Multi-provider database testing infrastructure
- Extended test matrix for cross-platform compatibility
- Dependabot configuration for automated dependency updates
- Semantic release configuration for automated changelog generation

### Changed

- Improved test command reliability and compatibility
- Updated ESLint configuration for better TypeScript support
- Enhanced vitest configuration for better performance

### Fixed

- Test command compatibility issues with Zod v4
- Undefined config errors in multi-provider tests
- TypeScript type checking configuration

---

_This changelog is automatically generated using [semantic-release](https://github.com/semantic-release/semantic-release)._

---

## Older Versions

For the complete version history including older releases, please see the [full CHANGELOG.md](https://github.com/omar-dulaimi/prisma-zod-generator/blob/master/CHANGELOG.md) on GitHub.

## Version Support

- **Current:** v1.10.x - Full support with new features and bug fixes
- **Previous:** Previous minor versions - Security and critical bug fixes only
- **Legacy:** Older versions - Community support only

## Upgrade Guide

When upgrading between major versions, please refer to our [Upgrade Guide](./upgrade-guide.md) for breaking changes and migration instructions.

## Release Process

This project follows semantic versioning and uses automated releases via [semantic-release](https://github.com/semantic-release/semantic-release). Releases are automatically generated based on commit messages following the [Conventional Commits](https://conventionalcommits.org/) specification.

### Version Types

- **Major (x.0.0)**: Breaking changes that require code updates
- **Minor (x.y.0)**: New features that are backward compatible
- **Patch (x.y.z)**: Bug fixes and small improvements

### Stay Updated

- 🔔 [Watch the repository](https://github.com/omar-dulaimi/prisma-zod-generator) on GitHub for release notifications
- 📦 Subscribe to [GitHub Releases](https://github.com/omar-dulaimi/prisma-zod-generator/releases)
