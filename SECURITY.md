# Security Policy

## Reporting a Vulnerability

Please report security issues **privately** via GitHub's private vulnerability reporting:

**[Report a vulnerability](https://github.com/omar-dulaimi/prisma-zod-generator/security/advisories/new)**

Do not open public issues for undisclosed vulnerabilities. If private reporting is not an option for you, contact the maintainer through the email listed on their GitHub profile.

You can expect an acknowledgement as soon as possible. This project is currently in [maintenance mode](https://github.com/omar-dulaimi/prisma-zod-generator/issues/380), so response times are best-effort — but security reports are treated with the highest priority among incoming work.

## Supported Versions

Only the latest published version of `prisma-zod-generator` receives security fixes.

## Scope

Relevant reports include, for example:

- Generated code that introduces vulnerabilities into consuming projects
- Command injection or arbitrary file write during schema generation
- Supply-chain issues affecting the published npm package or its dependencies

## A Note on Supply-Chain Hygiene for Contributors

This project was the target of a supply-chain campaign in which malware was injected into a contributor's pull request **without their knowledge** via an infected development machine (see the [PolinRider campaign](https://github.com/OpenSourceMalware/PolinRider)).

Because of this:

- Pull requests that modify configuration files (`eslint.config.*`, `*.config.mjs`, `postinstall` scripts, etc.) unrelated to their stated purpose will be **rejected and investigated**, regardless of the author's standing.
- Before contributing, consider auditing your own machine if you have recently installed unfamiliar npm packages or worked on "take-home test" projects from unverified sources.

This is not distrust of contributors — it protects contributors and users alike.
