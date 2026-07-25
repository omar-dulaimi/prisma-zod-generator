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
 * `filePath` selects the parser. When it is omitted the content is parsed as
 * TypeScript, preserving the original behaviour for the core schema writers.
 * Content that Prettier cannot parse is returned unchanged rather than throwing,
 * so a formatting problem can never cost the caller its file.
 */
export const formatFile = async (content: string, filePath?: string): Promise<string> => {
  const parser = filePath === undefined ? 'typescript' : parserForFile(filePath);
  if (!parser) {
    return content;
  }

  const resolved = await prettier.resolveConfig(process.cwd());
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
