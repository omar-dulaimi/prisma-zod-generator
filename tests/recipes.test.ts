import { promises as fs } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

// Validate every JSON recipe under recipes/ using the config validator

describe('Recipes configuration validity', () => {
  const recipesDir = join(__dirname, '..', 'recipes');

  async function* walk(dir: string): AsyncGenerator<string> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        yield* walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        yield full;
      }
    }
  }

  it('all recipe JSON files should parse and validate', async () => {
    const { validateConfiguration, formatValidationErrors, formatValidationWarnings } =
      await import('../src/config/validator');

    const invalid: Array<{ file: string; errors: string }> = [];
    const warningsCollected: Array<{ file: string; warnings: string }> = [];

    for await (const file of walk(recipesDir)) {
      const content = await fs.readFile(file, 'utf-8');
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        invalid.push({ file, errors: `JSON parse error: ${(e as Error).message}` });
        continue;
      }

      const result = validateConfiguration(parsed);
      if (!result.valid) {
        invalid.push({ file, errors: formatValidationErrors(result.errors) });
      } else if (result.warnings.length > 0) {
        warningsCollected.push({ file, warnings: formatValidationWarnings(result.warnings) });
      }
    }

    // Log warnings to help maintainers tune recipes, but don't fail on warnings
    if (warningsCollected.length > 0) {
      console.warn('\nRecipe validation warnings:');
      for (const w of warningsCollected) {
        console.warn(`- ${w.file}:\n${w.warnings}`);
      }
    }

    if (invalid.length > 0) {
      const details = invalid.map((i) => `\nFile: ${i.file}\n${i.errors}`).join('\n');
      throw new Error(`Some recipe configs are invalid:${details}`);
    }

    expect(invalid.length).toBe(0);
  });
});
