import { promises as fs } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawn } from 'child_process';

const ROOT = process.cwd();
const README_PATH = path.join(ROOT, 'README.md');
const DIAGRAM_DIR = path.join(ROOT, 'docs', 'assets', 'diagrams');
const MERMAID_BLOCK_REGEX = /```mermaid\s*([\s\S]*?)```/g;

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function createDiagramId(index: number, code: string): string {
  const hash = crypto.createHash('md5').update(code).digest('hex').slice(0, 10);
  const order = String(index + 1).padStart(2, '0');
  return `diagram-${order}-${hash}`;
}

function getMermaidBinary(): string {
  const bin = process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc';
  return path.join(ROOT, 'node_modules', '.bin', bin);
}

async function renderDiagram(inputPath: string, outputPath: string) {
  const bin = getMermaidBinary();
  await new Promise<void>((resolve, reject) => {
    const child = spawn(bin, ['-i', inputPath, '-o', outputPath, '-b', 'transparent'], {
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Mermaid CLI exited with code ${code}`));
      }
    });
  });
}

function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join(path.posix.sep);
}

function getAltText(index: number): string {
  const defaults = [
    'Prisma Zod Generator feature map (Core vs Pro tiers)',
    'Prisma Zod Generator architecture overview',
  ];
  return defaults[index] ?? `Prisma Zod Generator diagram ${index + 1}`;
}

async function cleanupUnusedDiagrams(expectedFiles: Set<string>) {
  const existing = await fs.readdir(DIAGRAM_DIR).catch(() => [] as string[]);
  const deletions = existing.filter((file) => file.endsWith('.svg') && !expectedFiles.has(file));
  await Promise.all(
    deletions.map((file) => fs.unlink(path.join(DIAGRAM_DIR, file)).catch(() => undefined)),
  );
}

async function main() {
  const readme = await fs.readFile(README_PATH, 'utf8');
  const matches = Array.from(readme.matchAll(MERMAID_BLOCK_REGEX));

  if (matches.length === 0) {
    console.log('No Mermaid diagrams found in README.md');
    return;
  }

  await ensureDir(DIAGRAM_DIR);

  const parts: string[] = [];
  let cursor = 0;
  const generatedFiles = new Set<string>();

  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];
    const [fullBlock, codeContent] = match;
    const blockStart = match.index ?? 0;
    const blockEnd = blockStart + fullBlock.length;

    const diagramCode = `${codeContent.trim()}\n`;
    const diagramId = createDiagramId(index, diagramCode);
    const outputFileName = `${diagramId}.svg`;
    const outputPath = path.join(DIAGRAM_DIR, outputFileName);

    // Write code to temporary file and render diagram
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'mermaid-'));
    const tmpInput = path.join(tmpDir, `${diagramId}.mmd`);
    await fs.writeFile(tmpInput, diagramCode, 'utf8');
    await renderDiagram(tmpInput, outputPath);
    await rm(tmpDir, { recursive: true, force: true });

    generatedFiles.add(outputFileName);

    const snippetStartToken = `<!-- diagram:${diagramId} -->`;
    const snippetEndToken = `<!-- /diagram:${diagramId} -->`;

    let replaceStart = blockStart;
    let replaceEnd = blockEnd;

    const existingSnippetStart = readme.lastIndexOf(snippetStartToken, blockStart);
    const existingSnippetEnd = readme.indexOf(snippetEndToken, blockEnd);

    if (existingSnippetStart !== -1 && existingSnippetEnd !== -1) {
      replaceStart = existingSnippetStart;
      replaceEnd = existingSnippetEnd + snippetEndToken.length;
    } else {
      const genericSnippetStart = readme.lastIndexOf('<!-- diagram:', blockStart);
      const genericSnippetEnd = readme.indexOf('<!-- /diagram:', blockEnd);
      if (genericSnippetStart !== -1 && genericSnippetEnd !== -1) {
        const closingMarkerEnd = readme.indexOf('-->', genericSnippetEnd);
        if (closingMarkerEnd !== -1) {
          replaceStart = genericSnippetStart;
          replaceEnd = closingMarkerEnd + 3;
        }
      }
    }

    while (replaceStart > cursor && /\s/.test(readme[replaceStart - 1])) {
      replaceStart -= 1;
    }

    while (replaceEnd < readme.length && /\s/.test(readme[replaceEnd])) {
      replaceEnd += 1;
    }

    parts.push(readme.slice(cursor, replaceStart));

    const relativePath = toPosix(path.relative(ROOT, path.join(DIAGRAM_DIR, outputFileName)));
    const altText = getAltText(index);
    const mermaidBlock = `\`\`\`mermaid\n${diagramCode}\`\`\``;

    let snippet = `${snippetStartToken}
<p align="center">
  <img src="${relativePath}" alt="${altText}" width="960" />
</p>
<details data-mermaid-source>
  <summary>View Mermaid source</summary>

${mermaidBlock}
</details>
${snippetEndToken}
`;

    const prior = parts[parts.length - 1] ?? '';
    if (prior && !prior.endsWith('\n')) {
      snippet = `\n${snippet}`;
    }

    if (!snippet.endsWith('\n\n')) {
      snippet = `${snippet}\n`;
    }

    parts.push(snippet);
    cursor = replaceEnd;
  }

  parts.push(readme.slice(cursor));

  await fs.writeFile(README_PATH, parts.join(''), 'utf8');
  await cleanupUnusedDiagrams(generatedFiles);

  console.log(`Generated ${generatedFiles.size} diagram(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
