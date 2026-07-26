import { describe, expect, it } from 'vitest';
import {
  GeneratorOptionError,
  generatorOptionsToConfigOverrides,
  getLegacyMigrationSuggestions,
  isLegacyUsage,
  parseGeneratorOptions,
  validateGeneratorOptions,
} from '../src/config/generator-options';

/**
 * This module turns the generator block into typed options, so it is the first thing a
 * misconfigured schema meets — and Prisma hands every value over as a string, which makes
 * `minimal = true` and `minimal = "true"` indistinguishable here. It had no dedicated test.
 */
describe('generator block options', () => {
  describe('booleans', () => {
    it('accepts the string forms Prisma passes, including odd casing and spacing', () => {
      // Prisma stringifies generator-block values, so these are what actually arrive.
      expect(parseGeneratorOptions({ minimal: 'true' }).minimal).toBe(true);
      expect(parseGeneratorOptions({ minimal: 'false' }).minimal).toBe(false);
      expect(parseGeneratorOptions({ minimal: 'TRUE' }).minimal).toBe(true);
      expect(parseGeneratorOptions({ minimal: ' true ' }).minimal).toBe(true);
    });

    it('rejects anything else with the offending value in the message', () => {
      // A silent falsy fallback here would look like the option being ignored.
      expect(() => parseGeneratorOptions({ minimal: 'yes' })).toThrow(GeneratorOptionError);
      expect(() => parseGeneratorOptions({ minimal: 'yes' })).toThrow(/must be "true" or "false"/);
      expect(() => parseGeneratorOptions({ minimal: 'yes' })).toThrow(/got "yes"/);
      expect(() => parseGeneratorOptions({ minimal: '1' })).toThrow(GeneratorOptionError);
      expect(() => parseGeneratorOptions({ minimal: '' })).toThrow(GeneratorOptionError);
    });

    it('names the option that was wrong, not just the value', () => {
      try {
        parseGeneratorOptions({ useMultipleFiles: 'nope' });
        expect.unreachable('should have thrown');
      } catch (error) {
        const err = error as GeneratorOptionError;
        expect(err.optionName).toBe('useMultipleFiles');
        expect(err.optionValue).toBe('nope');
        expect(err.message).toContain('useMultipleFiles');
      }
    });
  });

  describe('variants list', () => {
    it('splits, trims and de-duplicates', () => {
      expect(parseGeneratorOptions({ variants: 'pure, input , pure' }).variants).toEqual([
        'pure',
        'input',
      ]);
    });

    it('rejects an unknown variant and lists the valid ones', () => {
      // The whole value is rejected rather than the unknown entry being dropped, so a typo
      // cannot silently halve the output.
      expect(() => parseGeneratorOptions({ variants: 'pure,pureModels' })).toThrow(
        /Invalid variants: pureModels/,
      );
      expect(() => parseGeneratorOptions({ variants: 'pure,pureModels' })).toThrow(
        /pure, input, result/,
      );
    });
  });

  it('keeps the raw block so later stages can read keys this parser does not model', () => {
    const options = parseGeneratorOptions({ minimal: 'true', somethingElse: 'x' });
    expect(options.raw).toEqual({ minimal: 'true', somethingElse: 'x' });
  });

  describe('error help', () => {
    it('tells the user what the option expects', () => {
      const error = new GeneratorOptionError('config', 42, 'must be a string');
      const help = error.getUserFriendlyMessage();

      expect(help).toContain('config');
      expect(help).toContain('42');
      // Help that does not show the expected form is not help.
      expect(help).toMatch(/Expected:/);
    });
  });

  describe('legacy usage', () => {
    it('is not reported for a config-file setup', () => {
      expect(isLegacyUsage(parseGeneratorOptions({ config: './zod.json' }))).toBe(false);
    });

    it('offers a migration suggestion when legacy options are in use', () => {
      const options = parseGeneratorOptions({ minimal: 'true', variants: 'pure' });
      if (isLegacyUsage(options)) {
        expect(getLegacyMigrationSuggestions(options).length).toBeGreaterThan(0);
      }
    });
  });

  it('translates generator options into config overrides', () => {
    const overrides = generatorOptionsToConfigOverrides(
      parseGeneratorOptions({ minimal: 'true', useMultipleFiles: 'false' }),
    );

    expect(overrides.mode).toBe('minimal');
    expect(overrides.useMultipleFiles).toBe(false);
  });

  describe('validateGeneratorOptions', () => {
    it('accepts a plain config-file setup', () => {
      expect(() =>
        validateGeneratorOptions(parseGeneratorOptions({ config: './zod.json' })),
      ).not.toThrow();
    });

    it('does not reject minimal mode combined with variants', () => {
      // It only logs guidance for variants that make little sense in minimal mode; making
      // that fatal would break working setups.
      expect(() =>
        validateGeneratorOptions(parseGeneratorOptions({ minimal: 'true', variants: 'result' })),
      ).not.toThrow();
    });
  });
});
