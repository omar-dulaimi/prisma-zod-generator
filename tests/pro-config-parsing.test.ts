import type { GeneratorOptions } from '@prisma/generator-helper';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { parseProConfig } from '../src/cli/pzg-pro-generator';

/**
 * How Pro decides which packs to run, and where it reads that decision from.
 *
 * This existed only as a manual check, and the thing it guards is easy to break without noticing:
 * the core generator takes its JSON config as `config = "./zod-generator.config.json"`, Pro took it
 * as `configPath`, and writing the core spelling produced no error at all — the flags were simply
 * never read and the run reported "No features enabled". A silent no-op is the worst outcome for a
 * paid feature, so both spellings are now accepted and both are asserted here.
 */
describe('Pro generator config', () => {
  let dir: string;

  /** The narrow slice of GeneratorOptions that parseProConfig actually reads. */
  const optionsWith = (generatorConfig: Record<string, unknown>) =>
    ({
      schemaPath: join(dir, 'schema.prisma'),
      generator: { config: generatorConfig, output: { value: join(dir, 'out') } },
    }) as unknown as GeneratorOptions;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'pzg-pro-config-'));
    writeFileSync(
      join(dir, 'flags.json'),
      JSON.stringify({ enablePolicies: true, enableFactories: true }),
    );
    writeFileSync(join(dir, 'other.json'), JSON.stringify({ enableSDK: true }));
    writeFileSync(join(dir, 'broken.json'), '{ not json');
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe('where the output goes', () => {
    /**
     * `output` on the generator block was ignored. The CLI read only its own `outputPath` config key,
     * falling back to `<schemaDir>/generated/pro` — while Prisma printed "Generated PZG Pro Generator
     * to ./pro", the directory from the block, which contained nothing. Found by running the real CLI
     * with an output path other than the one earlier tests happened to use.
     *
     * The core generator has always read `options.generator.output` (src/prisma-generator.ts).
     */
    const withOutput = (
      output: string | undefined,
      generatorConfig: Record<string, unknown> = {},
    ) =>
      ({
        schemaPath: join(dir, 'schema.prisma'),
        generator: {
          config: generatorConfig,
          ...(output === undefined ? {} : { output: { value: output, fromEnvVar: null } }),
        },
      }) as unknown as GeneratorOptions;

    it('honours the generator block’s output', async () => {
      const config = await parseProConfig(withOutput(join(dir, 'block-output')));

      expect(config.outputPath).toBe(join(dir, 'block-output'));
    });

    it('lets an explicit outputPath win, since it is the more specific instruction', async () => {
      const config = await parseProConfig(
        withOutput(join(dir, 'block-output'), { outputPath: join(dir, 'explicit') }),
      );

      expect(config.outputPath).toBe(join(dir, 'explicit'));
    });

    it('falls back to generated/pro beside the schema when neither is given', async () => {
      const config = await parseProConfig(withOutput(undefined));

      expect(config.outputPath).toBe(join(dir, 'generated', 'pro'));
    });
  });

  it('reads flags from a file named by configPath', async () => {
    const config = await parseProConfig(optionsWith({ configPath: './flags.json' }));

    expect(config.enablePolicies).toBe(true);
    expect(config.enableFactories).toBe(true);
    expect(config.enableSDK).toBe(false);
  });

  it('accepts `config` as an alias, because that is the core generator’s spelling', async () => {
    const config = await parseProConfig(optionsWith({ config: './flags.json' }));

    expect(config.enablePolicies).toBe(true);
    expect(config.enableFactories).toBe(true);
  });

  it('prefers configPath when both are given', async () => {
    // `configPath` is the documented key, so it wins rather than the alias.
    const config = await parseProConfig(
      optionsWith({ configPath: './flags.json', config: './other.json' }),
    );

    expect(config.enablePolicies).toBe(true);
    expect(config.enableSDK).toBe(false);
  });

  it('reads flags written directly in the generator block', async () => {
    const config = await parseProConfig(optionsWith({ enableServerActions: 'true' }));

    expect(config.enableServerActions).toBe(true);
  });

  it('enables nothing when neither key is present', async () => {
    const config = await parseProConfig(optionsWith({}));

    expect(Object.values(config).some((value) => value === true)).toBe(false);
  });

  it('reports an unreadable config on stdout and enables nothing', async () => {
    // stdout, not stderr: Prisma swallows a generator's stderr on the success path, and this
    // failure does not abort the run — so on stderr the warning would never reach anyone.
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const config = await parseProConfig(optionsWith({ configPath: './broken.json' }));

    expect(Object.values(config).some((value) => value === true)).toBe(false);
    const printed = log.mock.calls.flat().join('\n');
    // Naming the file is the difference between a fixable message and a shrug.
    expect(printed).toContain('broken.json');
    expect(error).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('reports a missing config file rather than failing silently', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await parseProConfig(optionsWith({ configPath: './does-not-exist.json' }));

    expect(log.mock.calls.flat().join('\n')).toContain('does-not-exist.json');

    vi.restoreAllMocks();
  });
});
