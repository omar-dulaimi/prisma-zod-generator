import { ValidationError } from './schema';

/**
 * Base class for all configuration-related errors
 */
export abstract class ConfigurationError extends Error {
  abstract readonly errorCode: string;
  abstract readonly category: ConfigurationErrorCategory;

  public readonly timestamp: Date;
  public readonly context: Record<string, unknown>;

  constructor(
    message: string,
    public readonly cause?: Error,
    context: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = context;

    // Ensure the error stack trace points to the actual error location
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to structured format for logging/debugging
   */
  toStructured(): StructuredError {
    return {
      name: this.name,
      errorCode: this.errorCode,
      category: this.category,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      cause: this.cause
        ? {
            name: this.cause.name,
            message: this.cause.message,
            stack: this.cause.stack,
          }
        : undefined,
      stack: this.stack,
    };
  }

  /**
   * Get user-friendly error message with suggestions
   */
  abstract getUserFriendlyMessage(): string;
}

/**
 * Configuration error categories
 */
export enum ConfigurationErrorCategory {
  FILE_SYSTEM = 'FILE_SYSTEM',
  PARSING = 'PARSING',
  VALIDATION = 'VALIDATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  INTEGRATION = 'INTEGRATION',
}

/**
 * Structured error format for logging
 */
export interface StructuredError {
  name: string;
  errorCode: string;
  category: ConfigurationErrorCategory;
  message: string;
  timestamp: string;
  context: Record<string, unknown>;
  cause?: {
    name: string;
    message: string;
    stack?: string;
  };
  stack?: string;
}

/**
 * Configuration file not found error
 */
export class ConfigFileNotFoundError extends ConfigurationError {
  readonly errorCode = 'CONFIG_FILE_NOT_FOUND';
  readonly category = ConfigurationErrorCategory.FILE_SYSTEM;

  constructor(filePath: string, cause?: Error) {
    super(`Configuration file not found: ${filePath}`, cause, { filePath });
  }

  getUserFriendlyMessage(): string {
    const filePath = this.context.filePath as string;
    return `Configuration file not found: ${filePath}

Troubleshooting steps:
1. Check if the file path is correct: ${filePath}
2. Verify the file exists and is readable
3. Ensure the file has proper permissions
4. If using a relative path, check your current working directory

Alternative solutions:
- Create a new configuration file at: ${filePath}
- Use auto-discovery by creating: zod-generator.config.json
- Remove the config option to use default settings`;
  }
}

/**
 * Configuration file permission error
 */
export class ConfigFilePermissionError extends ConfigurationError {
  readonly errorCode = 'CONFIG_FILE_PERMISSION_DENIED';
  readonly category = ConfigurationErrorCategory.FILE_SYSTEM;

  constructor(filePath: string, operation: string, cause?: Error) {
    super(`Permission denied accessing configuration file: ${filePath}`, cause, {
      filePath,
      operation,
    });
  }

  getUserFriendlyMessage(): string {
    const filePath = this.context.filePath as string;
    const operation = this.context.operation as string;

    return `Permission denied ${operation} configuration file: ${filePath}

Troubleshooting steps:
1. Check file permissions: ls -la "${filePath}"
2. Ensure you have read access to the file
3. Verify the directory permissions
4. Try running with appropriate permissions

Fix suggestions:
- Change file permissions: chmod 644 "${filePath}"
- Check directory permissions: chmod 755 "$(dirname "${filePath}")"
- Run as a user with appropriate access`;
  }
}

/**
 * Configuration parsing error (JSON syntax, etc.)
 */
export class ConfigParsingError extends ConfigurationError {
  readonly errorCode = 'CONFIG_PARSING_FAILED';
  readonly category = ConfigurationErrorCategory.PARSING;

  constructor(filePath: string, parseError: string, line?: number, column?: number, cause?: Error) {
    super(`Failed to parse configuration file: ${filePath}`, cause, {
      filePath,
      parseError,
      line,
      column,
    });
  }

  getUserFriendlyMessage(): string {
    const filePath = this.context.filePath as string;
    const parseError = this.context.parseError as string;
    const line = this.context.line as number;
    const column = this.context.column as number;

    let message = `Failed to parse configuration file: ${filePath}

Parse error: ${parseError}`;

    if (line !== undefined && column !== undefined) {
      message += `
Location: Line ${line}, Column ${column}`;
    }

    message += `

Troubleshooting steps:
1. Validate JSON syntax using a JSON validator
2. Check for common JSON errors:
   - Missing quotes around strings
   - Trailing commas
   - Unmatched brackets or braces
   - Invalid escape sequences

Common fixes:
- Use double quotes (") not single quotes (')
- Remove trailing commas in arrays and objects
- Ensure proper nesting of brackets and braces
- Escape special characters in strings`;

    return message;
  }
}

/**
 * Configuration validation error (schema violations)
 */
export class ConfigValidationError extends ConfigurationError {
  readonly errorCode = 'CONFIG_VALIDATION_FAILED';
  readonly category = ConfigurationErrorCategory.VALIDATION;

  constructor(validationErrors: ValidationError[], filePath?: string) {
    const errorCount = validationErrors.length;
    super(`Configuration validation failed with ${errorCount} error(s)`, undefined, {
      validationErrors,
      filePath,
      errorCount,
    });
  }

  getUserFriendlyMessage(): string {
    const validationErrors = this.context.validationErrors as ValidationError[];
    const filePath = this.context.filePath as string;

    let message = `Configuration validation failed`;
    if (filePath) {
      message += ` in file: ${filePath}`;
    }
    message += `\n\nValidation errors (${validationErrors.length}):\n`;

    validationErrors.forEach((error, index) => {
      message += `\n${index + 1}. ${error.message}`;
      message += `\n   Path: ${error.path}`;

      if (error.value !== undefined) {
        message += `\n   Current value: ${JSON.stringify(error.value)}`;
      }

      if (error.allowedValues && error.allowedValues.length > 0) {
        message += `\n   Allowed values: ${error.allowedValues.join(', ')}`;
      }

      message += '\n';
    });

    message += `\nTroubleshooting:
1. Review each validation error above
2. Check the configuration schema documentation
3. Verify property names and values match requirements
4. Ensure required properties are present

Common fixes:
- Use correct property names (case-sensitive)
- Check data types (string, boolean, array, object)
- Verify enum values are from allowed list
- Remove unknown/additional properties`;

    return message;
  }
}

/**
 * Model reference error (model not found in Prisma schema)
 */
export class ModelReferenceError extends ConfigurationError {
  readonly errorCode = 'MODEL_REFERENCE_INVALID';
  readonly category = ConfigurationErrorCategory.BUSINESS_LOGIC;

  constructor(modelName: string, availableModels: string[], configPath?: string) {
    super(`Model "${modelName}" not found in Prisma schema`, undefined, {
      modelName,
      availableModels,
      configPath,
    });
  }

  getUserFriendlyMessage(): string {
    const modelName = this.context.modelName as string;
    const availableModels = this.context.availableModels as string[];
    const configPath = this.context.configPath as string;

    let message = `Model reference error: "${modelName}" not found in Prisma schema`;

    if (configPath) {
      message += `\nConfiguration path: ${configPath}`;
    }

    message += `\nAvailable models: ${availableModels.join(', ')}

Troubleshooting:
1. Check if the model name matches exactly (case-sensitive)
2. Verify the model exists in your Prisma schema
3. Ensure Prisma schema is up to date
4. Check for typos in the model name

Fix suggestions:
- Update model name to match Prisma schema
- Run "prisma generate" to ensure schema is current
- Remove invalid model configuration
- Use one of the available models: ${availableModels.slice(0, 3).join(', ')}${availableModels.length > 3 ? '...' : ''}`;

    return message;
  }
}

/**
 * Integration error (Prisma schema issues, dependency problems)
 */
export class IntegrationError extends ConfigurationError {
  readonly errorCode = 'INTEGRATION_FAILED';
  readonly category = ConfigurationErrorCategory.INTEGRATION;

  constructor(component: string, issue: string, cause?: Error) {
    super(`Integration error with ${component}: ${issue}`, cause, { component, issue });
  }

  getUserFriendlyMessage(): string {
    const component = this.context.component as string;
    const issue = this.context.issue as string;

    return `Integration error with ${component}: ${issue}

This error typically indicates a problem with external dependencies or configuration.

Troubleshooting steps:
1. Verify ${component} is properly installed and configured
2. Check for version compatibility issues
3. Ensure all required dependencies are available
4. Review configuration for ${component} integration

Common solutions:
- Update dependencies to compatible versions
- Check ${component} documentation for configuration requirements
- Verify environment setup and configuration files
- Review integration settings in your configuration`;
  }
}

/**
 * Configuration warning (non-critical issues)
 */
export class ConfigurationWarning {
  public readonly timestamp: Date = new Date();

  constructor(
    public readonly message: string,
    public readonly path?: string,
    public readonly context: Record<string, unknown> = {},
  ) {}

  toString(): string {
    let message = `Warning: ${this.message}`;
    if (this.path) {
      message += ` (at ${this.path})`;
    }
    return message;
  }

  getUserFriendlyMessage(): string {
    let message = `⚠️  ${this.message}`;

    if (this.path) {
      message += `\n   Location: ${this.path}`;
    }

    message += '\n   This is a warning and will not prevent the generator from running.';
    return message;
  }
}

/**
 * Error handler utility class
 */
export class ConfigurationErrorHandler {
  private readonly context: Record<string, unknown>;

  constructor(context: Record<string, unknown> = {}) {
    this.context = context;
  }

  /**
   * Handle file system errors
   */
  handleFileSystemError(error: unknown, filePath: string, operation: string): never {
    const nodeError = error as NodeJS.ErrnoException;

    switch (nodeError.code) {
      case 'ENOENT':
        throw new ConfigFileNotFoundError(filePath, nodeError);

      case 'EACCES':
      case 'EPERM':
        throw new ConfigFilePermissionError(filePath, operation, nodeError);

      default:
        throw new IntegrationError(
          'file system',
          `Failed to ${operation} file: ${nodeError.message}`,
          nodeError,
        );
    }
  }

  /**
   * Handle parsing errors
   */
  handleParsingError(error: unknown, filePath: string): never {
    if (error instanceof SyntaxError) {
      // Try to extract line/column information from JSON syntax error
      const match = error.message.match(/at position (\d+)|line (\d+)|column (\d+)/i);
      const position = match ? parseInt(match[1] || match[2] || match[3], 10) : undefined;

      throw new ConfigParsingError(filePath, error.message, position, undefined, error);
    }

    throw new IntegrationError(
      'parser',
      `Unexpected parsing error: ${(error as Error).message}`,
      error as Error,
    );
  }

  /**
   * Handle validation errors
   */
  handleValidationError(validationErrors: ValidationError[], filePath?: string): never {
    throw new ConfigValidationError(validationErrors, filePath);
  }

  /**
   * Handle model reference errors
   */
  handleModelReferenceError(
    modelName: string,
    availableModels: string[],
    configPath?: string,
  ): never {
    throw new ModelReferenceError(modelName, availableModels, configPath);
  }

  /**
   * Create warning
   */
  createWarning(
    message: string,
    path?: string,
    context?: Record<string, unknown>,
  ): ConfigurationWarning {
    return new ConfigurationWarning(message, path, { ...this.context, ...context });
  }

  /**
   * Format multiple errors for display
   */
  formatErrors(errors: ConfigurationError[]): string {
    if (errors.length === 0) {
      return 'No errors to display';
    }

    if (errors.length === 1) {
      return errors[0].getUserFriendlyMessage();
    }

    let message = `Multiple configuration errors (${errors.length}):\n\n`;

    errors.forEach((error, index) => {
      message += `${index + 1}. ${error.errorCode}: ${error.message}\n`;
      message += `   Category: ${error.category}\n`;
      message += `   Time: ${error.timestamp.toISOString()}\n\n`;
    });

    message += '\nTo see detailed information for each error, resolve them one at a time.';
    return message;
  }

  /**
   * Format multiple warnings for display
   */
  formatWarnings(warnings: ConfigurationWarning[]): string {
    if (warnings.length === 0) {
      return '';
    }

    let message = `Configuration warnings (${warnings.length}):\n\n`;

    warnings.forEach((warning, index) => {
      message += `${index + 1}. ${warning.getUserFriendlyMessage()}\n\n`;
    });

    return message.trim();
  }
}

/**
 * Create error handler with context
 */
export function createErrorHandler(
  context: Record<string, unknown> = {},
): ConfigurationErrorHandler {
  return new ConfigurationErrorHandler(context);
}

/**
 * Check if error is a configuration error
 */
export function isConfigurationError(error: unknown): error is ConfigurationError {
  return error instanceof ConfigurationError;
}

/**
 * Extract error code from configuration error
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isConfigurationError(error)) {
    return error.errorCode;
  }
  return undefined;
}

/**
 * Extract error category from configuration error
 */
export function getErrorCategory(error: unknown): ConfigurationErrorCategory | undefined {
  if (isConfigurationError(error)) {
    return error.category;
  }
  return undefined;
}
