import { afterEach, describe, expect, it } from 'vitest';
import {
  mergeSafetyConfigs,
  parseSafetyConfigFromEnvironment,
  parseSafetyConfigFromGeneratorOptions,
  resolveSafetyConfig,
} from '../src/utils/safetyConfigResolver';

/**
 * This resolves the settings that decide whether the generator may delete files while
 * cleaning its output directory, so getting it wrong risks a user's own files. It was the
 * least-covered piece of the core config layer and had no dedicated test.
 */
describe('safety config', () => {
  const savedEnv = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env))
      if (key.startsWith('PRISMA_ZOD_SAFETY')) delete process.env[key];
    Object.assign(process.env, savedEnv);
  });

  describe('levels', () => {
    it('defaults to standard, which permits a handful of user files', () => {
      const resolved = resolveSafetyConfig();

      expect(resolved.level).toBe('standard');
      expect(resolved.enabled).toBe(true);
      expect(resolved.allowDangerousPaths).toBe(false);
      expect(resolved.maxUserFiles).toBe(5);
    });

    it('blocks every user file under strict', () => {
      const resolved = resolveSafetyConfig({ level: 'strict' });

      expect(resolved.maxUserFiles).toBe(0);
      expect(resolved.allowUserFiles).toBe(false);
      expect(resolved.allowDangerousPaths).toBe(false);
    });

    it('opens up dangerous paths and user files under permissive', () => {
      const resolved = resolveSafetyConfig({ level: 'permissive' });

      expect(resolved.allowDangerousPaths).toBe(true);
      expect(resolved.allowUserFiles).toBe(true);
    });

    it('turns everything off at the disabled level', () => {
      // A fourth level exists alongside strict/standard/permissive, and it is the documented
      // way to switch the guard off wholesale.
      const resolved = resolveSafetyConfig({ level: 'disabled' });

      expect(resolved.enabled).toBe(false);
      expect(resolved.skipManifest).toBe(true);
      expect(resolved.maxUserFiles).toBe(Infinity);
    });

    it('rejects an unrecognised level with a message naming the valid ones', () => {
      // This used to throw `Cannot read properties of undefined (reading
      // 'customDangerousPaths')` from spreading a missing preset. It failed closed, which is
      // the right direction for a guard on deleting files, but a typo in `safetyLevel`
      // deserves better than an internal TypeError.
      expect(() => resolveSafetyConfig({ level: 'bogus' as never })).toThrow(/bogus/);
      expect(() => resolveSafetyConfig({ level: 'bogus' as never })).toThrow(
        /strict.*standard.*permissive.*disabled/,
      );
    });
  });

  describe('explicit options', () => {
    it('override the level preset', () => {
      const resolved = resolveSafetyConfig({ level: 'strict', allowDangerousPaths: true });

      expect(resolved.level).toBe('strict');
      expect(resolved.allowDangerousPaths).toBe(true);
      // Untouched keys still come from the preset.
      expect(resolved.maxUserFiles).toBe(0);
    });

    it('can turn the guard off entirely, since that is a documented escape hatch', () => {
      // website/docs/recipes/safety-disable-completely.md
      expect(resolveSafetyConfig({ enabled: false }).enabled).toBe(false);
    });
  });

  describe('generator block', () => {
    it('reads the safety keys and coerces the strings Prisma passes', () => {
      const parsed = parseSafetyConfigFromGeneratorOptions({
        safetyLevel: 'permissive',
        safetyEnabled: 'false',
      });

      expect(parsed.level).toBe('permissive');
      expect(parsed.enabled).toBe(false);
    });

    it('leaves keys absent when the block does not mention them', () => {
      // An absent key must stay absent rather than become `false`, or it would override the
      // level preset with a value the user never wrote.
      expect(parseSafetyConfigFromGeneratorOptions({})).toEqual({});
    });
  });

  describe('environment', () => {
    it('reads the documented variables', () => {
      process.env.PRISMA_ZOD_SAFETY_LEVEL = 'strict';
      process.env.PRISMA_ZOD_SAFETY_ENABLED = 'false';

      const parsed = parseSafetyConfigFromEnvironment();
      expect(parsed.level).toBe('strict');
      expect(parsed.enabled).toBe(false);
    });

    it('returns nothing when none are set', () => {
      expect(parseSafetyConfigFromEnvironment()).toEqual({});
    });
  });

  describe('merging', () => {
    it('lets a later source win per key without wiping the earlier one', () => {
      const merged = mergeSafetyConfigs({ level: 'strict', maxUserFiles: 3 }, { level: 'permissive' });

      expect(merged.level).toBe('permissive');
      expect(merged.maxUserFiles).toBe(3);
    });
  });
});
