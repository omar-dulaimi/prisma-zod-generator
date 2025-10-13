import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import fg from 'fast-glob';
import { remark } from 'remark';
import gfm from 'remark-gfm';
import mdx from 'remark-mdx';
import stringify from 'remark-stringify';

/**
 * Prisma Zod Generator — llms.txt generator
 *
 * Responsibilities
 * - Curate a stable, minimal-noise text surface for LLMs (README + docs)
 * - Include top-of-file navigation links and a complete docs link index
 * - Normalize markdown (MD/MDX), strip frontmatter, and enforce deterministic ordering
 * - Remain resilient when optional folders are missing
 */

const ROOT = path.resolve(__dirname, '..');
const README_PATH = path.join(ROOT, 'README.md');
const PKG_PATH = path.join(ROOT, 'package.json');
const OUTPUT_PATH = path.join(ROOT, 'llms.txt');

const DOC_GLOBS = [
  // Local docs folders (optional)
  'docs/**/*.md',
  'docs/**/*.mdx',
  'content/**/*.md',
  'content/**/*.mdx',
  'website/content/**/*.md',
  'website/content/**/*.mdx',
  // Docusaurus site docs (present in this repo)
  'website/docs/**/*.md',
  'website/docs/**/*.mdx',
];

const processor = remark()
  .use(mdx as any)
  .use(gfm)
  .use(stringify, {
    bullet: '-',
    fences: true,
    listItemIndent: 'one',
  });

/**
 * Create a level-1 markdown header with optional body.
 */
function header(title: string, body = ''): string {
  return `# ${title}\n\n${body}`.trim();
}

/**
 * Read a text file if it exists; return null if it doesn't.
 */
async function readTextIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Read and process a markdown/MDX file:
 * - strips frontmatter (gray-matter)
 * - runs remark pipeline to normalize
 * - returns normalized text and inferred title (frontmatter title or first H1)
 */
async function readAndProcess(
  filePath: string,
): Promise<{ title: string | null; text: string } | null> {
  const raw = await readTextIfExists(filePath);
  if (!raw) return null;
  const { content, data } = matter(raw);
  const processed = await processor.process({ path: filePath, value: content });
  const text = String(processed).trim();
  let title: string | null = null;
  // Prefer frontmatter title if present
  if (typeof data?.title === 'string' && data.title.trim()) {
    title = String(data.title).trim();
  } else {
    // Fallback: infer from first markdown heading (# ...)
    const m = /^#\s+(.+)$/m.exec(text);
    if (m) title = m[1].trim();
  }
  return { title, text };
}

/**
 * Current date in YYYY-MM-DD.
 */
function todayISO(): string {
  const d = new Date();
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

/**
 * Read package.json version, fallback to 0.0.0 on error.
 */
async function getVersion(): Promise<string> {
  try {
    const pkgRaw = await fs.readFile(PKG_PATH, 'utf8');
    const pkg = JSON.parse(pkgRaw) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Extract a subsection from README by heading label (e.g., "Quick start").
 * Returns the inner body, or null when not found.
 */
function extractReadmeSection(readme: string, heading: string): string | null {
  // Normalize line endings
  const src = readme.replace(/\r\n/g, '\n');
  const pattern = new RegExp(
    `^##\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\s*\n([\s\S]*?)(^##\s+|\n\n##\s+|\n$)`,
    'm',
  );
  const m = pattern.exec(src + '\n');
  if (!m) return null;
  let body = m[1] ?? '';
  // Trim trailing whitespace and ensure code fences remain intact
  body = body.trim();
  return body || null;
}

/**
 * Build curated, stable top sections (title, tagline, quick start, links...).
 */
async function buildCuratedTop(): Promise<string> {
  const version = await getVersion();
  const lastUpdated = todayISO();
  const title = 'Prisma Zod Generator';
  const tagline = 'Prisma → Zod in one generate. Ship validated, typed data everywhere.';

  // Attempt to extract Quick start from README
  const readmeRaw = (await readTextIfExists(README_PATH)) ?? '';
  const readmeNoFront = matter(readmeRaw).content;

  const quickStart = extractReadmeSection(readmeNoFront, 'Quick start');

  // Curated Quick start fallback (deterministic)
  const quickStartBlock = quickStart
    ? quickStart
    : [
        '- Install: `npm i -D prisma-zod-generator`',
        '- In `schema.prisma`:',
        '  ```prisma',
        '  generator zod { provider = "prisma-zod-generator" }',
        '  ```',
        '- Generate: `npx prisma generate`',
        '- Import:',
        '  ```ts',
        '  import { UserSchema } from "./prisma/generated/schemas";',
        '  ```',
      ].join('\n');

  // Stable links
  const links = [
    '- Docs: https://omar-dulaimi.github.io/prisma-zod-generator/',
    '- NPM: https://www.npmjs.com/package/prisma-zod-generator',
    '- Repo: https://github.com/omar-dulaimi/prisma-zod-generator',
    '- Issues: https://github.com/omar-dulaimi/prisma-zod-generator/issues',
    '- Sponsor: https://github.com/sponsors/omar-dulaimi',
  ].join('\n');

  // Feature highlights — concise and stable
  const highlights = [
    '- Zero‑boilerplate Zod schemas from Prisma models',
    '- Multiple variants: input, result, pure',
    '- Fast minimal mode & selective filtering',
    '- Strict types • ESM/CJS friendly • TypeScript‑first',
  ].join('\n');

  // Configuration overview (curated minimal)
  const config = [
    'Add to your Prisma schema:',
    '```prisma',
    'generator zod {',
    '  provider = "prisma-zod-generator"',
    '  // optional: output, disabledModels, modelNameStrategy, etc.',
    '}',
    '```',
    'Run `npx prisma generate` to emit schemas.',
  ].join('\n');

  // Notes / constraints
  const notes = [
    '- Requires Node.js 18+',
    "- Works with Prisma's `prisma generate` lifecycle",
  ].join('\n');

  return [
    header(title),
    `> ${tagline}`,
    `Last updated: ${lastUpdated} • Version: ${version}`,
    '## Quick start',
    quickStartBlock,
    '## Highlights',
    highlights,
    '## Links',
    links,
    '## Configuration',
    config,
    '## Recipes',
    '- See `recipes/` in the repo and docs site.',
    '## Notes',
    notes,
  ]
    .join('\n\n')
    .trim();
}

/**
 * Normalize path separators to POSIX (forward slashes) for stable sorting.
 */
function normalizeToPosix(p: string): string {
  return p.split(path.sep).join(path.posix.sep);
}

/**
 * Decide whether to skip a docs page for aggregation to keep output concise.
 */
function shouldSkipDoc(file: string): boolean {
  const name = path.basename(file).toLowerCase();
  if (name.includes('changelog')) return true;
  if (name.includes('contributing')) return true;
  return false;
}

/**
 * Aggregate docs content into a single normalized plain-text stream.
 * Applies deterministic ordering and a soft size cap (~300KB).
 */
async function buildDocsAggregate(): Promise<string | null> {
  // Discover docs files (optional)
  const files = await fg(DOC_GLOBS, { cwd: ROOT, absolute: true, dot: false });
  if (!files?.length) return null;

  const unique = Array.from(new Set(files.map((f) => path.resolve(f))));
  unique.sort((a, b) => normalizeToPosix(a).localeCompare(normalizeToPosix(b)));

  const parts: string[] = [];
  let total = 0;
  const softCap = 300 * 1024; // ~300KB

  for (const file of unique) {
    if (shouldSkipDoc(file)) continue;
    const res = await readAndProcess(file);
    if (!res) continue;
    const title = res.title ?? path.basename(file);
    const pageText = `# ${title}\n\n${res.text}`.trim();
    const nextLen = pageText.length + 2; // incl. separator
    if (total + nextLen > softCap) break;
    parts.push(pageText);
    total += nextLen;
  }

  if (!parts.length) return null;
  return parts.join('\n\n');
}

/**
 * Build a list of absolute links for all docs pages under website/docs.
 * Titles are derived from frontmatter title or first H1 fallback.
 */
async function buildDocsLinks(): Promise<string | null> {
  // Focus on the docs site content under website/docs
  // Existence detection via glob (covers both md and mdx)
  const files = await fg(['website/docs/**/*.md', 'website/docs/**/*.mdx'], {
    cwd: ROOT,
    absolute: true,
    dot: false,
  });
  if (!files?.length) return null;

  // Site base from package.json homepage (e.g., https://omar-dulaimi.github.io/prisma-zod-generator)
  let homepage = 'https://omar-dulaimi.github.io/prisma-zod-generator';
  try {
    const raw = await fs.readFile(PKG_PATH, 'utf8');
    const pkg = JSON.parse(raw);
    if (typeof pkg?.homepage === 'string' && pkg.homepage)
      homepage = pkg.homepage.replace(/\/?$/, '');
  } catch {}

  const routeBase = 'docs';

  const unique = Array.from(new Set(files.map((f) => path.resolve(f))));
  unique.sort((a, b) => normalizeToPosix(a).localeCompare(normalizeToPosix(b)));

  const lines: string[] = [];
  for (const file of unique) {
    // Relative slug
    const rel = path.relative(path.join(ROOT, 'website', 'docs'), file);
    const relPosix = normalizeToPosix(rel);
    const withoutExt = relPosix.replace(/\.(md|mdx)$/i, '');

    // Read frontmatter for optional title
    const raw = await readTextIfExists(file);
    let title: string | null = null;
    if (raw) {
      const fm = matter(raw);
      if (typeof fm.data?.title === 'string' && fm.data.title.trim()) {
        title = String(fm.data.title).trim();
      } else {
        // Fallback: infer H1 from content
        const m = /^#\s+(.+)$/m.exec(fm.content || raw);
        if (m) title = m[1].trim();
      }
    }

    // Compose absolute URL
    const url = `${homepage}/${routeBase}/${withoutExt}`;
    if (title) lines.push(`- ${title}: ${url}`);
    else lines.push(`- ${url}`);
  }

  if (!lines.length) return null;
  return ['## All Docs Links', ...lines].join('\n');
}

/**
 * Build a short set of top navigation links (Home, Docs, Changelog, GitHub).
 */
async function buildNavbarLinks(): Promise<string> {
  // Use homepage and repository from package.json to form absolute links
  let homepage = 'https://omar-dulaimi.github.io/prisma-zod-generator';
  let repository = 'https://github.com/omar-dulaimi/prisma-zod-generator';
  try {
    const raw = await fs.readFile(PKG_PATH, 'utf8');
    const pkg = JSON.parse(raw);
    if (typeof pkg?.homepage === 'string' && pkg.homepage)
      homepage = pkg.homepage.replace(/\/?$/, '');
    if (pkg?.repository) {
      if (typeof pkg.repository === 'string') repository = pkg.repository;
      else if (typeof pkg.repository?.url === 'string') repository = pkg.repository.url;
    }
  } catch {}

  const siteHome = homepage.replace(/\/docs\/?$/, '');
  const links = [
    `- Home: ${siteHome}/`,
    `- Docs: ${homepage}/docs`,
    `- Changelog: ${homepage}/docs/changelog`,
    `- GitHub: ${repository}`,
  ];
  return ['## Navbar Links', ...links].join('\n');
}

/**
 * Entry point: assemble sections and write llms.txt at repo root.
 */
async function main() {
  const curatedTop = await buildCuratedTop();
  const docs = await buildDocsAggregate();
  const docsLinks = await buildDocsLinks();
  const navbarLinks = await buildNavbarLinks();

  // Order: Navbar links and Docs links first (as requested), then curated top, then aggregated docs content
  const sections = [navbarLinks];
  if (docsLinks) sections.push(docsLinks);
  sections.push(curatedTop);
  if (docs) sections.push(docs);

  const finalText = sections.join('\n\n').trim() + '\n';
  await fs.writeFile(OUTPUT_PATH, finalText, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)} (${finalText.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
