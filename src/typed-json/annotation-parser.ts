/**
 * Parser for prisma-json-types-generator (PJTG) field annotations.
 *
 * PJTG carries two forms in a Prisma triple-slash comment:
 *
 *   /// [TypeName]       a reference to `<namespace>.TypeName`
 *   /// ![<ts type>]     an inline TypeScript type
 *
 * This module only *recognises* them. It converts nothing and emits nothing;
 * see `ts-type-to-zod.ts` for conversion and `resolver.ts` for the public API.
 *
 * The recognition rules are deliberately strict. A false positive here means a
 * generated schema built from prose, which would reject valid production data
 * at runtime. A false negative only means today's untyped behaviour is kept.
 * So an annotation must own its line: leading and trailing whitespace is fine,
 * anything else is not. That rejects markdown links `[text](url)`, markdown
 * images `![alt](url)`, prose in brackets, and unbalanced brackets.
 */

/** Which of PJTG's two forms was found. */
export type PjtgAnnotationKind = 'namespace-ref' | 'inline-type';

export interface PjtgAnnotation {
  kind: PjtgAnnotationKind;
  /**
   * For `namespace-ref`, the bare type name (`WorkflowNode`).
   * For `inline-type`, the TypeScript type text with the outer `![` `]` removed.
   */
  value: string;
  /** The annotation exactly as it appeared, e.g. `[WorkflowNode]` or `![1 | 2]`. */
  raw: string;
  /** Zero-based index of the documentation line the annotation starts on. */
  line: number;
}

export interface PjtgAnnotationParseResult {
  /** The single annotation found, or null when there is none or more than one. */
  annotation: PjtgAnnotation | null;
  /** True when the documentation carries any `@zod.` annotation. */
  hasZodAnnotations: boolean;
  /** True when `@zod...custom.use(...)` is present, which replaces the base schema and wins. */
  hasZodCustomUse: boolean;
  /** True when `@zod.custom({ ... })` is present, which also replaces the base schema. */
  hasZodCustom: boolean;
  /** Non-fatal diagnostics worth surfacing to the user. */
  warnings: string[];
  /** The documentation with every recognised annotation line removed. */
  strippedDocumentation: string;
}

/** A JavaScript/TypeScript identifier, which is all `[TypeName]` may contain. */
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const ZOD_ANNOTATION = /@zod\s*\./i;
const ZOD_MARKER = /@zod\b/i;
const ZOD_CUSTOM_USE = /\.\s*custom\s*\.\s*use\s*\(/;
const ZOD_CUSTOM_OBJECT = /@zod\s*\.\s*custom\s*\(/i;

const EMPTY_RESULT: PjtgAnnotationParseResult = Object.freeze({
  annotation: null,
  hasZodAnnotations: false,
  hasZodCustomUse: false,
  hasZodCustom: false,
  warnings: Object.freeze([]) as unknown as string[],
  strippedDocumentation: '',
});

/**
 * Find the index of the bracket closing the one at `open`.
 *
 * Nesting of `[]`, `{}` and `()` is tracked, and string literals are skipped
 * wholesale so that a bracket or quote inside `'a|b'` cannot unbalance the scan.
 * Returns -1 when the brackets do not balance or a closer arrives out of order.
 */
function findMatchingBracket(text: string, open: number): number {
  const stack: string[] = [];
  for (let i = open; i < text.length; i++) {
    const char = text[i];

    if (char === "'" || char === '"' || char === '`') {
      const end = skipStringLiteral(text, i);
      if (end < 0) return -1;
      i = end;
      continue;
    }

    if (char === '[' || char === '{' || char === '(') {
      stack.push(char);
      continue;
    }

    if (char === ']' || char === '}' || char === ')') {
      const expected = char === ']' ? '[' : char === '}' ? '{' : '(';
      if (stack[stack.length - 1] !== expected) return -1;
      stack.pop();
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

/** Index of the closing quote for the literal starting at `start`, or -1 if unterminated. */
function skipStringLiteral(text: string, start: number): number {
  const quote = text[start];
  for (let i = start + 1; i < text.length; i++) {
    const char = text[i];
    if (char === '\\') {
      i++;
      continue;
    }
    if (char === quote) return i;
  }
  return -1;
}

interface Candidate {
  annotation: PjtgAnnotation;
  /** Zero-based index of the last documentation line the annotation occupies. */
  endLine: number;
}

/**
 * Parse a field's `documentation` for a PJTG annotation.
 *
 * Never throws. When the documentation is ambiguous (two different annotations)
 * the result carries a warning and no annotation, so the caller falls back to
 * today's behaviour rather than picking one.
 */
export function parsePjtgAnnotation(
  documentation: string | undefined | null,
): PjtgAnnotationParseResult {
  if (!documentation || documentation.trim() === '') {
    return { ...EMPTY_RESULT, warnings: [] };
  }

  const text = documentation.replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const warnings: string[] = [];
  const candidates: Candidate[] = [];
  const annotationLines = new Set<number>();

  // Offset of the first character of each line, so bracket matching can run
  // across the whole text while candidates are still anchored to line starts.
  const lineStarts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + 1;
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const leading = line.length - line.trimStart().length;
    const start = lineStarts[lineIndex] + leading;

    const bang = text[start] === '!' && text[start + 1] === '[';
    const openIndex = bang ? start + 1 : start;
    if (text[openIndex] !== '[') continue;

    const closeIndex = findMatchingBracket(text, openIndex);
    if (closeIndex < 0) {
      // Only complain about the `![` form. A stray `[` is far more likely to be
      // prose, and warning on prose trains people to ignore warnings.
      if (bang) {
        warnings.push(
          `Ignoring what looks like a PJTG annotation on line ${lineIndex + 1}: unbalanced brackets in "${line.trim()}".`,
        );
      }
      continue;
    }

    // The annotation must run to the end of its line. This is what rejects
    // markdown links `[text](url)` and markdown images `![alt](url)`, both of
    // which balance perfectly but are followed by a parenthesised group.
    const endLine = lineIndexOf(lineStarts, closeIndex);
    const tail = text.slice(closeIndex + 1, lineStarts[endLine] + lines[endLine].length);
    if (tail.trim() !== '') continue;

    const raw = text.slice(start, closeIndex + 1);
    const inner = text.slice(openIndex + 1, closeIndex).trim();

    if (bang) {
      if (inner === '') {
        warnings.push(
          `Ignoring an empty PJTG annotation "![]" on line ${lineIndex + 1}: there is no type to convert.`,
        );
        continue;
      }
      candidates.push({
        annotation: { kind: 'inline-type', value: inner, raw, line: lineIndex },
        endLine,
      });
    } else {
      // `[anything that is not a bare identifier]` is prose, not an annotation.
      if (!IDENTIFIER.test(inner)) continue;
      candidates.push({
        annotation: { kind: 'namespace-ref', value: inner, raw, line: lineIndex },
        endLine,
      });
    }

    for (let i = lineIndex; i <= endLine; i++) annotationLines.add(i);
    lineIndex = endLine;
  }

  const distinct = new Set(candidates.map((c) => `${c.annotation.kind}:${c.annotation.value}`));
  let annotation: PjtgAnnotation | null = null;
  if (distinct.size === 1) {
    annotation = candidates[0].annotation;
  } else if (distinct.size > 1) {
    warnings.push(
      `Ignoring PJTG annotations: found more than one on the same field (${candidates
        .map((c) => c.annotation.raw)
        .join(
          ', ',
        )}). Remove all but one; guessing which was meant risks generating the wrong schema.`,
    );
  }

  const strippedDocumentation = lines
    .filter((_, index) => !annotationLines.has(index))
    .join('\n')
    .trim();

  return {
    annotation,
    hasZodAnnotations: ZOD_ANNOTATION.test(text),
    hasZodCustomUse: ZOD_MARKER.test(text) && ZOD_CUSTOM_USE.test(text),
    hasZodCustom: ZOD_CUSTOM_OBJECT.test(text),
    warnings,
    strippedDocumentation,
  };
}

/** Zero-based line index containing `offset`. */
function lineIndexOf(lineStarts: number[], offset: number): number {
  let index = 0;
  while (index + 1 < lineStarts.length && lineStarts[index + 1] <= offset) index++;
  return index;
}

/**
 * Cheap yes/no for whether a field carries a PJTG annotation.
 *
 * Always agrees with `parsePjtgAnnotation(...).annotation !== null`.
 */
export function detectPjtgAnnotation(documentation: string | undefined | null): boolean {
  if (!documentation) return false;
  // Fast reject: an annotation always begins a line with `[` or `![`.
  if (!/(^|\n)[^\S\n]*!?\[/.test(documentation.replace(/\r\n/g, '\n'))) return false;
  return parsePjtgAnnotation(documentation).annotation !== null;
}
