import { GeneratorConfig } from '../config/parser';

export interface PureModelNamingResolved {
  filePattern: string;
  schemaSuffix: string; // may be ''
  typeSuffix: string; // may be ''
  exportNamePattern: string;
  legacyAliases: boolean;
  preset?: string;
}

const PRESET_MAP: Record<string, PureModelNamingResolved> = {
  'zod-prisma': {
    filePattern: '{Model}.schema.ts',
    schemaSuffix: 'Schema',
    typeSuffix: 'Type',
    exportNamePattern: '{Model}Schema',
    legacyAliases: true,
    preset: 'zod-prisma',
  },
  'zod-prisma-types': {
    filePattern: '{Model}.schema.ts',
    schemaSuffix: '',
    typeSuffix: '',
    exportNamePattern: '{Model}',
    legacyAliases: true,
    preset: 'zod-prisma-types',
  },
  'legacy-model-suffix': {
    filePattern: '{Model}.model.ts',
    schemaSuffix: 'Model',
    typeSuffix: 'ModelType',
    exportNamePattern: '{Model}Model',
    legacyAliases: false,
    preset: 'legacy-model-suffix',
  },
};

type NamingSection = NonNullable<GeneratorConfig['naming']>;
type PureModelNamingOverrides = NonNullable<NamingSection['pureModel']>;

function safeGetNaming(config: GeneratorConfig | null | undefined): NamingSection | undefined {
  return config && typeof config === 'object' ? (config as GeneratorConfig).naming : undefined;
}

export function resolvePureModelNaming(
  config: GeneratorConfig | null | undefined,
): PureModelNamingResolved {
  const naming = safeGetNaming(config);
  const presetName = naming?.preset;
  const lookupKey = presetName ? presetName.trim().toLowerCase() : presetName;
  let base: PureModelNamingResolved =
    lookupKey && PRESET_MAP[lookupKey]
      ? { ...PRESET_MAP[lookupKey] }
      : {
          filePattern: '{Model}.schema.ts',
          schemaSuffix: 'Schema',
          typeSuffix: 'Type',
          exportNamePattern: '{Model}{SchemaSuffix}',
          legacyAliases: false,
          preset: 'default',
        };
  // Defensive: explicitly handle legacy-model-suffix in case map lookup fails due to unexpected input normalization
  if (lookupKey === 'legacy-model-suffix' && (!base || base.preset !== 'legacy-model-suffix')) {
    base = { ...PRESET_MAP['legacy-model-suffix'] };
  }
  const overrides: Partial<PureModelNamingOverrides> = naming?.pureModel || {};
  const resolved = {
    ...base,
    ...overrides,
    filePattern: overrides.filePattern || base.filePattern,
    schemaSuffix: overrides.schemaSuffix === '' ? '' : overrides.schemaSuffix || base.schemaSuffix,
    typeSuffix: overrides.typeSuffix === '' ? '' : overrides.typeSuffix || base.typeSuffix,
    exportNamePattern: overrides.exportNamePattern || base.exportNamePattern,
    legacyAliases:
      overrides.legacyAliases !== undefined ? !!overrides.legacyAliases : base.legacyAliases,
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- logger loaded lazily to avoid circular deps in tests
    const { logger } = require('./logger');
    logger.debug(
      `[namingResolver] preset=${presetName || 'none'} filePattern=${resolved.filePattern}`,
    );
  } catch {}
  return resolved;
}

export function applyPattern(
  pattern: string,
  modelName: string,
  schemaSuffix: string,
  typeSuffix: string,
): string {
  const tokens: Record<string, string> = {
    '{Model}': modelName,
    '{model}': modelName.charAt(0).toLowerCase() + modelName.slice(1),
    '{camel}': modelName.charAt(0).toLowerCase() + modelName.slice(1),
    '{kebab}': modelName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
    '{SchemaSuffix}': schemaSuffix,
    '{TypeSuffix}': typeSuffix,
  };
  return applyUniversalPattern(pattern, tokens);
}

// Enhanced pattern application for all types
export function applyUniversalPattern(pattern: string, tokens: Record<string, string>): string {
  return Object.keys(tokens).reduce(
    (acc, token) => acc.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), tokens[token]),
    pattern,
  );
}

// Enum naming resolution
export interface EnumNamingResolved {
  filePattern: string;
  exportNamePattern: string;
}

export function resolveEnumNaming(config: GeneratorConfig | null | undefined): EnumNamingResolved {
  const naming = safeGetNaming(config);
  const enumConfig = naming?.enum;

  return {
    filePattern: enumConfig?.filePattern || '{Enum}.schema.ts',
    exportNamePattern: enumConfig?.exportNamePattern || '{Enum}Schema',
  };
}

// Input naming resolution
export interface InputNamingResolved {
  filePattern: string;
  exportNamePattern: string;
}

export function resolveInputNaming(
  config: GeneratorConfig | null | undefined,
): InputNamingResolved {
  const naming = safeGetNaming(config);
  const inputConfig = naming?.input;

  return {
    filePattern: inputConfig?.filePattern || '{InputType}.schema.ts',
    exportNamePattern: inputConfig?.exportNamePattern || '{Model}{InputType}ObjectSchema',
  };
}

// Schema naming resolution
export interface SchemaNamingResolved {
  filePattern: string;
  exportNamePattern: string;
}

export function resolveSchemaNaming(
  config: GeneratorConfig | null | undefined,
): SchemaNamingResolved {
  const naming = safeGetNaming(config);
  const schemaConfig = naming?.schema;

  return {
    filePattern: schemaConfig?.filePattern || '{operation}{Model}.schema.ts',
    exportNamePattern: schemaConfig?.exportNamePattern || '{Model}{Operation}Schema',
  };
}

// Unified pattern application function
export function generateFileName(
  pattern: string,
  modelName: string,
  operation?: string,
  inputType?: string,
  enumName?: string,
): string {
  // If pattern contains a model token ({Model} or {model}) and {InputType}, and inputType starts with modelName,
  // strip the model name from inputType to avoid duplicate prefixes in filenames
  let processedInputType = inputType || '';
  if (
    pattern.includes('{InputType}') &&
    (pattern.includes('{Model}') || pattern.includes('{model}')) &&
    inputType &&
    modelName
  ) {
    if (inputType.startsWith(modelName)) {
      processedInputType = inputType.substring(modelName.length);
    }
  }

  const tokens: Record<string, string> = {
    '{Model}': modelName,
    '{model}': modelName.charAt(0).toLowerCase() + modelName.slice(1),
    '{camel}': modelName.charAt(0).toLowerCase() + modelName.slice(1),
    '{kebab}': modelName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
    // Normalize operation tokens to mirror generateExportName semantics
    '{Operation}': operation ? operation.charAt(0).toUpperCase() + operation.slice(1) : '',
    '{operation}': operation ? operation.charAt(0).toLowerCase() + operation.slice(1) : '',
    '{InputType}': processedInputType,
    '{Enum}': enumName || '',
    '{enum}': enumName ? enumName.charAt(0).toLowerCase() + enumName.slice(1) : '',
  };

  return applyUniversalPattern(pattern, tokens);
}

export function generateExportName(
  pattern: string,
  modelName: string,
  operation?: string,
  inputType?: string,
  enumName?: string,
): string {
  // If pattern contains a model token ({Model} or {model}) and {InputType}, and inputType starts with modelName,
  // strip the model name from inputType to avoid duplication
  let processedInputType = inputType || '';
  if (
    pattern.includes('{InputType}') &&
    (pattern.includes('{Model}') || pattern.includes('{model}')) &&
    inputType &&
    modelName
  ) {
    if (inputType.startsWith(modelName)) {
      processedInputType = inputType.substring(modelName.length);
    }
  }

  const tokens: Record<string, string> = {
    '{Model}': modelName,
    '{model}': modelName.charAt(0).toLowerCase() + modelName.slice(1),
    '{kebab}': modelName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
    '{Operation}': operation ? operation.charAt(0).toUpperCase() + operation.slice(1) : '',
    '{operation}': operation ? operation.charAt(0).toLowerCase() + operation.slice(1) : '',
    '{InputType}': processedInputType,
    '{Enum}': enumName || '',
    '{enum}': enumName ? enumName.charAt(0).toLowerCase() + enumName.slice(1) : '',
  };

  return applyUniversalPattern(pattern, tokens);
}

/**
 * Reverse-derive a PascalCase model name from an export symbol and pattern.
 *
 * Supports patterns containing one of {Model}, {model}, {camel}, or {kebab} and
 * accounts for dynamic suffix tokens {SchemaSuffix}/{TypeSuffix} when computing
 * the static prefix/suffix surrounding the model token. Falls back to stripping
 * configured suffixes when a direct match is not possible.
 */
export function parseExportSymbol(
  symbol: string,
  pattern: string,
  schemaSuffix: string = '',
  typeSuffix: string = '',
): string {
  const replaceSuffixTokens = (segment: string): string =>
    segment.replace(/\{SchemaSuffix\}/g, schemaSuffix).replace(/\{TypeSuffix\}/g, typeSuffix);

  const tryExtract = (token: '{Model}' | '{model}' | '{camel}' | '{kebab}') => {
    if (!pattern.includes(token)) return null;
    const [preRaw, postRaw] = pattern.split(token);
    const pre = replaceSuffixTokens(preRaw || '');
    const post = replaceSuffixTokens(postRaw || '');
    if (symbol.startsWith(pre) && symbol.endsWith(post)) {
      const core = symbol.substring(pre.length, symbol.length - post.length);
      switch (token) {
        case '{Model}':
          return core; // Already PascalCase
        case '{model}':
        case '{camel}':
          return core ? core.charAt(0).toUpperCase() + core.slice(1) : core;
        case '{kebab}':
          return core
            .split('-')
            .map((seg) => (seg ? seg[0].toUpperCase() + seg.slice(1) : ''))
            .join('');
      }
    }
    return null;
  };

  // Prefer explicit {Model} first, then lowercase/camel, then kebab
  const viaModel =
    tryExtract('{Model}') ||
    tryExtract('{model}') ||
    tryExtract('{camel}') ||
    tryExtract('{kebab}');
  if (viaModel !== null) return viaModel;

  // Heuristics: if the symbol ends with known suffixes, strip them
  if (schemaSuffix && symbol.endsWith(schemaSuffix)) {
    return symbol.slice(0, -schemaSuffix.length);
  }
  if (typeSuffix && symbol.endsWith(typeSuffix)) {
    return symbol.slice(0, -typeSuffix.length);
  }
  return symbol;
}
