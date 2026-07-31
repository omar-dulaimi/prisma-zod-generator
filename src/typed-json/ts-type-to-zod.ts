/**
 * Converts the TypeScript type text carried by a PJTG `![...]` annotation into
 * a Zod expression string.
 *
 * Two rules govern everything here:
 *
 * 1. **Never half-convert.** Any construct outside the documented subset makes
 *    the whole conversion fail with a reason. A wrong Zod schema rejects valid
 *    production data at runtime, which is far worse than an unconverted field.
 *
 * 2. **Never emit the postfix `X.array()` form.** The CRUD emitter appends its
 *    list wrapper only when the expression does not already contain the
 *    substring `.array()`, so an expression carrying it silently loses a
 *    dimension. Arrays are always emitted as `z.array(X)`.
 *
 * The parser is a hand-written recursive-descent parser over a small token
 * stream. It is deliberately not TypeScript's own parser: pulling in the
 * compiler API to read a dozen characters out of a doc comment is not a trade
 * this generator should make, and the supported grammar is tiny.
 */

/** How a bare type reference (`WorkflowNode`) resolves to a Zod expression. */
export type TypeNameResolution = { expression: string } | { error: string };

export interface TsTypeConversionOptions {
  /**
   * Resolve a type reference to a Zod expression. Dotted names such as
   * `PrismaJson.Simple` are passed through whole. Returning `{ error }` makes
   * the whole conversion unconvertible with that error as the reason.
   */
  resolveTypeName?: (name: string) => TypeNameResolution;
  /** Maximum nesting depth before bailing out. Defaults to 32. */
  maxDepth?: number;
}

export interface TsTypeConversionSuccess {
  ok: true;
  /** The Zod expression, e.g. `z.array(z.tuple([z.array(z.number())]))`. */
  expression: string;
  /** Every type reference resolved while converting, in first-seen order. */
  referencedTypeNames: string[];
}

export interface TsTypeConversionFailure {
  ok: false;
  /** Why the type could not be converted. Always a complete sentence fragment. */
  reason: string;
}

export type TsTypeConversionResult = TsTypeConversionSuccess | TsTypeConversionFailure;

const DEFAULT_MAX_DEPTH = 32;

/** Keywords that map straight onto a Zod schema. */
const KEYWORD_SCHEMAS: Record<string, string> = {
  string: 'z.string()',
  number: 'z.number()',
  boolean: 'z.boolean()',
  bigint: 'z.bigint()',
  any: 'z.any()',
  unknown: 'z.unknown()',
  never: 'z.never()',
  true: 'z.literal(true)',
  false: 'z.literal(false)',
};

/** Keywords that are real TypeScript but have no faithful Zod equivalent. */
const REJECTED_KEYWORDS: Record<string, string> = {
  object:
    'the TypeScript `object` type means any non-primitive value, which has no faithful Zod equivalent',
  symbol: 'the `symbol` type has no faithful Zod equivalent here',
  void: 'the `void` type has no faithful Zod equivalent here',
};

const BARE_IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

class ConversionError extends Error {}

function fail(reason: string): never {
  throw new ConversionError(reason);
}

/* -------------------------------------------------------------------------- */
/* Tokenizer                                                                   */
/* -------------------------------------------------------------------------- */

type TokenKind = 'ident' | 'string' | 'number' | 'punct';

interface Token {
  kind: TokenKind;
  /** Identifier text, decoded string value, raw numeric text, or punctuation. */
  value: string;
  start: number;
}

const PUNCTUATION = new Set([
  '|',
  '&',
  '[',
  ']',
  '{',
  '}',
  '(',
  ')',
  ',',
  ';',
  ':',
  '?',
  '.',
  '<',
  '>',
  '=',
  '+',
  '-',
  '*',
  '/',
  '!',
]);

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (char === '`') {
      fail('template literal types are not supported');
    }

    if (char === "'" || char === '"') {
      const { value, end } = readString(text, i);
      tokens.push({ kind: 'string', value, start: i });
      i = end + 1;
      continue;
    }

    if (/[A-Za-z_$]/.test(char)) {
      let j = i + 1;
      while (j < text.length && /[A-Za-z0-9_$]/.test(text[j])) j++;
      tokens.push({ kind: 'ident', value: text.slice(i, j), start: i });
      i = j;
      continue;
    }

    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(text[i + 1] ?? ''))) {
      const end = readNumberEnd(text, i);
      tokens.push({ kind: 'number', value: text.slice(i, end), start: i });
      i = end;
      continue;
    }

    if (text.startsWith('...', i)) {
      tokens.push({ kind: 'punct', value: '...', start: i });
      i += 3;
      continue;
    }

    if (text.startsWith('=>', i)) {
      tokens.push({ kind: 'punct', value: '=>', start: i });
      i += 2;
      continue;
    }

    if (PUNCTUATION.has(char)) {
      tokens.push({ kind: 'punct', value: char, start: i });
      i++;
      continue;
    }

    fail(`unexpected character "${char}"`);
  }

  return tokens;
}

/** Read a quoted literal starting at `start`, returning its decoded value. */
function readString(text: string, start: number): { value: string; end: number } {
  const quote = text[start];
  let value = '';
  for (let i = start + 1; i < text.length; i++) {
    const char = text[i];
    if (char === '\\') {
      const decoded = decodeEscape(text, i);
      value += decoded.value;
      i = decoded.end;
      continue;
    }
    if (char === quote) return { value, end: i };
    if (char === '\n') break;
    value += char;
  }
  fail('unterminated string literal');
}

function decodeEscape(text: string, backslash: number): { value: string; end: number } {
  const char = text[backslash + 1];
  switch (char) {
    case undefined:
      fail('unterminated string literal');
      break;
    case 'n':
      return { value: '\n', end: backslash + 1 };
    case 'r':
      return { value: '\r', end: backslash + 1 };
    case 't':
      return { value: '\t', end: backslash + 1 };
    case 'b':
      return { value: '\b', end: backslash + 1 };
    case 'f':
      return { value: '\f', end: backslash + 1 };
    case 'v':
      return { value: '\v', end: backslash + 1 };
    case '0':
      return { value: '\0', end: backslash + 1 };
    case 'x': {
      const hex = text.slice(backslash + 2, backslash + 4);
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) fail('invalid \\x escape in a string literal');
      return { value: String.fromCharCode(parseInt(hex, 16)), end: backslash + 3 };
    }
    case 'u': {
      if (text[backslash + 2] === '{') {
        const close = text.indexOf('}', backslash + 3);
        if (close < 0) fail('invalid \\u{...} escape in a string literal');
        const hex = text.slice(backslash + 3, close);
        if (!/^[0-9a-fA-F]{1,6}$/.test(hex)) fail('invalid \\u{...} escape in a string literal');
        return { value: String.fromCodePoint(parseInt(hex, 16)), end: close };
      }
      const hex = text.slice(backslash + 2, backslash + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail('invalid \\u escape in a string literal');
      return { value: String.fromCharCode(parseInt(hex, 16)), end: backslash + 5 };
    }
    default:
      // \' \" \\ \/ and anything else: the character stands for itself.
      return { value: char, end: backslash + 1 };
  }
  /* c8 ignore next */
  fail('unterminated string literal');
}

/** End index (exclusive) of the numeric literal starting at `start`. */
function readNumberEnd(text: string, start: number): number {
  let i = start;
  if (text[i] === '0' && /[xXbBoO]/.test(text[i + 1] ?? '')) {
    i += 2;
    while (i < text.length && /[0-9a-fA-F_]/.test(text[i])) i++;
  } else {
    while (i < text.length && /[0-9_]/.test(text[i])) i++;
    if (text[i] === '.') {
      i++;
      while (i < text.length && /[0-9_]/.test(text[i])) i++;
    }
    if (/[eE]/.test(text[i] ?? '')) {
      let j = i + 1;
      if (/[+-]/.test(text[j] ?? '')) j++;
      if (/[0-9]/.test(text[j] ?? '')) {
        i = j;
        while (i < text.length && /[0-9_]/.test(text[i])) i++;
      }
    }
  }
  if (text[i] === 'n') i++;
  return i;
}

/* -------------------------------------------------------------------------- */
/* Output helpers                                                              */
/* -------------------------------------------------------------------------- */

/** Render a string value as a single-quoted JavaScript string literal. */
export function quoteStringLiteral(value: string): string {
  let out = "'";
  for (const char of value) {
    switch (char) {
      case '\\':
        out += '\\\\';
        break;
      case "'":
        out += "\\'";
        break;
      case '\n':
        out += '\\n';
        break;
      case '\r':
        out += '\\r';
        break;
      case '\t':
        out += '\\t';
        break;
      default: {
        const code = char.codePointAt(0)!;
        if (code < 0x20 || code === 0x7f || code === 0x2028 || code === 0x2029) {
          out += `\\u${code.toString(16).padStart(4, '0')}`;
        } else {
          out += char;
        }
      }
    }
  }
  return `${out}'`;
}

/* -------------------------------------------------------------------------- */
/* Parser                                                                      */
/* -------------------------------------------------------------------------- */

interface TypeNode {
  expression: string;
  /** Set only for a direct string-literal type, so unions can become z.enum. */
  literalString?: string;
  isNull?: boolean;
  isUndefined?: boolean;
}

class TypeParser {
  private index = 0;
  private depth = 0;
  readonly referenced: string[] = [];

  constructor(
    private readonly tokens: Token[],
    private readonly maxDepth: number,
    private readonly resolveTypeName?: (name: string) => TypeNameResolution,
  ) {}

  parse(): TypeNode {
    const node = this.parseType();
    const leftover = this.peek();
    if (leftover) this.unexpected(leftover);
    return node;
  }

  /* -- token stream ------------------------------------------------------- */

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.index + offset];
  }

  private next(): Token | undefined {
    return this.tokens[this.index++];
  }

  private isPunct(value: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token?.kind === 'punct' && token.value === value;
  }

  private isIdent(value: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token?.kind === 'ident' && token.value === value;
  }

  private expectPunct(value: string): void {
    if (!this.isPunct(value)) this.unexpected(this.peek());
    this.index++;
  }

  /** Turn an unexpected token into the most specific reason available. */
  private unexpected(token: Token | undefined): never {
    if (!token) fail('unexpected end of type');
    if (token.kind === 'ident' && token.value === 'extends') {
      fail('conditional types are not supported');
    }
    if (token.kind === 'punct' && token.value === '&') {
      fail('intersection types are not supported');
    }
    if (token.kind === 'punct' && token.value === '=>') {
      fail('function types are not supported');
    }
    fail(`unexpected token "${token.value}"`);
  }

  private enter(): void {
    this.depth++;
    if (this.depth > this.maxDepth) fail('the type is nested too deeply to convert');
  }

  private leave(): void {
    this.depth--;
  }

  /* -- grammar ------------------------------------------------------------ */

  /** Type := '|'? Postfix ( '|' Postfix )* */
  private parseType(): TypeNode {
    this.enter();
    try {
      if (this.isPunct('|')) this.index++;

      const members: TypeNode[] = [this.parsePostfix()];
      while (this.isPunct('|')) {
        this.index++;
        members.push(this.parsePostfix());
      }

      return unionOf(members);
    } finally {
      this.leave();
    }
  }

  /** Postfix := Primary ( '[' ']' )* */
  private parsePostfix(): TypeNode {
    let node = this.parsePrimary();
    let suffixes = 0;

    while (this.isPunct('[')) {
      if (!this.isPunct(']', 1)) fail('indexed access types are not supported');
      suffixes++;
      if (this.depth + suffixes > this.maxDepth) {
        fail('the type is nested too deeply to convert');
      }
      this.index += 2;
      node = { expression: `z.array(${node.expression})` };
    }

    return node;
  }

  private parsePrimary(): TypeNode {
    const token = this.peek();
    if (!token) fail('unexpected end of type');

    if (token.kind === 'punct') {
      switch (token.value) {
        case '(':
          return this.parseParenthesized();
        case '{':
          return this.parseObject();
        case '[':
          return this.parseTuple();
        case '-':
          return this.parseNegativeNumber();
        case '...':
          fail('rest elements in a tuple are not supported');
          break;
        default:
          this.unexpected(token);
      }
    }

    if (token.kind === 'string') {
      this.index++;
      return {
        expression: `z.literal(${quoteStringLiteral(token.value)})`,
        literalString: token.value,
      };
    }

    if (token.kind === 'number') {
      this.index++;
      return { expression: `z.literal(${normaliseNumber(token.value)})` };
    }

    return this.parseIdentifier();
  }

  private parseParenthesized(): TypeNode {
    if (this.closesAsFunctionType()) fail('function types are not supported');
    this.expectPunct('(');
    const node = this.parseType();
    this.expectPunct(')');
    return node;
  }

  /** True when the parenthesised group at the cursor is a function parameter list. */
  private closesAsFunctionType(): boolean {
    let depth = 0;
    for (let i = this.index; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      if (token.kind !== 'punct') continue;
      if (token.value === '(') depth++;
      else if (token.value === ')') {
        depth--;
        if (depth === 0) {
          const after = this.tokens[i + 1];
          return after?.kind === 'punct' && after.value === '=>';
        }
      }
    }
    return false;
  }

  private parseNegativeNumber(): TypeNode {
    const number = this.peek(1);
    if (number?.kind !== 'number') this.unexpected(this.peek());
    this.index += 2;
    return { expression: `z.literal(-${normaliseNumber(number.value)})` };
  }

  private parseIdentifier(): TypeNode {
    const token = this.next();
    /* c8 ignore next */
    if (!token) fail('unexpected end of type');
    const name = token.value;

    if (name === 'keyof') fail('`keyof` types are not supported');
    if (name === 'typeof') fail('`typeof` types are not supported');
    if (name === 'infer') fail('`infer` types are not supported');
    if (name === 'new' && (this.isPunct('(') || this.isPunct('<'))) {
      fail('constructor function types are not supported');
    }
    if (name === 'readonly' && this.startsType()) {
      // `readonly` has no runtime meaning, so it is consumed and ignored.
      return this.parsePostfix();
    }
    if (name === 'null') return { expression: 'z.null()', isNull: true };
    if (name === 'undefined') return { expression: 'z.undefined()', isUndefined: true };
    if (name in KEYWORD_SCHEMAS) return { expression: KEYWORD_SCHEMAS[name] };
    if (name in REJECTED_KEYWORDS) fail(REJECTED_KEYWORDS[name]);
    if (this.isPunct('<')) fail('generic type arguments are not supported');

    // A dotted name is handed to the resolver whole, so a caller can decide
    // whether `PrismaJson.Simple` means the same thing as `Simple`.
    let qualified = name;
    while (this.isPunct('.') && this.peek(1)?.kind === 'ident') {
      qualified += `.${this.peek(1)!.value}`;
      this.index += 2;
    }
    if (this.isPunct('<')) fail('generic type arguments are not supported');

    return { expression: this.resolveReference(qualified) };
  }

  /** True when the token at the cursor can begin a type. */
  private startsType(): boolean {
    const token = this.peek();
    if (!token) return false;
    if (token.kind === 'ident' || token.kind === 'string' || token.kind === 'number') return true;
    return token.value === '[' || token.value === '{' || token.value === '(';
  }

  private resolveReference(name: string): string {
    if (!this.resolveTypeName) {
      fail(`the type reference "${name}" cannot be resolved: no resolver is configured`);
    }
    const resolution = this.resolveTypeName(name);
    if ('error' in resolution) fail(resolution.error);
    if (!this.referenced.includes(name)) this.referenced.push(name);
    return resolution.expression;
  }

  /** Tuple := '[' Type ( ',' Type )* ','? ']' */
  private parseTuple(): TypeNode {
    this.expectPunct('[');
    if (this.isPunct(']')) fail('an empty tuple type has no useful Zod equivalent');

    const members: string[] = [];
    for (;;) {
      if (this.isPunct('...')) fail('rest elements in a tuple are not supported');
      if (this.isLabelledTupleMember()) fail('labelled tuple members are not supported');

      members.push(this.parseType().expression);

      if (this.isPunct('?')) fail('optional tuple elements are not supported');
      if (this.isPunct(',')) {
        this.index++;
        if (this.isPunct(']')) break;
        continue;
      }
      break;
    }
    this.expectPunct(']');

    return { expression: `z.tuple([${members.join(', ')}])` };
  }

  private isLabelledTupleMember(): boolean {
    if (this.peek()?.kind !== 'ident') return false;
    if (this.isPunct(':', 1)) return true;
    return this.isPunct('?', 1) && this.isPunct(':', 2);
  }

  /** Object := '{' ( Member ( ';' | ',' )? )* '}' */
  private parseObject(): TypeNode {
    this.expectPunct('{');
    if (this.isPunct('}')) {
      fail(
        'the empty object type `{}` means any non-nullish value in TypeScript, not an empty object',
      );
    }

    const properties: string[] = [];
    const seen = new Set<string>();

    while (!this.isPunct('}')) {
      if (this.isPunct('[')) {
        fail('index signatures and mapped types are not supported');
      }
      if (this.isIdent('readonly') && !this.isPunct(':', 1) && !this.isPunct('?', 1)) {
        this.index++;
      }

      const key = this.next();
      if (!key) fail('unexpected end of type');
      if (key.kind === 'punct') this.unexpected(key);
      const keyText = key.kind === 'number' ? normaliseNumber(key.value) : key.value;

      if (this.isPunct('(') || this.isPunct('<')) {
        fail('method signatures are not supported');
      }

      let optional = false;
      if (this.isPunct('?')) {
        optional = true;
        this.index++;
      }
      this.expectPunct(':');

      const value = this.parseType();
      if (seen.has(keyText)) fail(`duplicate property "${keyText}" in an object type`);
      seen.add(keyText);

      const renderedKey = BARE_IDENTIFIER.test(keyText) ? keyText : quoteStringLiteral(keyText);
      properties.push(`${renderedKey}: ${value.expression}${optional ? '.optional()' : ''}`);

      if (this.isPunct(';') || this.isPunct(',')) {
        this.index++;
        continue;
      }
      if (!this.isPunct('}')) this.unexpected(this.peek());
    }
    this.expectPunct('}');

    return { expression: `z.object({ ${properties.join(', ')} })` };
  }
}

/** Combine union members, lifting `null` and `undefined` into modifiers. */
function unionOf(members: TypeNode[]): TypeNode {
  if (members.length === 1) return members[0];

  const hasNull = members.some((member) => member.isNull);
  const hasUndefined = members.some((member) => member.isUndefined);
  const rest = members.filter((member) => !member.isNull && !member.isUndefined);

  if (rest.length === 0) {
    if (hasNull && hasUndefined) {
      return { expression: 'z.union([z.null(), z.undefined()])' };
    }
    return hasNull
      ? { expression: 'z.null()', isNull: true }
      : { expression: 'z.undefined()', isUndefined: true };
  }

  let base: string;
  if (rest.length === 1) {
    base = rest[0].expression;
  } else if (rest.every((member) => member.literalString !== undefined)) {
    const values: string[] = [];
    for (const member of rest) {
      const rendered = quoteStringLiteral(member.literalString!);
      if (!values.includes(rendered)) values.push(rendered);
    }
    base = values.length === 1 ? `z.literal(${values[0]})` : `z.enum([${values.join(', ')}])`;
  } else {
    base = `z.union([${rest.map((member) => member.expression).join(', ')}])`;
  }

  if (hasNull && hasUndefined) return { expression: `${base}.nullish()` };
  if (hasNull) return { expression: `${base}.nullable()` };
  if (hasUndefined) return { expression: `${base}.optional()` };
  return { expression: base };
}

/** Numeric separators are legal TypeScript but noise in the emitted schema. */
function normaliseNumber(raw: string): string {
  return raw.replace(/_/g, '');
}

/* -------------------------------------------------------------------------- */
/* Public entry point                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Convert TypeScript type text to a Zod expression string.
 *
 * Never throws. Anything outside the supported subset comes back as
 * `{ ok: false, reason }` so the caller can fall back to today's behaviour.
 */
export function convertTsTypeToZod(
  typeText: string,
  options: TsTypeConversionOptions = {},
): TsTypeConversionResult {
  try {
    const text = (typeText ?? '').trim();
    if (text === '') return { ok: false, reason: 'the type text is empty' };

    const tokens = tokenize(text);
    if (tokens.length === 0) return { ok: false, reason: 'the type text is empty' };

    const parser = new TypeParser(
      tokens,
      options.maxDepth ?? DEFAULT_MAX_DEPTH,
      options.resolveTypeName,
    );
    const node = parser.parse();

    return { ok: true, expression: node.expression, referencedTypeNames: parser.referenced };
  } catch (error) {
    if (error instanceof ConversionError) return { ok: false, reason: error.message };
    if (error instanceof RangeError) {
      return { ok: false, reason: 'the type is nested too deeply to convert' };
    }
    return {
      ok: false,
      reason: `the type could not be parsed (${error instanceof Error ? error.message : String(error)})`,
    };
  }
}
