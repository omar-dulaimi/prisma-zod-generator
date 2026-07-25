import { existsSync } from 'fs';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const PRO_BASE = join(__dirname, '..', 'src', 'pro', 'core', 'ProFeatureBase.ts');
const proAvailable = existsSync(PRO_BASE);

/**
 * ProFeatureBase.getEnabledModels() was a `// TODO` that returned every model in
 * the schema, and the Pro CLI passed `{}` as the generator config, so no pack
 * could be told to skip a model — join tables and secret-bearing models got
 * endpoints, forms and SDK methods regardless. All nine packs route their model
 * loop through this one method, so honouring the config here governs all of them.
 *
 * Skipped when the private submodule is absent (plain CI and forks).
 */
describe.skipIf(!proAvailable)('Pro model filtering', () => {
  async function makeFeature(generatorConfig: unknown, modelNames: string[]) {
    const { ProFeatureBase } = await import('../src/pro/core/ProFeatureBase');

    class TestFeature extends ProFeatureBase {
      protected getFeatureName(): string {
        return 'policies';
      }
      protected async generateFeature(): Promise<void> {}
      // Expose the protected helpers for assertion.
      public models() {
        return this.getEnabledModels();
      }
      public enabled(name: string) {
        return this.isModelEnabled(name);
      }
      public reportError(message: string) {
        this.logError(message);
      }
      public reportWarning(message: string) {
        this.logWarning(message);
      }
    }

    const models = modelNames.map((name) => ({ name, fields: [], dbName: null, primaryKey: null }));
    const context = {
      dmmf: { datamodel: { models, enums: [] }, schema: {}, mappings: {} },
      models,
      enums: [],
      generatorConfig,
      schemaPath: '/tmp/schema.prisma',
      outputPath: '/tmp/out',
      prismaClientPath: '@prisma/client',
      provider: 'postgresql',
    };

    return new TestFeature(context as never);
  }

  it('includes every model when no model config is given', async () => {
    const feature = await makeFeature({}, ['Organization', 'Member', 'Project']);
    expect(feature.models().map((m) => m.name)).toEqual(['Organization', 'Member', 'Project']);
  });

  it('excludes a model marked enabled: false', async () => {
    const feature = await makeFeature({ models: { Member: { enabled: false } } }, [
      'Organization',
      'Member',
      'Project',
    ]);

    expect(feature.models().map((m) => m.name)).toEqual(['Organization', 'Project']);
    expect(feature.enabled('Member')).toBe(false);
    expect(feature.enabled('Project')).toBe(true);
  });

  it('treats an explicit enabled: true and an absent entry alike', async () => {
    const feature = await makeFeature({ models: { Organization: { enabled: true }, Member: {} } }, [
      'Organization',
      'Member',
      'Project',
    ]);

    expect(feature.models().map((m) => m.name)).toEqual(['Organization', 'Member', 'Project']);
  });

  it('does not throw when generatorConfig has no models key', async () => {
    const feature = await makeFeature(undefined, ['Organization']);
    expect(feature.models().map((m) => m.name)).toEqual(['Organization']);
  });

  it('can exclude every model', async () => {
    const feature = await makeFeature(
      { models: { Organization: { enabled: false }, Member: { enabled: false } } },
      ['Organization', 'Member'],
    );

    expect(feature.models()).toEqual([]);
  });

  /**
   * Prisma runs a generator as a child process over JSON-RPC and does not relay its
   * stderr, so anything written there is invisible to the person running
   * `prisma generate`. A diagnostic nobody can see is the same as no diagnostic.
   */
  describe('diagnostics reach the user', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    async function capture(emit: (feature: Awaited<ReturnType<typeof makeFeature>>) => void) {
      const stdout: string[] = [];
      const stderr: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((...args) => stdout.push(args.join(' ')));
      vi.spyOn(console, 'error').mockImplementation((...args) => stderr.push(args.join(' ')));

      emit(await makeFeature({}, ['Organization']));

      return { stdout: stdout.join('\n'), stderr: stderr.join('\n') };
    }

    it('writes warnings where Prisma will show them', async () => {
      const { stdout, stderr } = await capture((feature) => feature.reportWarning('heads up'));

      expect(stdout).toContain('heads up');
      expect(stderr).not.toContain('heads up');
    });

    it('writes errors where Prisma will show them', async () => {
      const { stdout, stderr } = await capture((feature) => feature.reportError('it broke'));

      expect(stdout).toContain('it broke');
      expect(stderr).not.toContain('it broke');
    });
  });
});
