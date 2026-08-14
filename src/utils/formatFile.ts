import path from 'path';
import prettier from 'prettier';
import type { BuiltInParserName } from 'prettier';

const PARSER_BY_EXTENSION: Record<string, BuiltInParserName> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.js': 'babel',
  '.jsx': 'babel',
  '.mjs': 'babel',
  '.cjs': 'babel',
  '.json': 'json',
  '.md': 'markdown',
  '.mdx': 'mdx',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.css': 'css',
  '.scss': 'scss',
  '.html': 'html',
  '.graphql': 'graphql',
};

/**
 * Pick a Prettier parser from the target file name.
 *
 * Returns `undefined` for formats Prettier has no parser for (`.sql`, `.py`,
 * `.txt`, …). Callers must treat that as "write this content verbatim" — it is
 * not an error. Historically every write was parsed as TypeScript, so any
 * non-TS artefact threw and was dropped by writeFileSafely's catch.
 */
export function parserForFile(filePath: string): BuiltInParserName | undefined {
  const match = /\.[^.\\/]+$/.exec(filePath);
  return match ? PARSER_BY_EXTENSION[match[0].toLowerCase()] : undefined;
}

/**
 * Format `content` with Prettier.
 *
 * `filePath` selects the parser and locates the user's Prettier config. When it is
 * omitted the content is parsed as TypeScript, preserving the original behaviour for
 * the core schema writers. Content that Prettier cannot parse is returned unchanged
 * rather than throwing, so a formatting problem can never cost the caller its file.
 */
export const formatFile = async (content: string, filePath?: string): Promise<string> => {
  const parser = filePath === undefined ? 'typescript' : parserForFile(filePath);
  if (!parser) {
    return content;
  }

  // `resolveConfig` takes the path of the *file being formatted* and searches upward
  // from its directory. It used to be handed `process.cwd()`, which Prettier treats as
  // a file name and so searches from the parent of - meaning the project's own
  // `.prettierrc` was skipped and only an ancestor's config could ever be found.
  //
  // Since `prisma generate` runs at the project root, that was every project: the
  // user's config was silently ignored and the defaults below applied instead. It also
  // made output depend on where the project sat on disk, because a repo nested under a
  // directory that happened to hold a `.prettierrc` picked that one up.
  //
  // Passing the target file also lets a per-directory config over the output folder
  // apply, which is what Prettier itself would do for that file.
  const configTarget = filePath ?? path.join(process.cwd(), 'index.ts');
  const resolved = await prettier.resolveConfig(configTarget);
  const formatOptions = resolved ?? {
    trailingComma: 'all' as const,
    tabWidth: 2,
    printWidth: 80,
    bracketSpacing: true,
    semi: true,
    singleQuote: true,
    useTabs: false,
  };

  return prettier.format(content, { ...formatOptions, parser });
};
