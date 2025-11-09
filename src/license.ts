/**
 * PZG Pro License Validation
 *
 * Simple offline-capable license validation with local caching
 * Only checks license when Pro features are actually used
 */

import { verify as verifySignature } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { businessSecurity } from './utils/businessSecurity';
import { LicenseError, logError, safeFileOperation } from './utils/errorHandling';

type PlanSlug = 'starter' | 'professional' | 'business' | 'enterprise';

export function describePlan(plan: PlanSlug): string {
  switch (plan) {
    case 'starter':
      return 'Starter';
    case 'professional':
      return 'Professional';
    case 'business':
      return 'Business';
    case 'enterprise':
      return 'Enterprise';
  }
}

export interface LicenseInfo {
  key: string;
  plan: PlanSlug;
  validUntil: string;
  maxSeats: number;
  cached: boolean;
  // Optional fields for compatibility with businessSecurity utilities
  status?: 'active' | 'suspended' | 'expired';
  valid_until?: Date;
}

interface CachedLicense {
  info: LicenseInfo;
  cachedAt: number;
  validFor: number; // 30 days in ms
}

const CACHE_DIR = join(homedir(), '.cache', 'pzg');
const CACHE_FILE = join(CACHE_DIR, 'license.json');
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

const LICENSE_KEY_VERSION = 'v2';
const LICENSE_KEY_PREFIX = `pzg_${LICENSE_KEY_VERSION}_`;
const MIN_SIGNATURE_LENGTH = 43;
const MAX_LICENSE_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year max license age for replay protection

// Public key used to verify license signatures (Ed25519)
const DEFAULT_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAwRNEnFQJgBdNnwvnTTAPySp223shjXfioII2qMkqBFQ=
-----END PUBLIC KEY-----`;

function getLicensePublicKey(): string {
  const configured = process.env.PZG_LICENSE_PUBLIC_KEY;
  if (configured && configured.trim().length > 0) {
    // Allow newline placeholders in env variables
    return configured.replace(/\\n/g, '\n');
  }

  return DEFAULT_PUBLIC_KEY_PEM;
}

function verifyLicenseSignature(encodedData: string, signature: string): boolean {
  try {
    const publicKey = getLicensePublicKey();
    const dataBuffer = Buffer.from(encodedData, 'base64url');
    const signatureBuffer = Buffer.from(signature, 'base64url');
    return verifySignature(null, dataBuffer, publicKey, signatureBuffer);
  } catch {
    return false;
  }
}

/**
 * Detect if pro features have been tampered with (de-obfuscated)
 *
 * Checks for signs that obfuscated code has been modified:
 * - Readable class names (should be obfuscated to hex)
 * - Missing obfuscation markers (pzg_ prefix)
 * - Suspicious code patterns
 */
function detectTampering(): boolean {
  try {
    // Skip tampering detection in development mode
    if (process.env.NODE_ENV === 'development' || process.env.PZG_DEV_MODE === 'true') {
      return false;
    }

    // Try to resolve pro index module
    let proIndexPath: string;
    try {
      proIndexPath = require.resolve('./pro/index.js');
    } catch {
      // Pro module not found (probably core-only installation)
      return false;
    }

    // Read pro module code
    const proCode = readFileSync(proIndexPath, 'utf8');

    // Check for obfuscation markers
    const obfuscationIndicators = {
      // Should have hexadecimal identifiers with pzg_ prefix
      hasHexIdentifiers: /pzg_0x[0-9a-f]{4,}/.test(proCode),

      // Should NOT have readable class names (sign of de-obfuscation)
      hasReadableClasses:
        /class\s+(PoliciesGenerator|ServerActionsGenerator|DriftGuardGenerator|FormUXGenerator)/.test(
          proCode,
        ),

      // Should NOT have readable function names for pro features
      hasReadableFunctions:
        /function\s+(generatePolicies|generateServerActions|generateDriftGuard)/.test(proCode),

      // Should have string array indicators
      hasStringArray: /_0x[0-9a-f]+\[/.test(proCode),
    };

    // Tampering detected if:
    // 1. No hex identifiers (should be obfuscated)
    // 2. Has readable class/function names (de-obfuscated)
    const isTampered =
      !obfuscationIndicators.hasHexIdentifiers ||
      obfuscationIndicators.hasReadableClasses ||
      obfuscationIndicators.hasReadableFunctions;

    if (isTampered) {
      // Log tampering indicators for debugging (in non-production)
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[PZG] Tampering indicators:', obfuscationIndicators);
      }
    }

    return isTampered;
  } catch (error) {
    // If we can't check (e.g., file system issues), assume no tampering
    // Better to err on the side of functionality
    return false;
  }
}

/**
 * Report tampering violation
 *
 * Logs the violation and notifies the license server (if configured)
 */
function reportTampering(): void {
  try {
    // Log to console
    console.error('\n⚠️  PZG Pro Code Tampering Detected');
    console.error('   Pro features appear to have been modified or de-obfuscated.');
    console.error('   This violates the PZG Pro Commercial License Agreement.');
    console.error('   Please reinstall: npm install prisma-zod-generator@latest\n');

    // In production, could send telemetry to license server
    if (process.env.PZG_REPORT_VIOLATIONS === 'true' && process.env.PZG_LICENSE_KEY) {
      // Future: Send anonymous violation report to license server
      // This helps track widespread abuse without collecting PII
    }
  } catch {
    // Silently fail if reporting fails
  }
}

/**
 * Get license key from environment
 */
function getLicenseKey(): string | null {
  return process.env.PZG_LICENSE_KEY || null;
}

/**
 * Read cached license if valid
 */
function readCachedLicense(): LicenseInfo | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;

    const cached: CachedLicense = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
    const now = Date.now();

    // Check if cache is still valid
    if (now - cached.cachedAt < cached.validFor) {
      return { ...cached.info, cached: true };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Cache license info locally
 */
function cacheLicense(info: LicenseInfo): void {
  try {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }

    const cached: CachedLicense = {
      info,
      cachedAt: Date.now(),
      validFor: CACHE_DURATION,
    };

    writeFileSync(CACHE_FILE, JSON.stringify(cached, null, 2));
  } catch {
    // Silently fail cache writes
  }
}

/**
 * Validate license key with cryptographic verification
 * Implements secure license validation with signature checking
 */
function extractSignedLicensePayload(
  key: string,
): { encodedData: string; signature: string } | null {
  if (!key.startsWith(LICENSE_KEY_PREFIX)) {
    return null;
  }

  const body = key.slice(LICENSE_KEY_PREFIX.length);
  let attemptedSignatureVerification = false;

  for (
    let separatorIndex = body.lastIndexOf('_');
    separatorIndex > 0;
    separatorIndex = body.lastIndexOf('_', separatorIndex - 1)
  ) {
    const encodedData = body.slice(0, separatorIndex);
    const signature = body.slice(separatorIndex + 1);

    if (!encodedData || signature.length < MIN_SIGNATURE_LENGTH) {
      continue;
    }

    attemptedSignatureVerification = true;

    if (verifyLicenseSignature(encodedData, signature)) {
      return { encodedData, signature };
    }
  }

  if (attemptedSignatureVerification) {
    throw new LicenseError(
      'Invalid PZG Pro license key. Please check your license key.\n' +
        'Get support at: https://github.com/omar-dulaimi/prisma-zod-generator/issues',
      { reason: 'signature_verification_failed' },
    );
  }

  return null;
}

async function validateLicenseRemote(key: string): Promise<LicenseInfo | null> {
  try {
    // License format: pzg_v2_<base64url-encoded-license-data>_<base64url-signature>
    const payload = extractSignedLicensePayload(key);
    if (!payload) {
      return null;
    }

    // Decode license data after signature verification
    interface LicensePayload {
      plan: string;
      validUntil: string;
      maxSeats: number;
      issuedAt?: string;
      customerId?: string;
    }

    let licenseData: LicensePayload;
    try {
      // Support both base64 and base64url decoding for backward compatibility
      let decodedData: string;
      try {
        decodedData = Buffer.from(payload.encodedData, 'base64url').toString('utf8');
      } catch {
        decodedData = Buffer.from(payload.encodedData, 'base64').toString('utf8');
      }

      const parsed = JSON.parse(decodedData);

      // Validate structure
      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }

      licenseData = parsed as LicensePayload;
    } catch {
      return null;
    }

    // Verify required fields
    if (!licenseData.plan || !licenseData.validUntil || !licenseData.maxSeats) {
      return null;
    }

    // Replay attack protection: check license issue age
    if (licenseData.issuedAt) {
      const issuedDate = new Date(licenseData.issuedAt);
      const now = new Date();
      const licenseAge = now.getTime() - issuedDate.getTime();

      if (licenseAge > MAX_LICENSE_AGE_MS) {
        throw new Error('License is too old. Please request a new license.');
      }

      // Additional validation: license must not be issued in the future
      if (issuedDate > now) {
        return null; // Invalid license with future timestamp
      }
    }

    // Check expiration
    const expirationDate = new Date(licenseData.validUntil);
    if (expirationDate < new Date()) {
      throw new Error('License has expired. Please renew your PZG Pro subscription.');
    }

    // Validate plan slug
    const allowedPlans: readonly PlanSlug[] = ['starter', 'professional', 'business', 'enterprise'];
    if (!allowedPlans.includes(licenseData.plan as PlanSlug)) {
      return null;
    }
    const normalizedPlan = licenseData.plan as PlanSlug;

    // Validate seats
    if (typeof licenseData.maxSeats !== 'number' || licenseData.maxSeats < 1) {
      return null;
    }

    const validatedLicense: LicenseInfo = {
      key,
      plan: normalizedPlan,
      validUntil: licenseData.validUntil,
      maxSeats: licenseData.maxSeats,
      cached: false,
    };

    return validatedLicense;
  } catch (error) {
    if (error instanceof Error && error.message.includes('expired')) {
      throw error;
    }
    return null;
  }
}

/**
 * Main license validation function
 * Returns license info if valid, null if invalid, throws if required but missing
 */
export async function validateLicense(required = true): Promise<LicenseInfo | null> {
  try {
    // Check for code tampering first
    if (detectTampering()) {
      reportTampering();

      throw new LicenseError(
        'PZG Pro code tampering detected. Pro features have been modified.\n' +
          'This violates the Commercial License Agreement.\n' +
          'Please reinstall: npm install prisma-zod-generator@latest\n' +
          'Continued violations may result in license termination.',
        { reason: 'code_tampering_detected' },
      );
    }

    const key = getLicenseKey();

    if (!key) {
      if (required) {
        throw new LicenseError(
          'PZG Pro license required. Set PZG_LICENSE_KEY environment variable.\n' +
            'Get your license at: https://omar-dulaimi.github.io/prisma-zod-generator/pricing',
        );
      }
      return null;
    }

    // Try cached license first
    const cached = await safeFileOperation(() => readCachedLicense(), CACHE_FILE, 'license');

    if (cached && cached.key === key) {
      // Re-validate cached license with current secret to handle secret changes
      try {
        const revalidated = await validateLicenseRemote(key);
        if (revalidated) {
          return cached;
        }
      } catch (error) {
        // If signature verification fails, propagate the error immediately
        if (
          error instanceof LicenseError &&
          error.context?.reason === 'signature_verification_failed'
        ) {
          throw error;
        }
        // For other validation errors, continue to fresh validation
      }
      // If revalidation fails, continue to fresh validation
    }

    // Validate with remote server
    try {
      const license = await validateLicenseRemote(key);
      if (!license) {
        if (required) {
          throw new LicenseError(
            'Invalid PZG Pro license key. Please check your license key.\n' +
              'Get support at: https://github.com/omar-dulaimi/prisma-zod-generator/issues',
            { key: key.substring(0, 8) + '...' },
          );
        }
        return null;
      }

      // Cache valid license
      await safeFileOperation(() => cacheLicense(license), CACHE_FILE, 'license');

      return license;
    } catch (error) {
      // Re-throw signature verification errors (security violations) - these should always throw
      if (
        error instanceof LicenseError &&
        error.context?.reason === 'signature_verification_failed'
      ) {
        logError(error);
        throw error;
      }
      // For other validation errors, respect the required flag
      if (required) {
        logError(
          error instanceof LicenseError
            ? error
            : new LicenseError(
                `License validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { originalError: error },
              ),
        );
        throw error;
      }
      return null;
    }
  } catch (error) {
    if (error instanceof LicenseError) {
      logError(error);
      throw error;
    }

    const licenseError = new LicenseError(
      `License validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error },
    );

    logError(licenseError);
    throw licenseError;
  }
}

/**
 * Check if a specific plan feature is available
 */
export function hasFeature(license: LicenseInfo | null, feature: string): boolean {
  if (!license) return false;

  const features = {
    policies: ['professional', 'business', 'enterprise'],
    'server-actions': ['starter', 'professional', 'business', 'enterprise'],
    'sdk-publisher': ['professional', 'business', 'enterprise'],
    'drift-guard': ['professional', 'business', 'enterprise'],
    // Phase 2 - Safety & Governance
    'contract-testing-pack': ['business', 'enterprise'],
    'postgres-rls-pack': ['professional', 'business', 'enterprise'],
    // Phase 3 - Developer Experience & Docs
    'form-ux': ['starter', 'professional', 'business', 'enterprise'],
    'api-docs-pack': ['business', 'enterprise'],
    // Phase 4 - Scale & Compliance
    'multi-tenant-kit': ['enterprise'],
    'performance-pack': ['professional', 'business', 'enterprise'],
    'data-factories': ['business', 'enterprise'],
  };

  const requiredPlans = features[feature as keyof typeof features];
  return requiredPlans ? requiredPlans.includes(license.plan) : false;
}

/**
 * Require a specific feature, throw if not available
 */
export async function requireFeature(
  feature: string,
  context?: { userId?: string; sessionId?: string },
): Promise<LicenseInfo> {
  // Development bypass for local testing
  if (process.env.NODE_ENV === 'development' || process.env.PZG_DEV_MODE === 'true') {
    return {
      key: 'dev-bypass',
      plan: 'enterprise',
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      maxSeats: 999,
      cached: false,
    };
  }

  const license = await validateLicense(true);

  // Use business security for comprehensive validation
  const securityContext = {
    userId: context?.userId || 'system',
    roles: ['authenticated'],
    permissions: [],
    sessionId: context?.sessionId || 'unknown',
    isAdmin: false,
    licenseInfo: license ?? undefined,
  };

  const validation = businessSecurity.validateFeatureAccess(feature, license, securityContext);

  if (!validation.allowed) {
    throw new LicenseError(
      `Feature access denied: ${validation.reason}\n` +
        'Upgrade at: https://omar-dulaimi.github.io/prisma-zod-generator/pricing',
      { feature, reason: validation.reason },
    );
  }

  return license as LicenseInfo;
}

/**
 * Get license status for CLI commands
 */
export async function getLicenseStatus(): Promise<{
  valid: boolean;
  plan?: PlanSlug;
  cached?: boolean;
}> {
  try {
    const license = await validateLicense(false);
    if (!license) {
      return { valid: false };
    }

    return {
      valid: true,
      plan: license.plan,
      cached: license.cached,
    };
  } catch {
    return { valid: false };
  }
}
