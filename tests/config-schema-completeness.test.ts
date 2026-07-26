import { describe, expect, it } from 'vitest';
import { ConfigurationSchema } from '../src/config/schema';
import { validateConfiguration } from '../src/config/validator';

/**
 * `ConfigurationSchema` sets `additionalProperties: false`, so a key it does not declare
 * is not merely un-suggested by an editor — it is rejected. And the docs tell people to
 * run this validator in CI (config/precedence.md), which means a documented, working
 * configuration failed their build.
 *
 * Five keys were in that position: the four dual-export keys documented on
 * config/dual-exports.md and `minimalOperations` from config/modes.md. All five are read
 * at generate time and all five were absent from the schema.
 */
describe('published config schema', () => {
  const documentedKeys = [
    'exportTypedSchemas',
    'exportZodSchemas',
    'typedSchemaSuffix',
    'zodSchemaSuffix',
    'minimalOperations',
  ] as const;

  const properties = (ConfigurationSchema.properties ?? {}) as Record<string, unknown>;

  it('rejects unknown properties, which is why completeness matters', () => {
    expect(ConfigurationSchema.additionalProperties).toBe(false);
  });

  it.each(documentedKeys)('declares %s', (key) => {
    expect(Object.keys(properties)).toContain(key);
  });

  it('accepts a config using every documented key', () => {
    const result = validateConfiguration({
      exportTypedSchemas: true,
      exportZodSchemas: true,
      typedSchemaSuffix: 'Schema',
      zodSchemaSuffix: 'ZodSchema',
      minimalOperations: ['findMany', 'create'],
    });

    const messages = result.errors.map((e) => e.message);
    expect(messages.filter((m) => /Unknown property/.test(m))).toEqual([]);
    expect(result.valid, messages.join('; ')).toBe(true);
  });

  /**
   * `variants` accepts two documented forms. Only the object one was declared, so a
   * config using array-based custom variants failed with "must be object" — listed as a
   * known gap on the JSON Schema IntelliSense page.
   */
  it('accepts both documented forms of variants', () => {
    const objectForm = validateConfiguration({ variants: { pure: { enabled: true } } });
    expect(objectForm.valid, objectForm.errors.map((e) => e.message).join('; ')).toBe(true);

    const arrayForm = validateConfiguration({
      variants: [
        { name: 'Api', suffix: 'Api', exclude: ['password'] },
        { name: 'Admin', transformOptionalToRequired: true, removeValidation: true },
      ],
    });
    expect(arrayForm.valid, arrayForm.errors.map((e) => e.message).join('; ')).toBe(true);
  });

  it('still rejects a genuinely unknown key', () => {
    // Completeness must not come from loosening additionalProperties.
    const result = validateConfiguration({ notARealOption: true } as never);
    expect(result.valid).toBe(false);
  });

  /**
   * The gap existed because nothing tied the schema to the interface. Every optional key
   * on GeneratorConfig should be declared, so the next key added to the interface fails
   * here rather than in a user's CI.
   */
  it('declares every key on the GeneratorConfig interface', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');

    const source = readFileSync(join(__dirname, '..', 'src', 'config', 'parser.ts'), 'utf-8');
    const body = source.slice(
      source.indexOf('export interface GeneratorConfig {'),
      // The interface ends at the first line that closes it at column 0.
      source.indexOf('\n}', source.indexOf('export interface GeneratorConfig {')),
    );

    const interfaceKeys = [...body.matchAll(/^ {2}(\w+)\??:/gm)].map((m) => m[1]);
    expect(interfaceKeys.length).toBeGreaterThan(20);

    const missing = interfaceKeys.filter((key) => !(key in properties));
    expect(missing, `not declared in ConfigurationSchema: ${missing.join(', ')}`).toEqual([]);
  });
});
