## [2.0.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v2.0.0...v2.0.1) (2025-11-22)

### ⏪ Reverts

* Revert "chore(release): 2.0.0 [skip ci]" ([d185d92](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d185d92edab1d0cd41a919b2941244200a4cb40a))
* Revert "chore(release)!: reissue prisma 7 requirement" ([6c558e7](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6c558e74a95538dd3ea46ca9cdc139353335dfc9))

## [1.32.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.32.1...v1.32.2) (2025-11-21)

### 🐛 Bug Fixes

* **types:** support legacy getConfig flag ([e47d4d7](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e47d4d7d9b4611ede201455d0863873890312e93))

### 📚 Documentation

* update runtime requirements for prisma 7 ([c4789bd](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c4789bda936818b8cf234f826078afb808dbe847))

## [1.32.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.32.0...v1.32.1) (2025-11-14)

### 🐛 Bug Fixes

* **transformer:** optional inverse relation lists ([502dc17](https://github.com/omar-dulaimi/prisma-zod-generator/commit/502dc178d90032663b6e6e8f31e8a4daa704720e))

## [1.32.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.31.8...v1.32.0) (2025-11-14)

### 🚀 Features

* added global operation exclusions ([6775f5d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6775f5d6ba587b7251be051b0882724f801a550a))
* **core:** add support for globalExclusions on operations ([39d7b9e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/39d7b9ed45211d6fa46747b0cc6aeb7458872ae1))

### 📚 Documentation

* add JSON Schema IntelliSense guide and update config references ([ccfff04](https://github.com/omar-dulaimi/prisma-zod-generator/commit/ccfff04dcd65efebc151c6e81b01faeaa7d481a7))
* enhance pricing documentation and add sponsor notice with image ([82888df](https://github.com/omar-dulaimi/prisma-zod-generator/commit/82888df1be9254199e59658dcaef760390eba9b7))

## [1.31.8](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.31.7...v1.31.8) (2025-11-12)

### 🐛 Bug Fixes

* ensure pnpm exec is used for JSON schema generation ([b5b6788](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b5b6788e2d14449e1c01c745ba27d51280ae704c))

## [1.31.7](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.31.6...v1.31.7) (2025-11-09)

### 🐛 Bug Fixes

* **transformer:** lazy include references for findMany ([9aaece8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9aaece85e12c244c95cd35e5848f99e457b8294d)), closes [#332](https://github.com/omar-dulaimi/prisma-zod-generator/issues/332)
* **transformer:** refactor include field reference resolution logic ([7b23cfe](https://github.com/omar-dulaimi/prisma-zod-generator/commit/7b23cfe33120e3053592f0feb926067f1245c8b6))

## [1.31.6](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.31.5...v1.31.6) (2025-11-09)

### 🐛 Bug Fixes

* **license:** add customer ID to license info and CLI output ([57b15f4](https://github.com/omar-dulaimi/prisma-zod-generator/commit/57b15f43a6a06c2b38818a04c3f3837f1edbfbd1))

## [1.31.5](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.31.4...v1.31.5) (2025-11-09)

### 🐛 Bug Fixes

* **cli:** surface seat/expiry in license-check and sync pro docs ([2d470c0](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2d470c08872d1f0d1cba713c425de12d849f79fc))

## [1.31.4](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.31.3...v1.31.4) (2025-11-09)

### 🐛 Bug Fixes

* **license:** enhance license validation with signature extraction and testing ([a42ad08](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a42ad08c3afe92b0070e58b74f8e3fbf5671c41b))

## [1.31.3](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.31.2...v1.31.3) (2025-11-07)

### 🐛 Bug Fixes

* **decimal:** align prisma import resolution ([b5bb5be](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b5bb5bedd1569ada5090f783dff13dd37cabdeda))

## [1.31.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.31.1...v1.31.2) (2025-11-01)

### 🐛 Bug Fixes

* **select:** allow count output where filters ([955f1c8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/955f1c863a2f87c1429c88342c97576bed31b763)), closes [#326](https://github.com/omar-dulaimi/prisma-zod-generator/issues/326)
* **utils:** prevent single file type collisions ([5b2d020](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5b2d0205b5c907b3565cf9adaa00bf35d7bf48a2)), closes [#322](https://github.com/omar-dulaimi/prisma-zod-generator/issues/322)

## [1.31.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.31.0...v1.31.1) (2025-11-01)

### 🐛 Bug Fixes

* **decimal:** Fixing un-escaped-quotes issue in validation message ([5aacce6](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5aacce6d9035e175462c87a7ca6850571305b0da))

## [1.31.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.30.2...v1.31.0) (2025-11-01)

### 🚀 Features

* **pro:** integrate monetization suite and docs ([8f61d5b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8f61d5b8847d812c2de35e419c4594c1295fdb15))

### 🐛 Bug Fixes

* ci ([15089ff](https://github.com/omar-dulaimi/prisma-zod-generator/commit/15089fff25789fb14e336e1a36d83eee2c8ab536))
* **cli:** lazily load pro modules in public build ([9265d4f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9265d4f198868e4c45baee485ad1efd6ddbbae09))
* **dos:** avoid array spread when computing json depth ([32e9558](https://github.com/omar-dulaimi/prisma-zod-generator/commit/32e95583850e2c94670c528182774ce617f540d6))
* **transactions:** hold serializable mutex for entire transaction ([0f96005](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0f9600550f13ef59b9e8f5a10af10c7109eea7f1))

### 📚 Documentation

* **api-docs:** note tsx prerequisite for mock server tests ([69ce714](https://github.com/omar-dulaimi/prisma-zod-generator/commit/69ce7144a078f053912b76010117f2624b954951))
* **contracts:** include jest-pact in prerequisites ([1c752fa](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1c752fa334c7033097e80554ce2ecc0b870feb5e))
* **contributing:** remove discord reference from support section ([16e8b8c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/16e8b8c7bb4bd3e6746e6a461de6002d3fe399fd))
* **factories:** fix generated import path to include pro segment ([c31d334](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c31d334698efd00d0a60aa37d5d0b86f5ffbd037))
* fix broken internal links ([f49c556](https://github.com/omar-dulaimi/prisma-zod-generator/commit/f49c5568f8cbfa6ebc6fc432f84352c86304a627))
* **forms:** add z import for example ([941a8ea](https://github.com/omar-dulaimi/prisma-zod-generator/commit/941a8ea662818e1d271f706b22e81d54716c7ecb))
* **forms:** align example with register-based rhf usage ([d92fec3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d92fec381773c506716ebfd51b2899d7801f4f89))
* **forms:** update shadcn init command to current package name ([1234fcd](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1234fcdcef51f18a573d4221042be7c6231e4cdf))
* **guard:** fix yaml fence and clarify allowed-break example ([7d7518d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/7d7518de26433cc28d0e2b448c240ac74bd07ee7))
* **license:** set california governing law for pro agreement ([5c01ada](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5c01ada5cabab2955ece4ef42a87aca6025b91c3))
* **multi-tenant:** fix tenant provider import path ([55805b8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/55805b881d8b06be44a76da4cfcf6a699d54d54f))
* **policies:** fix redaction middleware import path ([c9e3e19](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c9e3e1912f701320c237b5576d95bc202982f703))
* **postgres-rls:** fix generated helper import path ([c082971](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c082971679a3509534e5db670da9813396299650))
* **pro-cli:** close code fence before environment note ([3fdca0b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3fdca0b9b16636dec688009ecd0e91a13a206434))
* refresh llms.txt index ([4e17097](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4e170970c1a0164b2f2b117259a032395630c69f))

## [1.30.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.30.1...v1.30.2) (2025-10-24)

### 🐛 Bug Fixes

* **dependencies:** update remaining deps ([291c4ed](https://github.com/omar-dulaimi/prisma-zod-generator/commit/291c4edd7ec58ed5dacd9995e17fe4c5c4759b46))

## [1.30.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.30.0...v1.30.1) (2025-10-24)

### 🐛 Bug Fixes

* **dependencies:** update Prisma packages to version 6.18.0 and semantic-release/github to version 12.0.0 ([22a7994](https://github.com/omar-dulaimi/prisma-zod-generator/commit/22a79949967a772681d8dd175068842908cb3eaa))

## [1.30.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.29.2...v1.30.0) (2025-10-24)

### 🚀 Features

* **decimal:** add full Decimal.js support with zod-prisma-types compatibility ([2506cd1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2506cd12178727363a62f09cd256dad89d9be72f)), closes [#307](https://github.com/omar-dulaimi/prisma-zod-generator/issues/307)

### 🐛 Bug Fixes

* correct case handling for string and decimal modes in PrismaTypeMapper ([2ef3a7d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2ef3a7d709665c0c8906421ee48410cdf6843a94))
* **decimal:** add conditional Prisma import for variant schemas with Decimal support ([3e6806a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3e6806a36441f4bc6d1023ab778228232ad099fa))
* **decimal:** enhance toFixed method for Zod v3/v4 compatibility and improve DECIMAL_STRING_REGEX for better validation ([cf0240d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cf0240d6700958a5dcf4067a5275b929faeefe2a))
* **decimal:** improve DECIMAL_STRING_REGEX and validation checks for decimal inputs ([d3bc22a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d3bc22ad76788f0ab26fdc83d35f15dc7f4d134a))
* **decimal:** update decimal input schema generation to conditionally check for Decimal.js availability ([5d81c5c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5d81c5c31ccd41ac9a0e007d1474222910f99861))
* **decimal:** update toFixed method for Zod v3/v4 compatibility ([1e8b2d6](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1e8b2d6901e2673ce857fbfcf831c3bc8976562f))

## [1.29.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.29.1...v1.29.2) (2025-10-23)

### 🐛 Bug Fixes

* **prismaTypeMapper:** ensure to resolve custom enum naming patterns properly ([8230b40](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8230b40cf77b7614383aa72c4baad00ff013859c))

### 📚 Documentation

* add docker setup for easy testing ([a6c4f4e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a6c4f4e372eced3f48286ea9d2697097f273ade4))

## [1.29.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.29.0...v1.29.1) (2025-10-20)

### 🐛 Bug Fixes

* **transformer:** compose dot-chain annotations with base ([7391204](https://github.com/omar-dulaimi/prisma-zod-generator/commit/73912046f9b909d82ed0d27b81a9631eafb2d40e))
* **transformer:** compose enum/reference bases with [@zod](https://github.com/zod) chains ([a71db24](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a71db2490264f46ed447d30df9c696fe9bccdb79))
* **zod-comments:** apply array validations on list fields; remove cuid/uuid inline defaults ([c4118c6](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c4118c6988c8912589f4b3f3ad19a33b6a2b64f4))

### 📚 Documentation

* **pipeline:** escape comparison operators in tables for MDX ([cfa4967](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cfa4967623c733646b0a533fa408df48a13c6e5c)), closes [#303](https://github.com/omar-dulaimi/prisma-zod-generator/issues/303)
* **website:** remove changelog auto-sync and link to GitHub ([9b821a5](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9b821a5b6306cb25435d566d48466ac9fe56c22e))

## [1.29.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.28.3...v1.29.0) (2025-10-19)

### 🚀 Features

* **zod-comments:** add comprehensive Zod v3/v4 validation methods support ([c98340f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c98340fa01274b0eed6ab6f8487da730dbae58ee))

### 🐛 Bug Fixes

* **scripts:** make llms.txt generator resilient to MDX parse errors ([940ad3d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/940ad3d5a4e794925c9ddf6d5bab70fd4bd9eba4)), closes [#303](https://github.com/omar-dulaimi/prisma-zod-generator/issues/303)
* **zod-comments:** preserve brand<T> generic args across parsing and emission ([5f8d849](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5f8d849e4bb694bc1face05642098542d6006363)), closes [#303](https://github.com/omar-dulaimi/prisma-zod-generator/issues/303)
* **zod-comments:** treat brand() as no-parameter method ([2ea2623](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2ea26233620aefd842ef91ef5f0f84abd662d58a)), closes [#303](https://github.com/omar-dulaimi/prisma-zod-generator/issues/303)

### 📚 Documentation

* **zod-comments:** add blank lines around tables to satisfy MD058 ([cdc0697](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cdc0697a98535d3dfa302caa722587f17d0bc431)), closes [#303](https://github.com/omar-dulaimi/prisma-zod-generator/issues/303)

## [1.28.3](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.28.2...v1.28.3) (2025-10-14)

### 🐛 Bug Fixes

* **where-unique:** make cross-field refine optional; add opt-in at-least-one selector ([a6e6674](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a6e6674002afcab045ca5f849d5a87b6a494b506)), closes [#285](https://github.com/omar-dulaimi/prisma-zod-generator/issues/285)

## [1.28.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.28.1...v1.28.2) (2025-10-14)

### 🐛 Bug Fixes

* **parsers:** do not quote arrow/function params in [@zod](https://github.com/zod) ([8fac95a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8fac95acdd5ede12f5ee45e7933e7ce8c43f8633)), closes [#292](https://github.com/omar-dulaimi/prisma-zod-generator/issues/292)

## [1.28.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.28.0...v1.28.1) (2025-10-14)

### 🐛 Bug Fixes

* **transformer:** disable AndReturn operations on unsupported providers ([1dfb587](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1dfb5870a937b6f0b603b5da1f3592c508ed1078)), closes [#286](https://github.com/omar-dulaimi/prisma-zod-generator/issues/286)

## [1.28.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.27.7...v1.28.0) (2025-10-13)

### 🚀 Features

* **scripts:** add llms.txt generator and docs links index ([4f077fa](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4f077fa1b3d35a626f09adb51a9d0e68d8a7964f))

### 🐛 Bug Fixes

* **scripts:** derive ROOT from import.meta.url for ESM (tsx) ([4fa69fb](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4fa69fb6e28844c350472a54998804ab6e883f76))
* **scripts:** robust README section parsing, content-based lastUpdated, byte-accurate size cap and logging ([d4a6b98](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d4a6b984c6d80efbc7c20e32963445665a8d98ca))

### ♻️ Code Refactoring

* **scripts:** add jsdoc and harden docs link building ([bd37db8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/bd37db815a9f4d6eaf005e4c29147e3d998d5fb1))
* **scripts:** mirror docs sidebar order in llms links ([17b762d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/17b762db49e38fa237ac9320f899397083324239))

### 📚 Documentation

* **readme:** fix list indentation for markdownlint (MD005/MD007) ([bb4d84e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/bb4d84ee491f8a1912719593af1e55112f27f2a1))
* **readme:** reference llms.txt for AI tools ([70c8291](https://github.com/omar-dulaimi/prisma-zod-generator/commit/70c82913e23d1295226cd8d0d1f3bacf7db37d1e))

## [1.27.7](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.27.6...v1.27.7) (2025-10-12)

### 🐛 Bug Fixes

* **transformer:** prevent empty include syntax in generated schemas ([3d1349b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3d1349ba89d0e8dbec431bb46342a520cb51d0b3))

## [1.27.6](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.27.5...v1.27.6) (2025-10-10)

### 🐛 Bug Fixes

* **core:** use Zod v4 getter recursion and keep z.lazy for v3\n\n- Apply getter-based recursion to relation fields and CRUD select/include when targeting zod v4\n- Add explicit getter return type annotations in pure models to avoid TS7023\n- Fix single-file bundling around getters (no stray commas, correct optional chaining)\n- Add tests: single-file-zod-versions, pure-models-zod-v4-recursion\n- Add scripts: test:features:single-file-zod-versions, test:features:pure-models-zod-v4-recursion\n\nCloses [#273](https://github.com/omar-dulaimi/prisma-zod-generator/issues/273) ([bcff391](https://github.com/omar-dulaimi/prisma-zod-generator/commit/bcff39125cb7535a8060b0813bf31847c1bb123c))

## [1.27.5](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.27.4...v1.27.5) (2025-10-10)

### 🐛 Bug Fixes

* **naming:** align pure model relation symbols with exportNamePattern and resolve import paths via filePattern ([93a6f6f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/93a6f6fc5a2ee6df673439a9600faca046ba6c04))

### ♻️ Code Refactoring

* **naming:** centralize export symbol parsing ([eea46a9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/eea46a94d04d743107f8f33e94f65f1430f7a8c8))

### 📚 Documentation

* **agents:** never commit PR body files; use temp paths ([cd3dc49](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cd3dc49c4f8df6e25c9479f9ed3e0c1f31966107))
* **changelog:** add PR body for naming fixes ([fd40ef2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/fd40ef2a575bb3509488c0a27f3dde90d367c3d4))

## [1.27.4](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.27.3...v1.27.4) (2025-10-09)

### 🐛 Bug Fixes

* **transformer:** target client entry file for custom outputs ([6d1ae73](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6d1ae73ae4d9bb26ee7f3f2f95852663f8346d60))
* **tsconfig:** add exclude patterns for specific directories ([4ddcb03](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4ddcb03a9edf1f7bb56e5487efb01c77644f8c9e))

## [1.27.3](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.27.2...v1.27.3) (2025-10-04)

### 🐛 Bug Fixes

* **pure-models:** correct z.infer references with custom naming patterns ([44bd2b2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/44bd2b29261c26d2aafdf8145ac15633a024f956))
* **pure-models:** correct z.infer references with custom naming patterns ([275a181](https://github.com/omar-dulaimi/prisma-zod-generator/commit/275a181e97ecc2e5ada3733d7deeae16d5e02878))
* **variants:** prevent type name conflicts in variant exports ([caddf9d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/caddf9d23b77384ff4e187f586589cda4c60a11d))

## [1.27.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.27.1...v1.27.2) (2025-10-04)

### 🐛 Bug Fixes

* **funding:** add GitHub Sponsors funding field to package.json ([2dbe092](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2dbe09296a30a296716d23eafb3e28924e6af434))

## [1.27.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.27.0...v1.27.1) (2025-10-04)

### 🐛 Bug Fixes

* **build:** include postinstall script in published package ([19fb42a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/19fb42abcd4830f2c79176fc6235ea3e4b8bd3cd))

### 📚 Documentation

* **website:** fix markdown links and update metrics to v1.27.0 ([ce1b65f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/ce1b65fa7beb834dc38ee2a41948e6e9b8325b7e))

## [1.27.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.26.0...v1.27.0) (2025-10-04)

### 🚀 Features

* **config:** add fine-grained strict mode configuration ([63b5946](https://github.com/omar-dulaimi/prisma-zod-generator/commit/63b59469e10006bab3d6962dc05d2ce3e578caf0))

### 🐛 Bug Fixes

* **strict-mode:** correct model-level enabled baseline logic ([9c63335](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9c6333569504bfbeed234754d22f68430cf5f8fe))
* **strict-mode:** resolve multiple critical bugs in strict mode logic ([11b0ea8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/11b0ea869e9eccdb0550f493de7f63700e1ef787))
* **strict-mode:** resolve operation name mapping and enhance resolver compatibility ([abee69a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/abee69afb022fc5d8349680380f85328e64c0411))
* **tests:** remove broken generateImportStatement test cases ([fe09750](https://github.com/omar-dulaimi/prisma-zod-generator/commit/fe09750714fed3889356ac74ba4562c5420b8345))

### ♻️ Code Refactoring

* **strict-mode:** improve return type precision in getGlobalSchemaTypeSetting ([4d9b762](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4d9b7628d7aaf0e2ebe228e37d5e4a925468410c))

### 📚 Documentation

* enlarge README diagrams and update renderer ([de5fda6](https://github.com/omar-dulaimi/prisma-zod-generator/commit/de5fda645d3c0f9952fd0acd34136a1df24998fc))
* explain custom import annotations ([8b15bd5](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8b15bd5467abb9565cb7a910b2bf7853e8c31fd7))

## [1.26.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.25.1...v1.26.0) (2025-10-02)

### 🚀 Features

* **imports:** add custom imports feature for external validators ([fe90cd8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/fe90cd8732fbfd9de349c44d492be09a62a91272))

### 🐛 Bug Fixes

* **constraints:** resolve max constraint deduplication and conflict resolution ([e8a50c1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e8a50c1a90745b51ddff722b267957b359225077))
* **core:** align custom import helpers ([35db237](https://github.com/omar-dulaimi/prisma-zod-generator/commit/35db237dfd18a4f8c51055300732596a625059eb))
* **generators:** emit custom imports via transformer helper ([0b32d9e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0b32d9eb8b041b1103e2970e017a221492f1af75))
* **generators:** emit field custom imports in pure models ([ac99736](https://github.com/omar-dulaimi/prisma-zod-generator/commit/ac99736ef7d945937a0c4db431543aab665c7bb8))
* **generators:** normalize model-level validation chain ([12864e2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/12864e2ec5576c975a51eea356968dd3c3241bfd))
* **generators:** use schema content during import filtering ([138fa81](https://github.com/omar-dulaimi/prisma-zod-generator/commit/138fa81df10d7b5ab32153fbfcc845e4feb26cd5))
* **generators:** use transformer instance for zod import ([0014e1b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0014e1bceaaa052798c05a30cd481c52d87d51d3))
* **imports:** optimize custom import detection for better performance ([72480d0](https://github.com/omar-dulaimi/prisma-zod-generator/commit/72480d023f1e1d6a3728b795f8593dcb0ebf1f7f))
* **parser:** correct TypeScript import type statement parsing ([71a6c53](https://github.com/omar-dulaimi/prisma-zod-generator/commit/71a6c5385740b07760b5d64c55a5de49bfac8099))
* **parsers:** drop type-only custom imports ([d794551](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d79455174df5fa0af5cb0c2fe6f5d2b95bad7977))
* **parsers:** handle complex custom import annotations ([108dee3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/108dee333bed76fa0cf9d5dc118e63f914481a0c))
* **parsers:** improve import parsing robustness ([7b80423](https://github.com/omar-dulaimi/prisma-zod-generator/commit/7b804235cde9d8e0225a03419229f4da8cdc2f94))
* **parsers:** parse combined default and named imports ([2e3a093](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2e3a093e7c46f0d1cb5fc0299fe2b7f81f36e5ec))
* **parsers:** support iso string annotations ([803f968](https://github.com/omar-dulaimi/prisma-zod-generator/commit/803f968ec6778e01907c36f022139516b4e75dae))
* **parsers:** tolerate loose custom import arrays ([7312460](https://github.com/omar-dulaimi/prisma-zod-generator/commit/73124605fbf85fc877840625094fd9dc34c2855d))
* remove debug log ([7a8894e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/7a8894e2733cad8442e1164048d71bb907d5d924))
* **transformer:** escape custom import regex ([401d538](https://github.com/omar-dulaimi/prisma-zod-generator/commit/401d538b6a289b4c2a1cdc1a94f7eb2ca0d8a3a9))
* **transformer:** insert max constraint after any Zod base ([19246b3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/19246b37157ce9848b9faf948b7f5cf6b8497299))
* **transformer:** preserve custom schemas when applying zod annotations ([d9f03be](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d9f03be88888a219223dd33bf748e26704ff8f48))
* **transformer:** prevent double-processing of [@zod](https://github.com/zod) annotations ([f06bf45](https://github.com/omar-dulaimi/prisma-zod-generator/commit/f06bf454c26e66026104bb1f044a429345b569d6))
* **variants:** adjust custom import path rewrites ([df0dd8c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/df0dd8c334d8843da8cfa31f087ccdc634ae6f9d))
* **variants:** filter runtime custom imports ([29e7a41](https://github.com/omar-dulaimi/prisma-zod-generator/commit/29e7a41d5b00382223df0b12cd1d4654ee7f0770))

### ♻️ Code Refactoring

* **types:** improve type safety for custom import methods ([7743c2f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/7743c2ffb7684ad92fae05f7b7571c950e0eb96b))

### 📚 Documentation

* add mermaid rendering workflow ([0c6f737](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0c6f737199557c6a34a2f3f1730976bf47c3dbf1))

## [1.25.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.25.0...v1.25.1) (2025-10-01)

### 🐛 Bug Fixes

* **transformer:** use owning model alias for create many imports ([1fd9973](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1fd9973deeaacc0225d495121a5ed7561f7ef458))

## [1.25.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.24.0...v1.25.0) (2025-09-29)

### 🚀 Features

* **imports:** switch to namespace imports for better tree-shaking ([aa3873c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/aa3873c340aa4035da96ef73220bf2dcb3673b52)), closes [#158](https://github.com/omar-dulaimi/prisma-zod-generator/issues/158)

### 🐛 Bug Fixes

* format code with prettier ([c598173](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c598173779e0c2e6c7683e6b43651d65271064a5))

## [1.24.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.23.2...v1.24.0) (2025-09-29)

### 🚀 Features

* **variants:** add partial flag support for automatic .partial() application ([e5876eb](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e5876ebf12dbac045d0a55d04908c39e117a5e71)), closes [#192](https://github.com/omar-dulaimi/prisma-zod-generator/issues/192) [#192](https://github.com/omar-dulaimi/prisma-zod-generator/issues/192)
* **zod-comments:** add comprehensive JavaScript object literal parser ([3afa975](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3afa9755c7bff21d910dc07923787924073687e0))
* **zod-comments:** support custom json shapes validations ([14dfb06](https://github.com/omar-dulaimi/prisma-zod-generator/commit/14dfb066992c851ae67de527e452495670cabcce))
* **zod-v4:** implement string formats and imports with partial field support ([308e97e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/308e97ebd6c7deff097c48f2ed14a9f051f31da4)), closes [#233](https://github.com/omar-dulaimi/prisma-zod-generator/issues/233)

### 🐛 Bug Fixes

* **ci:** update link-check workflow to use pnpm instead of npm ([7bc1536](https://github.com/omar-dulaimi/prisma-zod-generator/commit/7bc15369f587b46b3e7a73e0388a04c70428cd87))
* **zod-comments:** review notes ([3c5bedb](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3c5bedbd0847a813b43d336035f44d1e96d783a4))
* **zod-comments:** route [@zod](https://github.com/zod).custom payloads through inferZodTypeFromValue ([f840f17](https://github.com/omar-dulaimi/prisma-zod-generator/commit/f840f173c65215c32ece7aafb822cf42baad1144))
* **zod-comments:** support JavaScript object literal syntax in parameters ([2f72870](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2f728709e1c4d9093c0f6c6741b79dd9de59b7be))
* **zod-v4:** preserve caller-supplied parameters in v4 string format methods ([ca28735](https://github.com/omar-dulaimi/prisma-zod-generator/commit/ca28735890adf19e5f50b1333f5c6a3ad72c9b26))

## [1.23.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.23.1...v1.23.2) (2025-09-28)

### 🐛 Bug Fixes

* **ci:** add missing GitHub permissions for semantic-release ([db07eca](https://github.com/omar-dulaimi/prisma-zod-generator/commit/db07eca0f42cc33f98b3ce2d94070c88d97fc78d)), closes [#260](https://github.com/omar-dulaimi/prisma-zod-generator/issues/260) [#233](https://github.com/omar-dulaimi/prisma-zod-generator/issues/233)

## [1.23.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.23.0...v1.23.1) (2025-09-28)

### 🐛 Bug Fixes

* **esm:** add file extension to JSON helpers imports ([50481a2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/50481a27d1c6fff0915888418cc4953cf901bd7d))
* **esm:** add file extension to Prisma client imports in single-file mode ([c0c3a7f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c0c3a7fe38e3af112a8f93beb1e79e807f9a8e4c))
* **esm:** update JSON helpers import regex for single-file mode ([a109656](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a1096560fd9913cd0e508f7c088bf062cab76014))
* **transformer:** use enum schemas instead of enum types for runtime validation ([0faaa02](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0faaa02a0ab05cf40c20840183db04911209adbd))

## [1.23.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.22.2...v1.23.0) (2025-09-28)

### 🚀 Features

* **zod-comments:** add complete Zod v4 string format support ([41ed24b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/41ed24b441f2ef6643f538e164e9038b61be4ecc))
* **zod-comments:** add support for 14 new Zod v4 string format validation methods ([75eb185](https://github.com/omar-dulaimi/prisma-zod-generator/commit/75eb18581c349cca9cc0c47bc2ce71a497f51ebb)), closes [#233](https://github.com/omar-dulaimi/prisma-zod-generator/issues/233)

### 🐛 Bug Fixes

* **parsers:** correct parameter validation for Zod v4 string format methods ([5b2b339](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5b2b339bc9334d21934559d2a7c899e48e46aaa5))
* **release:** correct GitHub assignee format and complete datetime docs ([0de41aa](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0de41aa035c0742909e8db199b18b90df15beae0))
* **zod-comments:** improve parser robustness and error handling ([cd022ae](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cd022ae934e3fa4d9c9634eb75fea7e83428eee5))
* **zod-comments:** preserve parameters in v4 base replacement methods ([cf18276](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cf182769ced06520e5f0c1c9e3c9085caa58dfee))

### ♻️ Code Refactoring

* **zod-comments:** use central logger consistently ([4bb63ef](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4bb63efc0c4e3a83e30ae1e68e16abcebb9ca5a3))

### 📚 Documentation

* **changelog:** correct Zod v4 string format methods list ([2910146](https://github.com/omar-dulaimi/prisma-zod-generator/commit/29101461ed24d97103c8b174d5c045c8a2958680))

## [Unreleased]

### 🚀 Features

* **zod-comments:** add support for 20 new Zod v4 string format validation methods ([#233](https://github.com/omar-dulaimi/prisma-zod-generator/issues/233))
  - Network/URL formats: `@zod.httpUrl()`, `@zod.hostname()`
  - Identifier formats: `@zod.nanoid()`, `@zod.cuid()`, `@zod.cuid2()`, `@zod.ulid()`
  - Encoding formats: `@zod.base64()`, `@zod.base64url()`, `@zod.hex()`
  - Security formats: `@zod.jwt()`, `@zod.hash("algorithm")`
  - Network formats: `@zod.ipv4()`, `@zod.ipv6()`, `@zod.cidrv4()`, `@zod.cidrv6()`
  - Character formats: `@zod.emoji()`
  - ISO date/time formats: `@zod.isoDate()`, `@zod.isoTime()`, `@zod.isoDatetime()`, `@zod.isoDuration()`
  - All methods support Zod v4 base types (e.g., `z.nanoid()`, `z.iso.date()`) with v3 fallback compatibility
  - Existing methods like `@zod.email()`, `@zod.url()`, `@zod.uuid()` maintain compatibility

### 📚 Documentation

* **zod-comments:** add comprehensive documentation for new string format methods with examples and compatibility matrix

## [1.22.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.22.1...v1.22.2) (2025-09-28)

### 🐛 Bug Fixes

* **esm:** add .js extension support for Prisma client imports ([d8ce5af](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d8ce5af8529883053ffa1851032b43d91f7bfd4f))

### 📚 Documentation

* **changelog:** fix changelog issue affecting docs site ([d59c791](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d59c7919bd870b8c5710c855a08e042cdb04608a))
* **readme:** enhance core features with visual Mermaid diagrams ([bd715b4](https://github.com/omar-dulaimi/prisma-zod-generator/commit/bd715b40621f03defa64476b152d54e9db366f30))
* **readme:** enhance feature badge visibility ([387e64e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/387e64e7eb33e22205b8200749a5e064fdbd0274))

## [1.22.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.22.0...v1.22.1) (2025-09-27)

### 🐛 Bug Fixes

* **naming:** fix remaining bugs ([62ef64f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/62ef64fc28897f9d31383c21447e55a800561c29))

### 📚 Documentation

* **naming:** add notes about operation token requirement for CRUD schemas ([4b16664](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4b1666459cc3d8535e3be71977c5f6e1be83a9bf))
* **naming:** add notes about input naming ([67a5c05](https://github.com/omar-dulaimi/prisma-zod-generator/commit/67a5c052efcf1307ecf1de768f53166fd6513f53))
* **readme:** add comprehensive Core Features table ([4444c59](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4444c59f0e4a8e923e76fb7231d0db28ebbbe8b4))

## [1.22.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.21.4...v1.22.0) (2025-09-26)

### 🚀 Features

* **naming:** add custom naming patterns for schemas, inputs, and enums ([fe9f3df](https://github.com/omar-dulaimi/prisma-zod-generator/commit/fe9f3dfefad8acb4444c0b7fe147204a3ba121c2))
* **naming:** dedupe file names when patterns include model+InputType; extend export dedupe and document behavior ([53fc283](https://github.com/omar-dulaimi/prisma-zod-generator/commit/53fc283f8a327bf611df1966276f65d45bf476ee))

### 🐛 Bug Fixes

* **import:** enhance parseImportStatement to handle alias and type imports ([260cf18](https://github.com/omar-dulaimi/prisma-zod-generator/commit/260cf182a7b3b8919319ec1885a85318684fd6db))
* **import:** resolve import/export name mismatch causing compilation failures ([d3c321d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d3c321dc3ceb956eedea9c9aa7a66c6819136bce))
* **naming-resolver:** use applyUniversalPattern to avoid regex quirks with brace tokens ([2607486](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2607486231447117266ee8a216478138c97d4181))
* **naming:** avoid redundant aliasing in enum imports ([66b67ab](https://github.com/omar-dulaimi/prisma-zod-generator/commit/66b67ab28a22a4ecabb999ae0a983f0351f53963))
* **naming:** honor custom schema patterns in import generation ([6ab60a6](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6ab60a66ce64e46cdb6e55e5228a81c093999323))
* **naming:** normalize Operation to PascalCase in schema filenames and imports ([b0e34f3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b0e34f34907813699a5f472c4b5a507818f6aa46))
* **naming:** replace Unknown fallback with inputType to prevent filename collisions ([2eef15e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2eef15e08ee038458279d78478ea7755d4917607))
* **naming:** resolve duplicate model prefixes and operation casing in custom naming patterns ([9b029ae](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9b029aed26ce095ea0cac450970eeab4d59ecf45))
* **naming:** synchronize import paths with custom schema patterns and prevent file collisions ([196d949](https://github.com/omar-dulaimi/prisma-zod-generator/commit/196d949909fb2bc3f7fbd1e205c91207a1ccbd79))
* **naming:** wire enum and input imports through naming resolvers ([384ebb4](https://github.com/omar-dulaimi/prisma-zod-generator/commit/384ebb489af3e57a662ef5a0c19e1aa0d707054b))
* **prisma-generator:** escape dynamic import extension in dedupe regex to ensure deterministic matching ([cb814e8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cb814e8443d249fc00209412bbd1195a6b89e4af))
* **prisma-generator:** include normalized enum names in registry to match normalized schema exports ([5ee7d8c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5ee7d8c0e7dbda7d36f55b4bf847ec0657bd785b))
* **schema:** unify CRUD export naming to honor custom exportNamePattern consistently ([d87eeb6](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d87eeb6b83ee6aedad6eb58aab5c294f7d1dac2c))
* **transformer): use enum/input resolvers and ESM extensions for imports; refactor(utils): rename namingResolver.ts to naming-resolver.ts; fix(generators): append configured extensions to imports; fix(variants): include extension in fallback and regex; fix(prisma-generator): add extension to enum imports and dedupe; fix(results:** include extension in results index exports ([49492d9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/49492d95bee3f2ec1355d0e63a1a5325b5483cd0))
* **transformer:** bind Prisma types from intrinsic input name, not customized export name ([b67c361](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b67c36172b359f4a09758a99467c352665d2c09d))
* **transformer:** correct enum import base path for CRUD schema files (./enums vs ../enums); ensure path resolves in test:basic ([1a14617](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1a146178376f84f3a42921688240e935f024d120))
* **transformer:** route CRUD/Aggregate/GroupBy writes through canonical writer with collision guard; update tests to schemas path ([04925eb](https://github.com/omar-dulaimi/prisma-zod-generator/commit/04925eb90e018e3d9f045e0b15cfe653b6a797b3))
* **transformer:** switch to logger.warn, make input import helper base-aware, avoid brittle path replace for results deps, and prevent double index addition ([cc48360](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cc48360dc7570e9af9cb3587d3232be65561ae7c))
* **utils:** normalize constructed enum import paths with posix.join in generated import lines ([06cea0d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/06cea0d6d26db2b979b818aa62fa4df2a75ea20c))
* **utils:** normalize enum import paths with posix join and use brace-safe universal pattern applier ([491e5c7](https://github.com/omar-dulaimi/prisma-zod-generator/commit/491e5c7126067f5dc9d323eaeaa89e68b9d3d658))
* **variants:** use enum constant (VariantType.PURE) instead of string literal for variant check ([73ec877](https://github.com/omar-dulaimi/prisma-zod-generator/commit/73ec8774e1345ee790d2ed87fd88cba70c7474fb))
* **variants:** use pattern-aware enum imports in variant files and honor ESM file extensions ([a9df6de](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a9df6de20527db67039a90c9229e8b2dd96d0548))

### ♻️ Code Refactoring

* **naming:** rename enumImport.ts to enum-import.ts and improve naming consistency ([2e956ad](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2e956ad74225313fa9fb0db8a043983186997bad))

### 📚 Documentation

* **naming:** clarify duplicate prefix stripping applies only to export names ([dcd886f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/dcd886f6d215255f82dc6a52400d5b16cd3fd62a))
* **naming:** complete naming patterns documentation and add missing kebab token ([6b23a03](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6b23a037e0f06fe285141f64f7fcba8fa4db641e))

## [1.21.4](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.21.3...v1.21.4) (2025-09-25)

### 🐛 Bug Fixes

* **variants:** prevent double array wrapping for scalar array fields ([5b1eb67](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5b1eb6728cfdfd2ac6d7687c331c31da343e5377))

## [1.21.3](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.21.2...v1.21.3) (2025-09-21)

### 🐛 Bug Fixes

* **generator:** include unused enums in schema generation ([cde6d5e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cde6d5eda71b6680ac7ef0e719024024a0ca4630)), closes [#247](https://github.com/omar-dulaimi/prisma-zod-generator/issues/247)

### ♻️ Code Refactoring

* address CodeRabbit review feedback ([3468ffe](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3468ffe81a3f4d59865fe6c38f992d84d56828cd))

## [1.21.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.21.1...v1.21.2) (2025-09-20)

### 🐛 Bug Fixes

* **ci:** remove auto-docs-version step from semantic-release workflow ([380a9d0](https://github.com/omar-dulaimi/prisma-zod-generator/commit/380a9d0b1bd24f57bce184df9c3eed6fbb1e77b3))

### 📚 Documentation

* remove Docusaurus versioning system ([3277384](https://github.com/omar-dulaimi/prisma-zod-generator/commit/327738414a3f47e84eb7fb05d71f1c62d053622c))

## [1.21.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.21.0...v1.21.1) (2025-09-19)

### 🐛 Bug Fixes

* **models:** correct enum import paths from models/ to enums/ ([d6a41a3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d6a41a33419d79b6e54c2f921a4aadb37cf299ef))
* **variants:** add missing .array() wrapper for enum arrays in variant schemas ([674133e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/674133e594040da8c893ca890a3189ec78a2b76b)), closes [#245](https://github.com/omar-dulaimi/prisma-zod-generator/issues/245)

### 📚 Documentation

* fix MDX compilation errors and broken links in documentation ([596e5d1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/596e5d1c029fccb7cfbb09cad7c83509d9e49ece))

## [1.21.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.20.4...v1.21.0) (2025-09-18)

### 🚀 Features

* **generator:** add JSON Schema compatibility mode ([ada87fc](https://github.com/omar-dulaimi/prisma-zod-generator/commit/ada87fc99f8626213805d5157d31256d1d7c5277)), closes [#236](https://github.com/omar-dulaimi/prisma-zod-generator/issues/236)
* **json-schema:** enhance validation patterns and add type safety ([e7fbb62](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e7fbb62be35e669a3dce4fe58fe955a07b0f244e))

### 🐛 Bug Fixes

* **config:** address CodeRabbitAI review feedback ([258ee75](https://github.com/omar-dulaimi/prisma-zod-generator/commit/258ee750491bb6ca1d53e9b6cc35652ec69d589b))
* **pure-models:** restore optionalFieldBehavior respect and enhance zod comments ([057eb25](https://github.com/omar-dulaimi/prisma-zod-generator/commit/057eb2543ad908f80ef9014f0baef11f2d8ed452))
* **pure-models:** standardize file organization and improve import deduplication ([880ae6c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/880ae6c62c0ac3e4ee275cc6c26019acc2cb209f))
* **scripts:** correct test coverage command file extension ([bd109ce](https://github.com/omar-dulaimi/prisma-zod-generator/commit/bd109ce6d751f048abcd88a7661bbc238b5082cc))

### 📚 Documentation

* **config:** add JSON Schema compatibility documentation ([d2b3c96](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d2b3c96202cc1cecc204eeeae0fd40bbcec2ebc1))

## [1.20.4](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.20.3...v1.20.4) (2025-09-18)

### 🐛 Bug Fixes

*  align variant export manager with ESM index extension handling ([33f6d22](https://github.com/omar-dulaimi/prisma-zod-generator/commit/33f6d228b11ae9720b812173db59e590b93b376a))
* **generator:** support ESM .js extensions in index files with useMultipleFiles ([7109157](https://github.com/omar-dulaimi/prisma-zod-generator/commit/71091577ac7d784a721b6a4b656a1b2bfefac2a6)), closes [#234](https://github.com/omar-dulaimi/prisma-zod-generator/issues/234)
* resolve circular dependency issues in variants generator ([530cc22](https://github.com/omar-dulaimi/prisma-zod-generator/commit/530cc22a6114bef1248e144d4e8d898076b43df1))
* **variants:** correct ESM import paths for directory-based variant exports ([0a7e529](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0a7e529607093582e2e06698c4b915663e499302))

## [1.20.3](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.20.2...v1.20.3) (2025-09-16)

### 🐛 Bug Fixes

* **generator:** support [@zod](https://github.com/zod).nullable() on array fields ([1754016](https://github.com/omar-dulaimi/prisma-zod-generator/commit/17540164ee4d42bbc1a13af2de0112d84918c19e)), closes [#235](https://github.com/omar-dulaimi/prisma-zod-generator/issues/235)

## [1.20.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.20.1...v1.20.2) (2025-09-12)

### 🐛 Bug Fixes

* **variants:** do not treat relations as enums; add field-aware base types for [@zod](https://github.com/zod) integration and ensure variant enum imports use `<Enum>Schema` ([a236939](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a23693949cdbccdb78ab3beaef1033305197f5f9))
* **whereUnique:** handle composite unique selectors nested under key names; superRefine now validates completeness inside nested objects and accepts composite PK/unique ([8ea437c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8ea437c46bc907c63b8376ab3b93752780e17e3c))

## [1.20.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.20.0...v1.20.1) (2025-09-12)

### 🐛 Bug Fixes

* enable constraint resolution for Zod v4 email syntax ([3ea22ca](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3ea22ca836873139a02c7c4030ce4275c4e9421b)), closes [#227](https://github.com/omar-dulaimi/prisma-zod-generator/issues/227)
* improve Zod annotation detection for optional/nullable/nullish calls ([2f56c47](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2f56c471da84e22d06ae106affc76d681da89fb2))
* resolve [@zod](https://github.com/zod) comment annotation parsing issues ([38c9186](https://github.com/omar-dulaimi/prisma-zod-generator/commit/38c91869ee829f0fc9a20b2a6c342ae114839aa4)), closes [#227](https://github.com/omar-dulaimi/prisma-zod-generator/issues/227) [#227](https://github.com/omar-dulaimi/prisma-zod-generator/issues/227)
* resolve ESLint errors for Issue [#227](https://github.com/omar-dulaimi/prisma-zod-generator/issues/227) implementation ([8391aef](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8391aefdbf50d8992a07b8afb783a9fa957df9b5))

### ⚡ Performance Improvements

* optimize parallel test workers for low-end hardware ([db5b257](https://github.com/omar-dulaimi/prisma-zod-generator/commit/db5b25727a49f276fa2045e6fdcf1721ed0656e6))

## [1.20.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.19.1...v1.20.0) (2025-09-11)

### 🚀 Features

* enhance [@zod](https://github.com/zod).json() and [@zod](https://github.com/zod).enum() support with comprehensive tests ([835f9da](https://github.com/omar-dulaimi/prisma-zod-generator/commit/835f9da026b02337f4cf8f749a3e10dfeecc89ff)), closes [#228](https://github.com/omar-dulaimi/prisma-zod-generator/issues/228)

### 🐛 Bug Fixes

* add support for [@zod](https://github.com/zod).json() and [@zod](https://github.com/zod).enum() annotations with Zod v4 compatibility ([e3172f9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e3172f941f60ee71d7888d1088d54a5f56c37128))
* resolve unused variable linting error ([7a80136](https://github.com/omar-dulaimi/prisma-zod-generator/commit/7a8013643848357cffc73eb677092d42d08381eb))

## [1.19.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.19.0...v1.19.1) (2025-09-11)

### 🐛 Bug Fixes

* resolve snake_case aggregate input naming and add comprehensive tests ([b14380a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b14380a1ac4de60554829ca5df299569224fbc45))

## [1.19.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.18.8...v1.19.0) (2025-09-10)

### ⚠ BREAKING CHANGES

* **schema:** Enum and aggregate schema names may change for models with snake_case naming, requiring updates to dependent code.

### 🚀 Features

* complete dual export consistency for all analytics operations ([3456f72](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3456f725ffe5747131993ce1533672a435667aab))

### 🐛 Bug Fixes

* address critical CodeRabbit review issues ([c39eebc](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c39eebc20d15fcfc330d580075d8b52648d4fbcb))
* conditionally include avg/sum aggregates only for numeric fields ([a4d137c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a4d137c9424c4d533dc1cbdc27913977e8ee3865))
* correct getPrismaTypeName to use original model names ([7c44948](https://github.com/omar-dulaimi/prisma-zod-generator/commit/7c449484d88924d0a301550317a855446223b7e5))
* handle Prisma aggregate type naming for snake_case models ([78ee433](https://github.com/omar-dulaimi/prisma-zod-generator/commit/78ee433013979f3516e11dbef63019eb6f668cdc))
* only apply enum import aliasing when names differ ([40dd0f8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/40dd0f87e18f837f0104981ce3acc3a4cc0814ce))
* remove empty objects from select schema generation ([3c8ecbc](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3c8ecbcc1a172453f18382eff27093dd1d53ca77))
* resolve enum import/export mismatch for normalized names ([cd82993](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cd829932c1cd57cebac3ebfe2352d503756486e1))
* resolve import/export naming inconsistencies in generated schemas ([8148da6](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8148da6009f1abd89e27a1982c9089bfe5078c73))
* **schema:** resolve naming inconsistencies in generated schemas ([9ad6988](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9ad69882099c8c834cd7ff3cacae03225e87d162))
* use correct Prisma type names for snake_case models ([facc067](https://github.com/omar-dulaimi/prisma-zod-generator/commit/facc0677e4922aa5372a64efac452dce594719eb))
* use String type for MongoDB id fields with [@db](https://github.com/db).ObjectId ([af016f8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/af016f83c4352f88af11b592b99063f6dbf91dd4))

## [1.18.8](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.18.7...v1.18.8) (2025-09-08)

### 🐛 Bug Fixes

* **single-file-mode:** remove duplicated schema declarations ([cdb65b4](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cdb65b4081fb9be22b16cdda4429155f9448ca80))

## [1.18.7](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.18.6...v1.18.7) (2025-09-08)

### 🐛 Bug Fixes

* **ci:** update pnpm version to 10.15.1 in docs and ci workflows ([de2326d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/de2326d5199b34d8c7eeef2467c9065d40dc8133))

## [1.18.6](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.18.5...v1.18.6) (2025-09-08)

### 🐛 Bug Fixes

* **ci:** update pnpm version to 10.15.1 to resolve lockfile mismatch ([6593409](https://github.com/omar-dulaimi/prisma-zod-generator/commit/65934090a282c63c9c27160f3189a8ffdff5358a))
* convert npm resolutions to pnpm overrides format ([02e6d13](https://github.com/omar-dulaimi/prisma-zod-generator/commit/02e6d135e3422a3483595a6648ffd1e758ec982d))
* remove pnpm caching from setup-node before pnpm installation ([f3974c7](https://github.com/omar-dulaimi/prisma-zod-generator/commit/f3974c7b08f12e00a0190e891958824e05ba2133))

## [1.18.5](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.18.4...v1.18.5) (2025-09-03)

### 🐛 Bug Fixes

* improve type inference for recursive schemas with AND/OR/NOT operations ([2c360ef](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2c360efaac604392211bb6330b98c222eb11e020))

## [1.18.4](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.18.3...v1.18.4) (2025-09-03)

### 🐛 Bug Fixes

* improve type inference for self-referential schemas ([be14309](https://github.com/omar-dulaimi/prisma-zod-generator/commit/be1430958b99cd64f6280250878b911a7acc34c1)), closes [#214](https://github.com/omar-dulaimi/prisma-zod-generator/issues/214)

## [1.18.3](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.18.2...v1.18.3) (2025-09-03)

### 🐛 Bug Fixes

* fix failing schema validation tests ([d319ac4](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d319ac48fc5daaa903389b8033efd8e6707e2243))
* Improve optional/nullable field handling in schema generation and update tests ([3b00458](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3b004580c6949ef7d477b8379d369a265c76d2e6))

## [1.18.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.18.1...v1.18.2) (2025-09-03)

### 🐛 Bug Fixes

* resolve TypeScript errors in generated schemas ([b7af26a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b7af26a0f5340a3020fea29866cb06b69dd57bb7))

### 📚 Documentation

* **config:** document optional vs nullable policy for object input schemas (non-relation optional nullable; relations optional-only) ([82bdfc1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/82bdfc143ccb09461c06439e137ad4be78a26b29))

## [1.18.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.18.0...v1.18.1) (2025-09-02)

### 🐛 Bug Fixes

* **objects:** add .nullable() to optional non-relation fields and keep relation args optional-only ([ce9695c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/ce9695c8cbdca1268b57191deaed04534a9fb668))

### 📚 Documentation

* **versioned:** add json-friendly-datetime recipe for v1.17.4 to satisfy sidebar ([0222f84](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0222f8484678524943247b8bf41facdd93071997))

## [1.18.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.17.10...v1.18.0) (2025-09-02)

### 🚀 Features

* **generator:** DateTime split default for inputs and Prisma-parity WhereUniqueInput semantics ([d31c823](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d31c82316d944270f0cdb09067e2dbd46659b821))

## [1.17.10](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.17.9...v1.17.10) (2025-09-02)

### 🐛 Bug Fixes

* add missing exports for aggregate and groupBy schemas in index.ts ([7b980d2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/7b980d294cbb15c1d9325bc874cc9cc893938ff7))

## [1.17.9](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.17.8...v1.17.9) (2025-08-31)

### 🐛 Bug Fixes

* add missing types for enums ([431227d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/431227de5c779f0874d5df6afe0228627deec8a8))

## [1.17.8](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.17.7...v1.17.8) (2025-08-30)

### 🐛 Bug Fixes

* correct manifest tracking for single file mode ([decbfcd](https://github.com/omar-dulaimi/prisma-zod-generator/commit/decbfcd47de4339abef47fbd5ef60f551bb06948))

## [1.17.7](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.17.6...v1.17.7) (2025-08-30)

### 🐛 Bug Fixes

* remove incorrect /schemas path segment in variant enum imports ([62cd853](https://github.com/omar-dulaimi/prisma-zod-generator/commit/62cd853bad1221d5146f848ce9256892f96f55d0)), closes [#208](https://github.com/omar-dulaimi/prisma-zod-generator/issues/208)

## [1.17.6](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.17.5...v1.17.6) (2025-08-30)

### 🐛 Bug Fixes

* add missing Prisma type import detection for ZodType generics in single-file mode ([1e384f9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1e384f9d802ee7a63098f93c32f9d1efef496559)), closes [#207](https://github.com/omar-dulaimi/prisma-zod-generator/issues/207)

## [1.17.5](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.17.4...v1.17.5) (2025-08-30)

### 🐛 Bug Fixes

* resolve enum import path inconsistencies across generation contexts ([b46990a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b46990a52b6450dafd4de050ebe6d7afd771ecfd))

### 📚 Documentation

* add dual-exports page links to all versioned sidebars ([355c03d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/355c03d4814c4b263859f8d689a80dfb9d83ef08))

## [1.17.4](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.17.3...v1.17.4) (2025-08-29)

### 🐛 Bug Fixes

* use npx for docusaurus commands in website scripts ([d4740ee](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d4740ee6a64629c0488214bade926f61cb6f266a))

## [1.17.3](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.17.2...v1.17.3) (2025-08-29)

### 🐛 Bug Fixes

* add comprehensive enum import path validation for issue [#204](https://github.com/omar-dulaimi/prisma-zod-generator/issues/204) ([b3536d1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b3536d189299f72b65ba0ca1cc8929aaa42f655c))

## [1.17.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.17.1...v1.17.2) (2025-08-29)

### 🐛 Bug Fixes

* resolve duplicate identifiers and improve enum usage ([#205](https://github.com/omar-dulaimi/prisma-zod-generator/issues/205)) ([5437309](https://github.com/omar-dulaimi/prisma-zod-generator/commit/543730998a8ff5a15f693d80fef1d5eeb6344a5b))

### 📚 Documentation

* add dateTimeStrategy configuration documentation ([617988b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/617988b755e2158c4c71f967140d95400f14d111))
* add dual-exports configuration to sidebar ([230ea46](https://github.com/omar-dulaimi/prisma-zod-generator/commit/230ea4648723e2807212173a1d1a4d2d2aca1cfa))
* optimize workflow by splitting dependencies ([9723238](https://github.com/omar-dulaimi/prisma-zod-generator/commit/97232383d27c2544e0c627ba70a4e2416787b6db))

## [1.17.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.17.0...v1.17.1) (2025-08-26)

### 🐛 Bug Fixes

* **config:** improve validation and error handling for config file paths ([7eeaebf](https://github.com/omar-dulaimi/prisma-zod-generator/commit/7eeaebf3b0d839d39a2aeb64c107dd7bfff3bf8f))

### 📚 Documentation

* document config file path resolution behavior ([ff3b4de](https://github.com/omar-dulaimi/prisma-zod-generator/commit/ff3b4de1701844a1b8b7196024d2cecab31c25da))

## [1.17.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.16.6...v1.17.0) (2025-08-26)

### 🚀 Features

* add manifest tracking methods to transformer ([68f62f3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/68f62f32cd9cb38f2b77b5db573ac51310ea060d))
* add safety configuration resolver with precedence handling ([0cce3e9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0cce3e97209e5368f1c5aa469afae5920992c72a))
* add safety system type definitions and interfaces ([972a272](https://github.com/omar-dulaimi/prisma-zod-generator/commit/972a272f6c58d24875f3679696949c1900102950)), closes [#71](https://github.com/omar-dulaimi/prisma-zod-generator/issues/71)
* extend configuration parser with safety options support ([38b3474](https://github.com/omar-dulaimi/prisma-zod-generator/commit/38b3474fc99d96cc55b02025d748277e6cc1e40f))
* implement configurable safety system with manifest tracking ([d8e449b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d8e449be7ff334455ce7cd39c77a90bd2c06968e)), closes [#71](https://github.com/omar-dulaimi/prisma-zod-generator/issues/71)
* integrate configurable safety system into main generator ([9944137](https://github.com/omar-dulaimi/prisma-zod-generator/commit/994413744e13028720eec371f0998681b3cc93f4))

### 🐛 Bug Fixes

* resolve TypeScript type errors and linting issues ([65dbc9a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/65dbc9a7b8db38bb3b42dc4a676031c6e0b91ff2))

### ♻️ Code Refactoring

* update file writing utilities for safety system integration ([b38ec5f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b38ec5f229f83ca57347362cb36d1ddcf02bfda6))

### 📚 Documentation

* add comprehensive safety system reference documentation ([a509b21](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a509b21694fa90b132c6a29a8c7c4e4f69334ba3))
* add safety system configuration recipe guides ([46bc94f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/46bc94ff38875d4f3ca93b409e03e3038859d097))
* integrate safety system documentation into website navigation ([3968f5f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3968f5f2514841e7ea8098db1778157ff8be097f))

## [1.16.6](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.16.5...v1.16.6) (2025-08-25)

### 🐛 Bug Fixes

* replace console.log with logger.debug for debug output ([3f75076](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3f75076f5ffce3b0403d43323e3c7223393ec31f))

## [1.16.5](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.16.4...v1.16.5) (2025-08-25)

### 🐛 Bug Fixes

* implement factory pattern for recursive Zod schemas ([bbe8e54](https://github.com/omar-dulaimi/prisma-zod-generator/commit/bbe8e5432e588eab18f3f5151a18f92c5b091798))
* improve [@zod](https://github.com/zod).custom.use parsing and enum import handling ([48b3c44](https://github.com/omar-dulaimi/prisma-zod-generator/commit/48b3c44532b355d715444dd0f98db54816b2a8ad))
* improve json helper import path resolution (Issue [#196](https://github.com/omar-dulaimi/prisma-zod-generator/issues/196)) ([6c2290d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6c2290d4ac559a3401bad1ac5da27ef81bf47716))
* prevent missing variants directory import errors ([52eb025](https://github.com/omar-dulaimi/prisma-zod-generator/commit/52eb0256a565fa88fc8609eb5ccc43cc7797cd22))
* **variants:** import enum schemas in array-based custom variants and use *Schema refs (Issue [#193](https://github.com/omar-dulaimi/prisma-zod-generator/issues/193))\n\n- Switch custom variants to import from generated enums instead of @prisma/client\n- Use EnumNameSchema in field definitions\n- Update test to expect schema imports and references\n\nAlso validates [@zod](https://github.com/zod).custom.use chaining remains intact (Issue [#194](https://github.com/omar-dulaimi/prisma-zod-generator/issues/194) tests stay green). ([d3b57d4](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d3b57d481a22fec04e0d3c391d407000572da744))

## [1.16.4](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.16.3...v1.16.4) (2025-08-24)

### 🐛 Bug Fixes

* remove satisfies annotations from recursive Zod schemas ([ab51b0f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/ab51b0f04b82cea7aaf4c95c4a9a0eb8e55511a9))

### ♻️ Code Refactoring

* clean up unused code in generateZodOnlySanityCheck ([392056f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/392056f5865daa9d98fc8f9de439bb5f796cfa84))

## [1.16.3](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.16.2...v1.16.3) (2025-08-24)

### ⚠ BREAKING CHANGES

* **config:** respect exportTypedSchemas/exportZodSchemas from JSON config with proper precedence

### 🐛 Bug Fixes

* **config:** respect exportTypedSchemas/exportZodSchemas from JSON config with proper precedence ([4a3f582](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4a3f5820917f96a0d70ffad03ad29cec97819a84))
* **minimal,zod:** allow minimal mode without explicit model config; adjust [@zod](https://github.com/zod) string quoting (URLs double-quoted, others single-quoted); ensure output path precedence respects schema dir ([31072c8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/31072c8ad8dbad24fe3bdbde26b9701716d27ea1))
* **zod:** avoid TS7022 for self-referential object schemas by using factory + z.lazy(makeSchema); emit optional sanity-check types; skip Prisma imports for zod-only ([6245b74](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6245b74e49463baae25fbad28f7c895e917897cc))

## [1.16.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.16.1...v1.16.2) (2025-08-23)

### 🐛 Bug Fixes

* resolve [@zod](https://github.com/zod) annotations not working without config file (issue [#189](https://github.com/omar-dulaimi/prisma-zod-generator/issues/189)) ([3198737](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3198737c6189af7292e73c186ab01f0940f87243))

## [1.16.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.16.0...v1.16.1) (2025-08-23)

### 🐛 Bug Fixes

* **transformer:** avoid applying field validations to aggregate input schemas and fix optional() placement for enhanced zod chains ([a84d222](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a84d222138912757757e095e35ea487b1bde3f28))
* **transformer:** correct optional() placement and skip validations on aggregate inputs ([097be4d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/097be4d50b391357d9ab700d0cc99fbfe1039dfe))

## [1.16.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.15.0...v1.16.0) (2025-08-22)

### ⚠ BREAKING CHANGES

* **minimal:** suppress object and CRUD schema generation in minimal mode with clear logs

### 🚀 Features

* **minimal:** suppress object and CRUD schema generation in minimal mode with clear logs ([78e6fe3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/78e6fe34cf6efe4dac5a4e36b6721ffad6854d26))

### 🐛 Bug Fixes

* **config:** improve Zod version detection for datetime validation ([81893d5](https://github.com/omar-dulaimi/prisma-zod-generator/commit/81893d5161012290988f065c99eb3aae5f89876a))
* **generator:** block problematic CreateInput object schemas in minimal mode ([aee979b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/aee979b60a8872a5628be76697aae1e0f72e1714))
* **imports:** correct enum import path in model generator and normalize variant file imports formatting ([8f5ab41](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8f5ab41ee9bacb25dc7d222264b799c48156ea78))
* **transformer:** prefer UncheckedCreateInput in minimal mode create operations ([0b5a982](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0b5a9825cebd77c7de8e6fb19a31edc8fa73e9cf))
* **types,zod:** correct ZodType generics, import formatting, and Unchecked pattern precedence ([8496299](https://github.com/omar-dulaimi/prisma-zod-generator/commit/849629911e3e3d2c4bec42b03ca53045787e4f4d))

### 📚 Documentation

* add troubleshooting guide for CreateInput TypeScript errors ([294402e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/294402e144cea751666c070bda22bae0b6dac7e2))
* document minimal mode CreateInput behavior and schema filtering ([f65c837](https://github.com/omar-dulaimi/prisma-zod-generator/commit/f65c8370d1bf2d515a4457a39623d79c699b68e8))
* **recipes:** escape inline Zod import snippets to fix Docusaurus SSG error (z is not defined) ([195d112](https://github.com/omar-dulaimi/prisma-zod-generator/commit/195d112085f4d44d694817bd9a7af1377059059b))

## [1.15.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.14.0...v1.15.0) (2025-08-20)

### ⚠ BREAKING CHANGES

* **config,zod:** add zodImportTarget to control Zod import (v3/v4/auto); update generator, single-file bundler, docs, recipes, and tests

### 🚀 Features

* **config,zod:** add zodImportTarget to control Zod import (v3/v4/auto); update generator, single-file bundler, docs, recipes, and tests ([1a720e6](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1a720e6055dbbdd3f859ba6d6611d80ff86c5c61))

### 📚 Documentation

* fix v1.13.0 versioned changelog to show correct latest version ([e0e0fa1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e0e0fa1865a1c7c152e3cd16252c069594874abc))
* **website:** add circular-dependency-exclusion recipe to sidebars (next, v1.13, v1.14) ([6bfc711](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6bfc711ea7bcb5b81fdf13defc61e74dc017621d))
* **website:** sync changelog and metrics after docs build ([dd83756](https://github.com/omar-dulaimi/prisma-zod-generator/commit/dd837565f16ccae4dd050b1d65f4a9fae0521ade))

## [1.14.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.13.0...v1.14.0) (2025-08-20)

### 🚀 Features

* **ci:** automate changelog sync in release workflow ([560c806](https://github.com/omar-dulaimi/prisma-zod-generator/commit/560c8060c59b890a3a2defe54a26ca857459f21e))

### 📚 Documentation

* sync changelog to show v1.13.0 as latest version ([04169b7](https://github.com/omar-dulaimi/prisma-zod-generator/commit/04169b74cf45b3c6e678c89f2ea29c13cc403ac1))

## [1.13.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.12.4...v1.13.0) (2025-08-20)

### 🚀 Features

* add pureModelsExcludeCircularRelations option to resolve issue [#183](https://github.com/omar-dulaimi/prisma-zod-generator/issues/183) ([2627051](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2627051fc581c195058a559f810a3c4168a33cf2))

### 🐛 Bug Fixes

* **linting:** remove non-null assertions from circular dependency detector ([80ab27b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/80ab27bad0958ce4251b4707aa64600999969402))
* **naming:** respect custom filePattern in import statements for pure models ([ac3b338](https://github.com/omar-dulaimi/prisma-zod-generator/commit/ac3b3384011d84a0d362015c84e50d0e849e114a)), closes [#183](https://github.com/omar-dulaimi/prisma-zod-generator/issues/183) [#183](https://github.com/omar-dulaimi/prisma-zod-generator/issues/183)

## [1.12.4](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.12.3...v1.12.4) (2025-08-18)

### 🐛 Bug Fixes

* **groupBy:** restrict _count to literal true or CountAggregateInput (align with Prisma Client) ([c5eaec0](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c5eaec077a8aace9c8b23126549c2fb38bcf3705))
* **groupBy:** use z.literal(true) for _count in groupBy args (disallow false) ([4f4fc68](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4f4fc68c0539de8034abf1b45a69d58cefec97b9))

## [1.12.3](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.12.2...v1.12.3) (2025-08-18)

### ⚠ BREAKING CHANGES

* **args:** align CountArgs and ...AndReturn schemas with Prisma Client

### 🐛 Bug Fixes

* **args:** align CountArgs and ...AndReturn schemas with Prisma Client ([82e5534](https://github.com/omar-dulaimi/prisma-zod-generator/commit/82e5534ce33cc4383815e06e599e6f6812d73ddb))

## [1.12.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.12.1...v1.12.2) (2025-08-17)

### 🐛 Bug Fixes

* **pure-models:** apply optionalFieldBehavior to schema-optional fields; keep required fields required; address perf flake by documenting run guidance; fix ESLint issues ([32dccaa](https://github.com/omar-dulaimi/prisma-zod-generator/commit/32dccaad866fcb088b9039499f1b7e65e6da8ac6))

## [1.12.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.12.0...v1.12.1) (2025-08-17)

### 🐛 Bug Fixes

* correct array field handling in Zod schema generation ([4043b64](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4043b64d180b6f336bdadb990ba9d102d6c52f00)), closes [#174](https://github.com/omar-dulaimi/prisma-zod-generator/issues/174)
* remove unused imports in array-fields test ([1b85c6e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1b85c6e9234e7863fb761d70f6bcace33f137937))

## [1.12.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.11.0...v1.12.0) (2025-08-16)

### 🚀 Features

* add optionalFieldBehavior configuration option ([6bdfc11](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6bdfc1134e10edac2153db064f040f3516e75cd8))

### 📚 Documentation

* add comprehensive documentation for optionalFieldBehavior ([127fa84](https://github.com/omar-dulaimi/prisma-zod-generator/commit/127fa84c818a1be8ad74dacdd7ea7ef4beef2112))

## [1.11.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.10.1...v1.11.0) (2025-08-16)

### 🚀 Features

* add complete CRUD operation support and fix GroupBy aggregation fields ([2bd0cf8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2bd0cf860aab75ea1a253a78225747b95c1629b5))

### 📚 Documentation

* **changelog:** remove Twitter/X follow line from Stay Updated section ([e63b800](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e63b800db4882832ae855a1f3028fc18a4e72c19))
* fix MDX parsing in changelog by escaping angle brackets; point navbar Changelog to stable next route ([d1ab1ff](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d1ab1ff3843bcda094fb4e3e33fdd7f76c3c1c2b))
* snapshot docs for v1.10.1 [skip ci] ([846f4bc](https://github.com/omar-dulaimi/prisma-zod-generator/commit/846f4bc1aaee83260e2af28d427ef0201672a9e7))
* versioning script supports patch releases via DOCS_VERSION_ON_PATCH and normalizes tags ([59a6683](https://github.com/omar-dulaimi/prisma-zod-generator/commit/59a668388a8d928864bb2a757f6828fabc117917))

## [1.10.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.10.0...v1.10.1) (2025-08-15)

### 🐛 Bug Fixes

* ensure consistent nullable handling for optional fields across all types ([a732f19](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a732f195d7ea102b81ca7ad79a6dfe7c25d24c0d))

### ♻️ Code Refactoring

* standardize enum handling across all variant types ([b94f2fa](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b94f2fa5d8a60763a5f25c90d7325ec0ccb8a398))

### 📚 Documentation

* add automated changelog sync to website ([b2390e2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b2390e2ee28784e3644ce5da8dc93f6d8e948db4))

## [1.10.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.9.3...v1.10.0) (2025-08-14)

### 🚀 Features

* add MongoDB ObjectId max length validation support ([1c139c1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1c139c1ab4cab2e5f7eea5da5874cbf71bf33f6a)), closes [#167](https://github.com/omar-dulaimi/prisma-zod-generator/issues/167)
* add native type max length validation for varchar/char fields ([74c6ad4](https://github.com/omar-dulaimi/prisma-zod-generator/commit/74c6ad462aa4b1b47c4ba57e087049827ccb34d4)), closes [#167](https://github.com/omar-dulaimi/prisma-zod-generator/issues/167)

### 🐛 Bug Fixes

* correct YAML indentation in CI workflow ([876d637](https://github.com/omar-dulaimi/prisma-zod-generator/commit/876d6372b8bde83306c5454f4646893e5ea32f57))
* enhance native type constraint handling and conflict resolution ([4cd8cad](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4cd8cad7244565c0d693457070ce0730de01ebf6))

### 📚 Documentation

* add comprehensive native type max length validation documentation ([9389b0f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9389b0f44f07a7a76ceb442acd8f14e101d3c743)), closes [#167](https://github.com/omar-dulaimi/prisma-zod-generator/issues/167)
* **ci:** gate docs deploy to docs changes or feat/fix commits ([34b089b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/34b089b5c3f4cb03ee673a6ece42e63d9df22ce1))
* modernize website with responsive design and automated metrics ([e810676](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e810676c7440e18eacb21f21fe0cedeaf41d8a53))
* **readme:** modernize intro, tidy quick start and prerequisites, refine header subline and star cue ([cff65d9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cff65d995f826ba14fcbbf1a87b08e7aca20d8aa))

## [1.9.3](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.9.2...v1.9.3) (2025-08-14)

### 🐛 Bug Fixes

* docs workflow build process ([864668f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/864668f1ca3d188d695b6079f1d87161d07666c5))

### 📚 Documentation

* add version 1.9.2 documentation ([a7c2d91](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a7c2d91942cbd75f3ef046ed3757b33df2c73919))

## [1.9.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.9.1...v1.9.2) (2025-08-13)

### 🐛 Bug Fixes

* **prisma-import:** point Zod schema Prisma imports to client entry for new prisma-client generator ([f009211](https://github.com/omar-dulaimi/prisma-zod-generator/commit/f009211f3793a61c5033dd339526e0e2ab0f54f0))

## [1.9.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.9.0...v1.9.1) (2025-08-13)

### 🐛 Bug Fixes

* **docs:** resolve Docusaurus SSG error by fixing MDX style/class props and update internal links ([#contributing](https://github.com/omar-dulaimi/prisma-zod-generator/issues/contributing), homepage) ([0f04448](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0f04448b146c130dd65450c54ea94775b9dcc5b8))

### 📚 Documentation

* **readme:** restore prominent docs website badge/link ([9105ef3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9105ef36a43ca58a7a5cd5af0d098595edc3475e))
* **readme:** streamline quick start, sponsor & contribute guidance, add badges ([596a8f3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/596a8f32b13cd7caf3c6d2b9c32ec8dc075607f7))

## [1.9.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.8.0...v1.9.0) (2025-08-13)

### 🚀 Features

* **docs,homepage:** mobile hero refinements, button redesign, badge replacement, GitHub CTA styling ([529bbc8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/529bbc8bef4632fed6767c418d45e5aa4feae829))

### ♻️ Code Refactoring

* **types:** remove explicit any in source/tests and ignore docusaurus build artifacts ([163d6be](https://github.com/omar-dulaimi/prisma-zod-generator/commit/163d6be77e4e35e5e7afd29f8b30a8ba445fd0c5))

### 📚 Documentation

* add Docusaurus site, version 1.8.0 snapshot, automation & link checks ([8590d02](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8590d023626c0a99fcf600605bfc30a3a73ba859))

## [1.8.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.7.0...v1.8.0) (2025-08-13)

### ⚠ BREAKING CHANGES

* **pure-models:** pure model exports are now *Schema and only &lt;Model&gt;.schema.ts files are generated (no &lt;Model&gt;.model.ts). Updated README. Adjust your imports accordingly.
* **pureModels:** pureModels no longer emits relation (object) fields unless pureModelsIncludeRelations=true. Set that flag to retain prior behavior. Added config parsing, defaults, docs, and tests.

### 🚀 Features

* **config:** add pureModelsLean and dateTimeStrategy options with docs and schema updates ([dc3784c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/dc3784cea2eff15fcc0b0722c488a35604b3a506))
* **custom-use:** add [@zod](https://github.com/zod).custom.use override, helper exports, and tests ([72f7b4d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/72f7b4d8bc42476ff28d35eaa343ebe32bcdffd4))
* **models:** overhaul pure model generation (Model naming, lean mode, enum schema refs, DateTime strategies, single-file optimization) ([8462d32](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8462d32687d452660876da34188dab434e863d86))
* **naming:** add stable naming customization presets and docs ([8d611d8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8d611d8fe53c037af65859a4d5dd9e260daa7f2a))
* **pure-models:** unify pure model naming to *Schema and single .schema.ts output ([5234631](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5234631c5c974b905ea064816ef37f19670e8063))
* **pureModels:** omit relation fields by default; add pureModelsIncludeRelations flag ([cf9eef4](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cf9eef4b8d6b04a63a5ffa39b7b9b7a0761d344b))
* **pure:** support pure-only variant mode (skip CRUD/object schemas when only pure enabled) ([9d4527b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9d4527b8c8fd1fb903e3e65351e6a984fe3cf556))
* **variants,imports:** unify enum schema usage across variant generators and dynamic Prisma client import paths ([a2e126a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a2e126ac994c74d74983ab60ba8748b9f713a115))
* **variants): refined enum handling for pure variant & chore(test:** migrate from deprecated basic reporter ([375fcb8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/375fcb8591b50c13f75016ebc6222ec944b97aaa))

### 🐛 Bug Fixes

* **config:** honor JSON config output when generator block omits output\n\nDefers output path initialization so JSON 'output' is used if schema block lacks output (block > JSON > default). ([5bc90b9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5bc90b9a13f9f871ce108a82fcdb42f5ae5799ed))
* **generator:** honor config output path and correct enum import paths in pure model schemas ([5393d98](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5393d9864a6682e3a18cbda323bc9b9510d79014))
* **json:** align helper file after template update ([77ecfe5](https://github.com/omar-dulaimi/prisma-zod-generator/commit/77ecfe59b96b3cbc5178fce81adcbf44995c0612))
* **json:** drop Prisma.JsonValue references for v6 compatibility and use structural JSON types ([8fef5f7](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8fef5f7e991dc952391124ba6e30edec5db6b69a))
* **prisma-client-preview:** correct import path handling for preview prisma-client generator and file extensions ([65925e2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/65925e2aae08c4510e8add1e653ce1b9e1381eeb))

### ♻️ Code Refactoring

* **json:** centralize JSON helper schema generation and adjust single-file bundling ([2102256](https://github.com/omar-dulaimi/prisma-zod-generator/commit/21022561f469655fa196772e0779acfa654e1281))

### 📚 Documentation

* **recipes:** add CRUD-only, input-only, result-only recipe examples ([36d6702](https://github.com/omar-dulaimi/prisma-zod-generator/commit/36d67029fb142d984b4d91e8cb7d50d6d62479ff))
* **recipes:** add pure-models-lean recipe with DateTime strategy examples ([dcd773a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/dcd773acb9679d102e4535108faf31f5a3794645))


## [1.7.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.6.0...v1.7.0) (2025-08-12)

### 🚀 Features

* **bytes:** align Prisma Bytes mapping with v6 (Uint8Array) and update tests\n\n- I/O schemas: map Bytes to z.instanceof(Uint8Array)\n- Pure models: default to base64 string with size checks; opt-out to Uint8Array via config\n- Update tests and docs/comments accordingly\n\nBREAKING CHANGE: Prisma Bytes now validated as Uint8Array in generated I/O schemas. Pure model default remains base64 string, with config to use Uint8Array. ([15ca502](https://github.com/omar-dulaimi/prisma-zod-generator/commit/15ca502812e87c20ffc5148e744e8c56977ef4ae))

### 📚 Documentation

* **recipes:** fix wrong file names and snippet paths in recipe READMEs; clarify usage steps ([20ec581](https://github.com/omar-dulaimi/prisma-zod-generator/commit/20ec581e048569cc93f845c215d2d1ccbe94665a))
* **recipes:** remove top-level snippets and update references to recipes/*\n\n- Delete snippets/ folder\n- Update README and recipes/README to point to recipes/&lt;name&gt;/schema.prisma\n- Keep historical mention in CHANGELOG as-is ([3aa4009](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3aa4009bafcc27ee35f12753766adbd1f5503e84))

## [1.6.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.5.0...v1.6.0) (2025-08-11)

### 🚀 Features

* **docs:** add recipes and snippets with generator block examples and configs ([bb284c7](https://github.com/omar-dulaimi/prisma-zod-generator/commit/bb284c7b4a39fbb6824a02c6d2f4fecb985deffa))

### 🐛 Bug Fixes

* **prisma:** add User.password to align generated create inputs with tests ([8485187](https://github.com/omar-dulaimi/prisma-zod-generator/commit/84851874101deaea8e5dfd6aeb754dc6adb39f04))

### ♻️ Code Refactoring

* **config:** improve option parsing and precedence; add tagged warnings and info messages ([81b0d91](https://github.com/omar-dulaimi/prisma-zod-generator/commit/81b0d9125276e98f06df899586152347ddabe866))

### 📚 Documentation

* **readme:** clarify config precedence and logging with tagged messages ([96d705b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/96d705b59ee445727a855953317cfb81de0f7d9f))

## [1.5.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.4.2...v1.5.0) (2025-08-10)

### 🚀 Features

* **config,transformer:** add strictCreateInputs/preserveRequiredScalarsOnCreate and apply to Create-like inputs; use `Omit<>` for typed exports when filtered\n\n- config: introduce strictCreateInputs (default true) and preserveRequiredScalarsOnCreate (default true)\n- transformer: respect flags for Create* inputs; re-add required scalars in filtered mode; track excluded fields and wrap typed exports with `Omit<>`\n- tests/recipes/docs: update helpers and recipes; document options in README ([cf48027](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cf480274d1a5e66c3d8744645711794d0bab6b4e))

### 🐛 Bug Fixes

* ensure enum value imports are present in variant schemas (post-merge release trigger) ([aed7e61](https://github.com/omar-dulaimi/prisma-zod-generator/commit/aed7e61a3e5e597573d527c51de82b7621d2a99b))

## [1.4.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.4.1...v1.4.2) (2025-08-10)

### 🐛 Bug Fixes

* ensure enum value imports are present in variant schemas (post-merge release trigger) ([b3dde64](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b3dde645435eeab49ff02e37be4b9eef2eddd772))

## [1.4.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.4.0...v1.4.1) (2025-08-09)

### 🐛 Bug Fixes

* **transformer:** correct list handling to avoid duplicate array() and support DateTime[] union\n\n- Use z.union([z.date().array(), z.iso.datetime().array()]) for DateTime lists\n- Append .array() only once and collapse accidental duplicates\n- Preserve optionality behavior with enhanced schemas ([2e75b93](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2e75b9366365acc6a1593e6b0fe7b0e2eb73c54d))

## [1.4.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.3.1...v1.4.0) (2025-08-09)

### 🚀 Features

* **logging:** hide verbose logs by default and gate them behind DEBUG_PRISMA_ZOD/DEBUG\n\n- Add central logger (src/utils/logger.ts)\n- Convert noisy console.log to logger.debug/info/warn\n- Keep warnings/errors visible without DEBUG ([703f716](https://github.com/omar-dulaimi/prisma-zod-generator/commit/703f716e1de8d76b27921aedaab460d7512f40f7))

## [1.3.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.3.0...v1.3.1) (2025-08-09)

### 🐛 Bug Fixes

* **objects:** inline object schema exports and add dual exports (typed + pure Zod) ([4af455c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4af455cd9ae264072b3e4c7b37457de49c250942))
* **whereUniqueInput:** require and restrict fields to unique identifiers only for WhereUniqueInput ([becd08b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/becd08b1185f867beeb464bed24101b57cedc023))

## [1.3.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.2.0...v1.3.0) (2025-08-09)

### 🚀 Features

* Add comprehensive debug logging for filtering ([5309680](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5309680ddd99dd608f153228c2ceb17bfba197b3))
* add core configuration and type system ([2923825](https://github.com/omar-dulaimi/prisma-zod-generator/commit/29238255ac2b3294ef60bd79c8bec00d2a31c4b6))
* Add example configuration and update test schema ([aca8311](https://github.com/omar-dulaimi/prisma-zod-generator/commit/aca8311adac3a162b042bb2b5fa89548bf3f9a82))
* Add legacy configuration transformation and auto-discovery ([f5612a5](https://github.com/omar-dulaimi/prisma-zod-generator/commit/f5612a5009ddf25823cfb0b5af693ca2fe357891))
* add schema variant system ([f133d1a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/f133d1ad9e30503aecb1ad257243109b3f3ffc20))
* add utility modules ([3446571](https://github.com/omar-dulaimi/prisma-zod-generator/commit/34465710d0e6dcb19c17eb0f3e7c3c93a5b3fe03))
* Enhance configuration auto-discovery in generator ([2985a4b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2985a4b453bd513d12f73e171035d4fe9448d66d))
* **generator:** add strict single-file output mode with in-process aggregator; skip variants in single-file; place bundle at output root by default via placeSingleFileAtRoot; include tests and validation tsconfig ([2296b30](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2296b30396293ff86ebef8854fd9519114f8ea05))
* implement foreign key preservation for excluded relation fields ([52897f3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/52897f3347edec6373e5e9ee3cc1d29b9c743123))
* integrate advanced filtering and configuration ([20a5313](https://github.com/omar-dulaimi/prisma-zod-generator/commit/20a53135810bcf0cff2a7edc3e3383a9a89b4d8c))
* integrate zod-integration system with main generator pipeline ([fcc396e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/fcc396e38d8861d66bfb968039d2847857f33146))
* **validation:** add comprehensive schema validation infrastructure ([6da9e61](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6da9e6170846118eccf80a139fdbc9d9d33d7c2e))
* **variants:** generate array/object variants under schemas/variants by default and add variants barrel to main index; fix index exports\n\nAlso: pure models improvements (Bytes base64 mapping, JSON record handling, dedupe defaults), union formatting to single line, enum string arrays, and minimal-mode schema emission stability. All feature tests pass. ([9ea8a46](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9ea8a46cd62ed20d41513de2afec764e59a43b15))

### 🐛 Bug Fixes

* **ci:** generate per-file schemas in example to satisfy tests (useMultipleFiles=true) ([c32e6b8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c32e6b8bef9d5873e936d07a75a7f6849374f10a))
* **config:** resolve tsconfig.json typeRoots and include paths ([976fb49](https://github.com/omar-dulaimi/prisma-zod-generator/commit/976fb49dfe6de37f2b9cbd4535a492fc0bd84e99))
* correct config path handling in field exclusion tests ([67bcbf2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/67bcbf2ae072e1fd2c967c8ed116da775e2e8f5c))
* correct test configurations and schema generation issues ([d1af961](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d1af961a63d1be8c8c986d923ea601ad205d8915))
* enhance [@zod](https://github.com/zod) annotation parsing and validation ([f965e22](https://github.com/omar-dulaimi/prisma-zod-generator/commit/f965e22ba334a8e849a7d425e24ed317c3157291))
* enhance [@zod](https://github.com/zod) method parameter validation for custom error messages ([4d06ec4](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4d06ec44aeac96921da5c0714f31f86692fc2379))
* Enhance model filtering to prevent disabled model schemas in nested folders ([c34e995](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c34e995b5d1a500972e2e4953b16326b9f864958))
* **generator:** correct Zod method chaining order for optional and nullable fields ([0effdf2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0effdf277763ee6717f431e0bcf8de9ef1c7180c))
* implement comprehensive Zod comment parsing engine ([154aaa1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/154aaa1953e0d0dd3a62a263507c741ae97d0d1f))
* Improve field exclusion system and foreign key preservation ([e857e6a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e857e6ac67b2b2814c6dad79b840ea382109bd8f))
* improve regex validation and resolve optional redundancy in zod schema generation ([5ccce49](https://github.com/omar-dulaimi/prisma-zod-generator/commit/5ccce495f1f4cd9eed972ee7dd5fd8435fa8862f))
* prevent duplicate .optional() calls in enhanced zod schemas ([b7eb5e0](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b7eb5e008fcb0df9546c8c66745eac7d458a4642))
* remove unused ObjectSchema imports from result schemas ([488e838](https://github.com/omar-dulaimi/prisma-zod-generator/commit/488e83807d05798213f25772ac3bcc4def0b76f9))
* replace deprecated Zod API usage ([9e46bcc](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9e46bcc482d0dc5c0cf2007474b7cf4c58d13ecf))
* replace deprecated Zod API usage ([92d2537](https://github.com/omar-dulaimi/prisma-zod-generator/commit/92d25376ecaac59a2fb7f589c29a9596f0cbd184))
* resolve [@zod](https://github.com/zod) annotation method validation and parameter formatting ([918d15c](https://github.com/omar-dulaimi/prisma-zod-generator/commit/918d15cb24bbadb480d0492a49ca4b3de26ce26b))
* Resolve config path resolution issues in tests ([2cdb6fc](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2cdb6fcc7c5704a5c01bd5c2ad0f9627cd1b5708))
* resolve ESLint errors to unblock release (unused vars, require->import) ([becfbdb](https://github.com/omar-dulaimi/prisma-zod-generator/commit/becfbdb28da17904ec0299b42c36baa04b13b0c2))
* resolve field exclusion system configuration issues ([2f50c4a](https://github.com/omar-dulaimi/prisma-zod-generator/commit/2f50c4aaed7d79884ca17409c6fbac9fe6c144ae))
* resolve test configuration and template variable issues ([fc10758](https://github.com/omar-dulaimi/prisma-zod-generator/commit/fc10758b6f992c862f3593f81c9c4da2c6b4b5bd))
* update supporting modules and test infrastructure ([0bd5d56](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0bd5d56acc1c7862c6e1f54e2b2bca3a537a7a41))

### ♻️ Code Refactoring

* enhance helper modules with filtering support ([4938d6e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4938d6e4359726ab464b02c6b83cbf5c161fe11b))
* **parser:** remove duplicate base type method configurations ([4f5f7f1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4f5f7f1c216af8a36bff3b10aef862fc919246e4))

### 📚 Documentation

* add comprehensive documentation ([d96c872](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d96c8721d44558f4bbeb75d43346698b26db7d61))

## [1.2.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.1.1...v1.2.0) (2025-08-07)

### 🚀 Features

* implement community generator aggressive inlining pattern ([d5675c0](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d5675c0b4938da374927c8f448193c411ccf8a68))
* implement dual schema export strategy to solve TypeScript method trade-off ([9cba538](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9cba5386b5fd83f91d41c6a688bb336d0587bc81))
* implement selective inlining for select schemas ([0a1c921](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0a1c921f3e61b4c0ea510df2986ff63bed694d9f))
* implement true select schema inlining following community generator pattern ([be01d20](https://github.com/omar-dulaimi/prisma-zod-generator/commit/be01d20fe4a29acddd9c1ae2f9c28df1f54d46ff))
* removes the forced ZodType to allow the use of ZodObject properties and methods ([df36da4](https://github.com/omar-dulaimi/prisma-zod-generator/commit/df36da4a21322597ca27ab1781c6f04fe4cdd2bb))

### 🐛 Bug Fixes

* dual export configuration parsing bug ([e4b6853](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e4b68534f1ef184b8b2ef19786c2d254cdb44c07))
* improve TypeScript type inference with explicit Prisma bindings ([cb14493](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cb144935524eb2dc53c304ae098fc7994d2d5ebe))
* model hiding functionality for @@Gen.model(hide: true) ([fe4567e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/fe4567e7e222156cae22a05777d54a99cc9b67d6))
* resolve field name detection bug in generateObjectSchemaField ([94508ae](https://github.com/omar-dulaimi/prisma-zod-generator/commit/94508aefb9f21b68d59f0512b2bbfd548605f9a8))
* resolve FindMany union validation issue and improve composition approach ([92d9301](https://github.com/omar-dulaimi/prisma-zod-generator/commit/92d9301bf3cfdb9c2d51de678f85038549cc91ba))
* use Buffer instead of Uint8Array for bytes field in test ([4608156](https://github.com/omar-dulaimi/prisma-zod-generator/commit/4608156460e91dc394c7d37c87e02bca734de7d4))

### 📚 Documentation

* add composition approach design documentation ([dc4ecc5](https://github.com/omar-dulaimi/prisma-zod-generator/commit/dc4ecc5c6ef2649be5613825b0ed22df08aac3a0))
* add comprehensive dual export configuration guide ([6628842](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6628842436641b8e67af2d3006c01cf1204be779))
* update comparison with aggressive inlining achievement ([b47449f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b47449fa2a2ecaabd106fa2261c50dcf195fe17b))

## [1.1.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.1.0...v1.1.1) (2025-07-30)

### 🐛 Bug Fixes

* improve ESM import handling and type validation ([c07d384](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c07d384d2ec4672271d653446f1c6576f0c2c4d4))
* resolve ESLint errors in ESM configuration tests ([9687c1d](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9687c1d0a2e6d3b6cf703d3bac74bd2c318cd7aa))

### 📚 Documentation

* add preview features support section to README ([a348446](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a348446b379da3ab77c9558eb77a9d27a872c1e9))
* remove beta sections and references from README ([32edf33](https://github.com/omar-dulaimi/prisma-zod-generator/commit/32edf3374c4f96f3e482dc37f79e985ccc1b39f0))

## [1.1.0](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.7...v1.1.0) (2025-07-25)

### 🚀 Features

* add support for new prisma-client generator ([46cdc02](https://github.com/omar-dulaimi/prisma-zod-generator/commit/46cdc027a0229cc8da648d1daac243b2e62e6748)), closes [#127](https://github.com/omar-dulaimi/prisma-zod-generator/issues/127)

## [1.0.7](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.6...v1.0.7) (2025-07-25)

### 🐛 Bug Fixes

* add explicit type annotations to prevent TypeScript implicit any errors ([ef50308](https://github.com/omar-dulaimi/prisma-zod-generator/commit/ef503088af6cd0728267a8fb30b9adab782453b8))

## [1.0.6](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.5...v1.0.6) (2025-07-25)

### 🐛 Bug Fixes

* correct skipDuplicates support for database providers ([0511785](https://github.com/omar-dulaimi/prisma-zod-generator/commit/051178560b0fee4940779c1d941a06f547f16317))

## [1.0.5](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.4...v1.0.5) (2025-07-25)

### 🐛 Bug Fixes

* remove package/package.json from git add in release workflow ([254ad28](https://github.com/omar-dulaimi/prisma-zod-generator/commit/254ad281cbe1ff5e7b96a85437d72c9917c8a9fc))
* resolve TypeScript compilation errors in generated schemas ([85d10a8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/85d10a8e7f494365d8912120d492e6061d9b52dc))

## [1.0.5](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.4...v1.0.5) (2025-07-23)

### 🐛 Bug Fixes

* remove package/package.json from git add in release workflow ([254ad28](https://github.com/omar-dulaimi/prisma-zod-generator/commit/254ad281cbe1ff5e7b96a85437d72c9917c8a9fc))

## [1.0.4](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.3...v1.0.4) (2025-07-23)

### 🐛 Bug Fixes

* remove unused error parameters in test catch blocks ([025b822](https://github.com/omar-dulaimi/prisma-zod-generator/commit/025b82201bb3e615968118c81276f28e3c46874a))
* resolve output directory duplication when path ends with 'schemas' ([e200115](https://github.com/omar-dulaimi/prisma-zod-generator/commit/e200115de9a73d43b5dd540c4f48e75d1bc70612)), closes [#118](https://github.com/omar-dulaimi/prisma-zod-generator/issues/118)

## [1.0.3](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.2...v1.0.3) (2025-07-22)

### 🐛 Bug Fixes

* resolve TypeScript inference issues with z.lazy() relations ([6da8eb8](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6da8eb800d3610da52f022146d9448d963111ec1))

### 📚 Documentation

* remove hardcoded version numbers from README ([95d6cbd](https://github.com/omar-dulaimi/prisma-zod-generator/commit/95d6cbdb08fd6fd897ee0e0f99ada71c9fbe8a1f))

## [1.0.2](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.1...v1.0.2) (2025-07-22)

### 🐛 Bug Fixes

* resolve schema compilation errors in Issue [#119](https://github.com/omar-dulaimi/prisma-zod-generator/issues/119) ([3f29b48](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3f29b486a0486b7fa45dff44c1a1b8ca493162e3))
* resolve Vitest worker timeout in CI ([08a5546](https://github.com/omar-dulaimi/prisma-zod-generator/commit/08a5546743bafc5ee16c57f9aaafb8fdb61c069c))

## [1.0.1](https://github.com/omar-dulaimi/prisma-zod-generator/compare/v1.0.0...v1.0.1) (2025-07-22)

### 🐛 Bug Fixes

* remove broken logo image from README ([eb2ba51](https://github.com/omar-dulaimi/prisma-zod-generator/commit/eb2ba51aaed0005b6489de4c8d84f21c6ea4edaf))

### 📚 Documentation

* update README for v1.0.0 stable release ([0f267c9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0f267c9b7144685530e2a5dd3d3420c9e3e2b5f3))

## 1.0.0 (2025-07-22)

### 🚀 Features

* add comprehensive CI/CD automation and release workflows ([cb562f5](https://github.com/omar-dulaimi/prisma-zod-generator/commit/cb562f5317a1d4d11462c8866dc657cdf780ecab))
* add support for new prisma-client generator ([8224aed](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8224aed0a5ae9a24c76969d655abe9e38e9bafa9)), closes [#116](https://github.com/omar-dulaimi/prisma-zod-generator/issues/116)
* configure semantic-release for beta releases from upgrade branch ([6dfdd98](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6dfdd9885b5f4e295427256d92e0f7f26095cfd2))
* enable semantic-release for upgrade branch ([d6ef9b3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d6ef9b3fd4e8f3515cdddffbc3ab955a61b21e1a))
* remove strict requiresGenerators constraint ([6e1d41b](https://github.com/omar-dulaimi/prisma-zod-generator/commit/6e1d41b613145a1bd535f23140ca738cc5cce2d5)), closes [#116](https://github.com/omar-dulaimi/prisma-zod-generator/issues/116)

### 🐛 Bug Fixes

* add MongoDB schema generation step to CI workflow ([b120f12](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b120f127ee39681faeb0632bc06b14754966ff64))
* add skipDuplicates option to createMany query ([710d522](https://github.com/omar-dulaimi/prisma-zod-generator/commit/710d52215b0c5c4e0f026a2e52fdfe8864085179))
* adjust MongoDB test expectations for CI compatibility ([0c53f60](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0c53f6075f481973eb9d9ff3a30018386a678659))
* adjust provider discovery test and fix more ESLint issues ([bb83e97](https://github.com/omar-dulaimi/prisma-zod-generator/commit/bb83e97c19aa0d54b0b2788cbea1679f15f1b553))
* adjust test expectations and resolve remaining ESLint issues ([d1ae46e](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d1ae46e7bd7d862020437b9956ff123b139b549f))
* convert vitest config to JavaScript for better Node 18 compatibility ([0106c4f](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0106c4f4f3ead2c16d4432ece73eeef481ccc2ce))
* correct branch references from main to master in CI/CD workflows ([009aa79](https://github.com/omar-dulaimi/prisma-zod-generator/commit/009aa79c2312e78a35d342398ab3b5bcddd0ed3f))
* no array around createManyInput ([a244cac](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a244cac1f0475f77948c49c5efec328c59aa8060))
* prevent NaN errors in MongoDB test success rate calculations ([1498a80](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1498a80565ffb9b306e271d3a069d0ffda494853))
* replace absolute paths with relative paths in provider schemas ([97cb362](https://github.com/omar-dulaimi/prisma-zod-generator/commit/97cb36215245966369c20ab1e29f1b970206f8a7))
* resolve all remaining ESLint any type warnings ([b26ea59](https://github.com/omar-dulaimi/prisma-zod-generator/commit/b26ea593d7e4663908be5e70d58d1f73cccd6621))
* resolve CI test failures and ESLint issues ([89ba9e6](https://github.com/omar-dulaimi/prisma-zod-generator/commit/89ba9e60dd8f6f741d3d1725821ef12b2e2c4a94))
* resolve ESLint configuration and CI issues ([df52348](https://github.com/omar-dulaimi/prisma-zod-generator/commit/df5234862e18583f26643c93eb38acf9d2773e82))
* resolve MongoDB schema coverage test import issues ([989addd](https://github.com/omar-dulaimi/prisma-zod-generator/commit/989addd452df84fed45e6f530bdeeb6cbd6bace2))
* skip vitest tests for Node 18 due to Vite 7.x requirements ([93605e1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/93605e1fb361597bac1191c1371f08d3f6a8c453))
* update dependabot configuration ([d5f57fb](https://github.com/omar-dulaimi/prisma-zod-generator/commit/d5f57fb36a28698861cfb23ee95c0f6efe5d985f))
* update package-lock.json with semantic-release dependencies ([814be64](https://github.com/omar-dulaimi/prisma-zod-generator/commit/814be64def5b449fec7b3bab9d4192dc3361f0ec))
* update vitest config for v3 compatibility with Node 18 ([7f34eab](https://github.com/omar-dulaimi/prisma-zod-generator/commit/7f34eab86040ef99ba89c4455a11cf84f9fadf8e))
* use correct DMMF namespace import alias ([a495445](https://github.com/omar-dulaimi/prisma-zod-generator/commit/a495445e6a943db2b750d0ddb082add4d491ce10))

### 📚 Documentation

* add beta testing announcement to README ([1b0bfb2](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1b0bfb20fefecf32674f45a9e00bfc8158254d4d))
* add comprehensive CI/CD workflow usage guide ([3da4f92](https://github.com/omar-dulaimi/prisma-zod-generator/commit/3da4f921f7ef55533d259844c9102e6acac0e962))
* add prominent support section to README ([0803dc3](https://github.com/omar-dulaimi/prisma-zod-generator/commit/0803dc3a094fd69f8c1173de489d2c01b9d9831e))
* clarify GitHub secrets setup for repository vs environment secrets ([c8ea5cc](https://github.com/omar-dulaimi/prisma-zod-generator/commit/c8ea5cc8eafd7860e4df8d3b56ba74ca8a735c03))
* clarify test schema purpose for new generator ([659c4e0](https://github.com/omar-dulaimi/prisma-zod-generator/commit/659c4e0a113eeb0b23179dcb3aa1e97c0fff7a71))
* comprehensive README improvements ([9d014b9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/9d014b940c1c21e8afc3714736f3f7d539393a2d))
* correct link in table of contents ([918f862](https://github.com/omar-dulaimi/prisma-zod-generator/commit/918f8628d89bcccf5d98003598008dfb35afa09a))
* focus beta announcement on Prisma 6 & Zod 4 compatibility ([087c257](https://github.com/omar-dulaimi/prisma-zod-generator/commit/087c25734b7560e04488764342cadfea37c61129))
* improve NPM token setup instructions and troubleshooting ([8f379f9](https://github.com/omar-dulaimi/prisma-zod-generator/commit/8f379f9b7fe8890117830ca102267225c9527145))
* modernize README with enhanced styling and comprehensive content ([1f226a1](https://github.com/omar-dulaimi/prisma-zod-generator/commit/1f226a163ce9676c2aa5a1316faa1283607a9da5))
* update README for Prisma 6 and Zod 4 support ([bdac9dd](https://github.com/omar-dulaimi/prisma-zod-generator/commit/bdac9ddbd3e2956031eed3422a36c7d3812d5d72))
* update to v0.8.15-beta.0 with new generator support ([7372825](https://github.com/omar-dulaimi/prisma-zod-generator/commit/7372825e797d47b87d155a7b78c08b62fd380bed))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


*This changelog is automatically generated using [semantic-release](https://github.com/semantic-release/semantic-release).*
