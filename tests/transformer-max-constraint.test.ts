import { describe, expect, it } from 'vitest';
import Transformer from '../src/transformer';

describe('Transformer.replaceAllMaxConstraints', () => {
  const transformer = new Transformer({} as any);
  const apply = (input: string, max: number) =>
    (transformer as unknown as { replaceAllMaxConstraints(str: string, max: number): string })
      .replaceAllMaxConstraints(input, max);

  it('injects max after basic zod constructor', () => {
    const result = apply('z.string().min(1)', 32);
    expect(result).toBe('z.string().max(32).min(1)');
  });

  it('handles already constrained z.iso datetime', () => {
    const result = apply("z.iso.datetime().transform(v => v).min(3)", 128);
    expect(result).toBe('z.iso.datetime().max(128).transform(v => v).min(3)');
  });

  it('strips prior max constraints before inserting', () => {
    const result = apply('z.string().max(20).min(5).max(10)', 64);
    expect(result).toBe('z.string().max(64).min(5)');
  });
});
