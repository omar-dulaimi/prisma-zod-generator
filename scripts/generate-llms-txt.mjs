import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import fg from 'fast-glob';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { remark } from 'remark';
import gfm from 'remark-gfm';
import mdx from 'remark-mdx';
import stringify from 'remark-stringify';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const README_PATH = path.join(ROOT, 'README.md');
const PKG_PATH = path.join(ROOT, 'package.json');
const OUTPUT_PATH = path.join(ROOT, 'llms.txt');

const DOC_GLOBS = [
  'docs/**/*.md',
  'docs/**/*.mdx',
  'content/**/*.md',
  'content/**/*.mdx',
  'website/content/**/*.md',
  'website/content/**/*.mdx',
  'website/docs/**/*.md',
  'website/docs/**/*.mdx',
];

const processor = remark().use(mdx).use(gfm).use(stringify, {
  bullet: '-',
  fences: true,
  listItemIndent: 'one',
  allowDangerousHtml: true,
});

const fallbackProcessor = remark().use(gfm).use(stringify, {
  bullet: '-',
  fences: true,
  listItemIndent: 'one',
  allowDangerousHtml: true,
});

function header(title, body = '') {
  return `# ${title}\n\n${body}`.trim();
}

async function readTextIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function readAndProcess(filePath) {
  const raw = await readTextIfExists(filePath);
  if (!raw) return null;
  const { content, data } = matter(raw);
  let text;
  try {
    const processed = await processor.process({ path: filePath, value: content });
    text = String(processed).trim();
  } catch {
    try {
      const processedLite = await fallbackProcessor.process({ path: filePath, value: content });
      text = String(processedLite).trim();
    } catch {
      text = String(content).trim();
    }
  }
  let title = null;
  if (typeof data?.title === 'string' && data.title.trim()) {
    title = String(data.title).trim();
  } else {
    const m = /^#\s+(.+)$/m.exec(text);
    if (m) title = m[1].trim();
  }
  return { title, text };
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

async function computeLastUpdatedISO() {
  try {
    const docFiles = await fg(DOC_GLOBS, {
      cwd: ROOT,
      absolute: true,
      dot: false,
      onlyFiles: true,
    });
    const candidates = new Set([README_PATH, PKG_PATH, ...docFiles]);
    let max = 0;
    for (const f of candidates) {
      try {
        const s = await fs.stat(f);
        if (s.mtimeMs > max) max = s.mtimeMs;
      } catch {}
    }
    return max ? new Date(max).toISOString().slice(0, 10) : todayISO();
  } catch {
    return todayISO();
  }
}

async function getVersion() {
  try {
    const pkgRaw = await fs.readFile(PKG_PATH, 'utf8');
    const pkg = JSON.parse(pkgRaw);
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function extractReadmeSection(readme, heading) {
  const src = readme.replace(/\r\n/g, '\n');
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?:\\n(?=##\\s)|$)`, 'mi');
  const m = pattern.exec(src);
  if (!m) return null;
  let body = m[1] ?? '';
  body = body.trim();
  return body || null;
}

async function buildCuratedTop() {
  const version = await getVersion();
  const lastUpdated = await computeLastUpdatedISO();
  const title = 'Prisma Zod Generator';
  const tagline = 'Prisma → Zod in one generate. Ship validated, typed data everywhere.';

  const readmeRaw = (await readTextIfExists(README_PATH)) ?? '';
  const readmeNoFront = matter(readmeRaw).content;
  const quickStart = extractReadmeSection(readmeNoFront, 'Quick start');
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

  const links = [
    '- Docs: https://omar-dulaimi.github.io/prisma-zod-generator/',
    '- NPM: https://www.npmjs.com/package/prisma-zod-generator',
    '- Repo: https://github.com/omar-dulaimi/prisma-zod-generator',
    '- Issues: https://github.com/omar-dulaimi/prisma-zod-generator/issues',
    '- Sponsor: https://github.com/sponsors/omar-dulaimi',
  ].join('\n');

  const highlights = [
    '- Zero‑boilerplate Zod schemas from Prisma models',
    '- Multiple variants: input, result, pure',
    '- Fast minimal mode & selective filtering',
    '- Strict types • ESM/CJS friendly • TypeScript‑first',
  ].join('\n');

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

function normalizeToPosix(p) {
  return p.split(path.sep).join(path.posix.sep);
}

function shouldSkipDoc(file) {
  const name = path.basename(file).toLowerCase();
  if (name.includes('changelog')) return true;
  if (name.includes('contributing')) return true;
  return false;
}

async function buildDocsAggregate() {
  const files = await fg(DOC_GLOBS, { cwd: ROOT, absolute: true, dot: false, onlyFiles: true });
  if (!files?.length) return null;

  const unique = Array.from(new Set(files.map((f) => path.resolve(f))));
  unique.sort((a, b) => normalizeToPosix(a).localeCompare(normalizeToPosix(b)));

  const parts = [];
  let totalBytes = 0;
  const softCap = 300 * 1024;

  for (const file of unique) {
    if (shouldSkipDoc(file)) continue;
    const res = await readAndProcess(file);
    if (!res) continue;
    const title = res.title ?? path.basename(file);
    const pageText = `# ${title}\n\n${res.text}`.trim();
    const nextBytes = Buffer.byteLength(pageText, 'utf8') + 2;
    if (totalBytes + nextBytes > softCap) break;
    parts.push(pageText);
    totalBytes += nextBytes;
  }

  if (!parts.length) return null;
  return parts.join('\n\n');
}

async function buildDocsLinks() {
  const files = await fg(['website/docs/**/*.md', 'website/docs/**/*.mdx'], {
    cwd: ROOT,
    absolute: true,
    dot: false,
    onlyFiles: true,
  });
  if (!files?.length) return null;

  const slugToPath = new Map();
  for (const abs of files) {
    const rel = path.relative(path.join(ROOT, 'website', 'docs'), abs);
    const relPosix = normalizeToPosix(rel);
    const withoutExt = relPosix.replace(/\.(md|mdx)$/i, '');
    slugToPath.set(withoutExt, abs);
  }

  let homepage = 'https://omar-dulaimi.github.io/prisma-zod-generator';
  try {
    const raw = await fs.readFile(PKG_PATH, 'utf8');
    const pkg = JSON.parse(raw);
    if (typeof pkg?.homepage === 'string' && pkg.homepage)
      homepage = pkg.homepage.replace(/\/?$/, '');
  } catch {}

  const routeBase = 'docs';

  const sidebarPath = path.join(ROOT, 'website', 'sidebars.ts');
  let orderedSlugs = null;
  try {
    const url = pathToFileURL(sidebarPath).href;
    const mod = await import(url);
    const sidebars = mod?.default ?? mod;
    function flatten(items) {
      const out = [];
      for (const it of items ?? []) {
        if (!it) continue;
        if (typeof it === 'string') out.push(it);
        else if (typeof it === 'object') {
          if (it.type === 'doc' && typeof it.id === 'string') out.push(it.id);
          else if (it.type === 'category' && Array.isArray(it.items))
            out.push(...flatten(it.items));
        }
      }
      return out;
    }
    if (sidebars && sidebars.docs) orderedSlugs = flatten(sidebars.docs);
  } catch {
    orderedSlugs = null;
  }

  const allSlugs = Array.from(slugToPath.keys());
  allSlugs.sort();

  const finalOrder = [];
  const seen = new Set();
  if (orderedSlugs && orderedSlugs.length) {
    for (const s of orderedSlugs) {
      if (slugToPath.has(s) && !seen.has(s)) {
        finalOrder.push(s);
        seen.add(s);
      }
    }
  }
  for (const s of allSlugs) {
    if (!seen.has(s)) finalOrder.push(s);
  }

  const lines = [];
  for (const slug of finalOrder) {
    const file = slugToPath.get(slug);
    const raw = await readTextIfExists(file);
    let title = null;
    if (raw) {
      const fm = matter(raw);
      if (typeof fm.data?.title === 'string' && fm.data.title.trim())
        title = String(fm.data.title).trim();
      else {
        const m = /^#\s+(.+)$/m.exec(fm.content || raw);
        if (m) title = m[1].trim();
      }
    }
    const url = `${homepage}/${routeBase}/${slug}`;
    if (title) lines.push(`- ${title}: ${url}`);
    else lines.push(`- ${url}`);
  }

  if (!lines.length) return null;
  return ['## All Docs Links', ...lines].join('\n');
}

async function buildNavbarLinks() {
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

async function main() {
  const curatedTop = await buildCuratedTop();
  const docs = await buildDocsAggregate();
  const docsLinks = await buildDocsLinks();
  const navbarLinks = await buildNavbarLinks();

  const sections = [navbarLinks];
  if (docsLinks) sections.push(docsLinks);
  sections.push(curatedTop);
  if (docs) sections.push(docs);

  const finalText = sections.join('\n\n').trim() + '\n';
  await fs.writeFile(OUTPUT_PATH, finalText, 'utf8');
  console.log(
    `Wrote ${path.relative(ROOT, OUTPUT_PATH)} (${Buffer.byteLength(finalText, 'utf8')} bytes)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
