import { describe, expect, it } from 'vitest';
import { DefaultConfigurationManager } from '../src/config/defaults';
import { parseJsonConfig } from '../src/config/parser';
import { ConfigurationSchema } from '../src/config/schema';
import {
  DEFAULT_TYPED_JSON_NAMESPACE,
  DEFAULT_TYPED_JSON_NAMESPACE_OUTPUT,
  DEFAULT_TYPED_JSON_SCHEMA_SUFFIX,
  resolveTypedJsonConfig,
  resolveTypedJsonType,
} from '../src/config/typed-json';
import { validateConfiguration } from '../src/config/validator';
import Transformer from '../src/transformer';

/**
 * `typedJson` teaches PZG to read prisma-json-types-generator's own annotations
 * (`/// [TypeName]`, `/// ![<ts type>]`) and turn them into real Zod schemas.
 *
 * The contract that outranks the feature: a configuration that omits `typedJson`
 * must behave exactly as 3.0.0 did. So nothing here may put `typedJson` into the
 * merged default configuration, and `resolveTypedJsonConfig` must answer "off"
 * rather than "on with defaults" when the key is absent.
 */
describe('typedJson configuration', () => {
  const fullBlock = {
    schemaModule: './json-types',
    schemaSuffix: 'Schema',
    namespace: 'PrismaJson',
    emitNamespace: false,
    namespaceOutput: './prisma-json-types.d.ts',
    map: { Weird: 'z.custom<unknown>()' },
  };

  describe('declaration', () => {
    it('is declared in the published JSON Schema', () => {
      const properties = (ConfigurationSchema.properties ?? {}) as Record<string, unknown>;
      expect(Object.keys(properties)).toContain('typedJson');
    });

    it('accepts every documented key', () => {
      const result = validateConfiguration({ typedJson: fullBlock });
      expect(result.valid, result.errors.map((e) => e.message).join('; ')).toBe(true);
    });

    /**
     * `additionalProperties: false` at the root is what makes an undeclared key an
     * error rather than a no-op, and the nested object needs the same treatment or a
     * typo inside `typedJson` silently does nothing.
     */
    it('rejects an unknown key inside the block', () => {
      const result = validateConfiguration({
        typedJson: { schemaModule: './json-types', schemaSufix: 'Schema' },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.map((e) => e.message).join('; ')).toMatch(/schemaSufix/);
    });

    it.each([
      ['emitNamespace as a string', { emitNamespace: 'yes' }],
      ['schemaSuffix as a number', { schemaSuffix: 7 }],
      ['map values that are not expressions', { map: { Foo: 5 } }],
      ['a namespace that is not an identifier', { namespace: 'Prisma Json' }],
      ['an empty schemaModule', { schemaModule: '' }],
    ])('rejects %s', (_label, block) => {
      const result = validateConfiguration({ typedJson: block });
      expect(result.valid).toBe(false);
    });

    /**
     * A key the schema does not declare is reported as "Ignoring unknown configuration
     * key" when the config file is read, which is the first thing a user sees.
     */
    it('does not warn as an unknown key when parsing a config file', () => {
      const warnings: string[] = [];
      const original = console.warn;
      console.warn = (...args: unknown[]) => {
        warnings.push(args.map(String).join(' '));
      };
      try {
        parseJsonConfig(JSON.stringify({ typedJson: fullBlock }));
      } finally {
        console.warn = original;
      }
      expect(warnings.filter((w) => /typedJson/.test(w))).toEqual([]);
    });
  });

  describe('defaults', () => {
    it('is absent from the merged default configuration', () => {
      const merged = DefaultConfigurationManager.mergeWithDefaults({});
      expect(merged.typedJson).toBeUndefined();
    });

    it('survives the merge when the user supplies it', () => {
      const merged = DefaultConfigurationManager.mergeWithDefaults({
        typedJson: { schemaModule: './json-types' },
      });
      expect(merged.typedJson).toEqual({ schemaModule: './json-types' });
    });

    it('resolves to null when omitted, so nothing downstream can switch on', () => {
      expect(resolveTypedJsonConfig({})).toBeNull();
      expect(resolveTypedJsonConfig(null)).toBeNull();
      expect(resolveTypedJsonConfig(undefined)).toBeNull();
    });

    it('fills in every default when present but empty', () => {
      const resolved = resolveTypedJsonConfig({ typedJson: {} });
      expect(resolved).toEqual({
        schemaModule: undefined,
        schemaSuffix: DEFAULT_TYPED_JSON_SCHEMA_SUFFIX,
        namespace: DEFAULT_TYPED_JSON_NAMESPACE,
        emitNamespace: false,
        namespaceOutput: DEFAULT_TYPED_JSON_NAMESPACE_OUTPUT,
        map: {},
      });
      expect(DEFAULT_TYPED_JSON_SCHEMA_SUFFIX).toBe('Schema');
      expect(DEFAULT_TYPED_JSON_NAMESPACE).toBe('PrismaJson');
      expect(DEFAULT_TYPED_JSON_NAMESPACE_OUTPUT).toBe('./prisma-json-types.d.ts');
    });

    it('keeps an explicitly empty schemaSuffix instead of defaulting it', () => {
      // `[Foo]` -> `Foo` is a legitimate convention; an empty string is not "unset".
      const resolved = resolveTypedJsonConfig({ typedJson: { schemaSuffix: '' } });
      expect(resolved?.schemaSuffix).toBe('');
    });
  });

  describe('threading to the transformer', () => {
    it('reaches the transformer resolved', () => {
      Transformer.setGeneratorConfig({ typedJson: { schemaModule: './json-types' } });
      try {
        const resolved = Transformer.getTypedJsonConfig();
        expect(resolved?.schemaModule).toBe('./json-types');
        expect(resolved?.namespace).toBe('PrismaJson');
        expect(resolved?.emitNamespace).toBe(false);
      } finally {
        Transformer.setGeneratorConfig({});
      }
    });

    it('is null on the transformer when the config omits it', () => {
      Transformer.setGeneratorConfig({ pureModels: true });
      try {
        expect(Transformer.getTypedJsonConfig()).toBeNull();
      } finally {
        Transformer.setGeneratorConfig({});
      }
    });
  });

  /**
   * Section 2 of the design: `map` first, then `<TypeName><schemaSuffix>` from
   * `schemaModule`, then nothing at all. The third branch is the compatibility
   * contract - a schema annotated for PJTG alone keeps generating unchanged.
   */
  describe('resolving [TypeName]', () => {
    it('prefers an explicit map entry', () => {
      const resolved = resolveTypedJsonConfig({
        typedJson: { schemaModule: './json-types', map: { Weird: 'z.custom<unknown>()' } },
      })!;
      expect(resolveTypedJsonType('Weird', resolved)).toEqual({
        kind: 'mapped',
        expression: 'z.custom<unknown>()',
      });
    });

    it('falls back to the module convention', () => {
      const resolved = resolveTypedJsonConfig({
        typedJson: { schemaModule: './json-types' },
      })!;
      expect(resolveTypedJsonType('WorkflowNode', resolved)).toEqual({
        kind: 'module',
        importName: 'WorkflowNodeSchema',
        module: './json-types',
        expression: 'WorkflowNodeSchema',
      });
    });

    it('honours a custom suffix', () => {
      const resolved = resolveTypedJsonConfig({
        typedJson: { schemaModule: 'workflow-types', schemaSuffix: 'Validator' },
      })!;
      expect(resolveTypedJsonType('WorkflowNode', resolved)).toMatchObject({
        kind: 'module',
        importName: 'WorkflowNodeValidator',
      });
    });

    it('reports unresolved rather than guessing when no module is configured', () => {
      const resolved = resolveTypedJsonConfig({ typedJson: {} })!;
      const result = resolveTypedJsonType('WorkflowNode', resolved);
      expect(result.kind).toBe('unresolved');
      expect(result.kind === 'unresolved' && result.reason).toMatch(/schemaModule|map/);
    });

    /**
     * The dangerous shape is a raw `typedJson` block, straight from the user's config,
     * reaching this function without going through `resolveTypedJsonConfig` - which is
     * what an unwary caller writes, and what happened on the first crossing between the
     * annotation reader and this module.
     *
     * Left unguarded it does not merely throw on the missing `map`: with `schemaSuffix`
     * also unset it composes the import name `WorkflowNodeundefined`, an identifier that
     * looks plausible in the emitted file and does not exist in the user's module. The
     * import fails at build time in their project, not here.
     */
    it('applies the defaults itself when handed a raw, unresolved block', () => {
      const raw = { schemaModule: './json-types' };
      expect(resolveTypedJsonType('WorkflowNode', raw)).toEqual({
        kind: 'module',
        importName: 'WorkflowNodeSchema',
        module: './json-types',
        expression: 'WorkflowNodeSchema',
      });
    });

    it('reports unresolved for a type name that is not an identifier', () => {
      const resolved = resolveTypedJsonConfig({ typedJson: { schemaModule: './json-types' } })!;
      const result = resolveTypedJsonType('not a type', resolved);
      expect(result.kind).toBe('unresolved');
    });

    it('ignores a blank map entry rather than emitting an empty expression', () => {
      const resolved = resolveTypedJsonConfig({
        typedJson: { schemaModule: './json-types', map: { Foo: '   ' } },
      })!;
      expect(resolveTypedJsonType('Foo', resolved)).toMatchObject({ kind: 'module' });
    });
  });
});
