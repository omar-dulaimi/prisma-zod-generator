/**
 * JSON validation helper utilities
 * Exposed for consumers who want to build custom schemas mirroring
 * the generator's internal depth validation logic.
 */

/**
 * Returns a Zod refinement snippet enforcing maximum JSON nesting depth.
 * The string begins with a leading dot so it can be concatenated onto an
 * existing base schema (e.g. `z.unknown()` or `z.any()`).
 *
 * Example:
 *   const schema = z.unknown() + jsonMaxDepthRefinement(5)
 *
 * Note: This mirrors the generator logic (typed recursive helper, empty object guard).
 */
export function jsonMaxDepthRefinement(maxDepth: number): string {
  if (maxDepth <= 0) return '';
  return `.refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > ${maxDepth}) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= ${maxDepth}; }, "JSON nesting depth exceeds maximum of ${maxDepth}")`;
}

/** Compose both structure and depth checks (if you want them together). */
export function jsonStructureAndDepthRefinement(options: {
  maxDepth?: number;
  enforceSerializable?: boolean;
}): string {
  const parts: string[] = [];
  if (options.enforceSerializable) {
    parts.push(
      '.refine((val) => { try { JSON.stringify(val); return true; } catch { return false; } }, "Must be valid JSON serializable data")',
    );
  }
  if (options.maxDepth && options.maxDepth > 0) {
    parts.push(jsonMaxDepthRefinement(options.maxDepth));
  }
  return parts.join('');
}
