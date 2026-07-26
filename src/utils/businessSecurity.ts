/**
 * The gate `license.ts` consults before letting a paid feature run.
 *
 * This file described itself as "comprehensive protection against business logic
 * vulnerabilities including authorization bypasses, privilege escalation, and data leakage",
 * and was 520 lines of exactly that shape: an authorization rule registry, tenant-isolation
 * checks, a recursive `sanitizeData` for sensitive fields, and an audit log.
 *
 * None of it was reachable. `validateFeatureAccess` is the only thing any caller uses; the
 * registry, the sanitiser and the audit log had no readers at all, so nothing was being
 * protected by them. What is left is the licence gate itself, which is real and tested in
 * tests/business-security-gate.test.ts.
 */

import { LicenseInfo } from '../license';

export interface SecurityContext {
  userId: string;
  roles: string[];
  tenantId?: string;
  permissions: string[];
  sessionId: string;
  isAdmin: boolean;
  licenseInfo?: LicenseInfo;
}

export class BusinessSecurityError extends Error {
  constructor(
    message: string,
    public readonly errorType:
      | 'authorization'
      | 'tenant_isolation'
      | 'privilege_escalation'
      | 'data_leakage',
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BusinessSecurityError';
  }
}

/**
 * Business Logic Security Manager
 */
export class BusinessSecurity {
  /**
   * Validate feature access with comprehensive checks
   */
  validateFeatureAccess(
    feature: string,
    license: LicenseInfo | null,
    context: SecurityContext,
  ): { allowed: boolean; reason?: string } {
    // Step 1: License validation
    if (!license) {
      return { allowed: false, reason: 'No valid license found' };
    }

    // Step 2: Feature-to-plan mapping (corrected logic)
    const featurePlans = this.getFeaturePlans();
    const requiredPlans = featurePlans.get(feature);

    if (!requiredPlans) {
      return { allowed: false, reason: `Unknown feature: ${feature}` };
    }

    if (!requiredPlans.includes(license.plan)) {
      const minPlan = this.getMinimumPlan(requiredPlans);
      const requiredName = this.describePlan(minPlan);
      const currentName = this.describePlan(license.plan);
      return {
        allowed: false,
        reason: `Feature '${feature}' requires ${requiredName} plan or higher, current: ${currentName}`,
      };
    }

    // Step 3: Additional security checks
    if (license.status && license.status !== 'active') {
      return { allowed: false, reason: `License status: ${license.status}` };
    }

    const expiry = license.valid_until ?? new Date(license.validUntil);
    if (new Date() > expiry) {
      return { allowed: false, reason: 'License has expired' };
    }

    // Step 4: Context validation
    if (!this.validateSecurityContext(context)) {
      return { allowed: false, reason: 'Invalid security context' };
    }

    // A successful access used to be appended to an in-memory `auditLog` array. Nothing ever
    // read it — the only accessor, getAuditLog(), had no caller — so it grew for the life of the
    // process and was discarded. That is not an audit trail; if one is wanted it needs a sink
    // that outlives the run.

    return { allowed: true };
  }

  // Private helper methods

  private getFeaturePlans(): Map<string, string[]> {
    return new Map([
      ['policies', ['professional', 'business', 'enterprise']],
      ['server-actions', ['starter', 'professional', 'business', 'enterprise']],
      ['sdk-publisher', ['professional', 'business', 'enterprise']],
      ['drift-guard', ['professional', 'business', 'enterprise']],
      ['contract-testing-pack', ['business', 'enterprise']],
      ['postgres-rls-pack', ['professional', 'business', 'enterprise']],
      ['form-ux', ['starter', 'professional', 'business', 'enterprise']],
      ['api-docs-pack', ['business', 'enterprise']],
      ['multi-tenant-kit', ['enterprise']],
      ['performance-pack', ['professional', 'business', 'enterprise']],
      ['data-factories', ['business', 'enterprise']],
    ]);
  }

  private getMinimumPlan(plans: string[]): string {
    const hierarchy = ['starter', 'professional', 'business', 'enterprise'];
    for (const plan of hierarchy) {
      if (plans.includes(plan)) {
        return plan;
      }
    }
    return 'enterprise';
  }

  private describePlan(plan: string): string {
    switch (plan) {
      case 'starter':
        return 'Starter';
      case 'professional':
        return 'Professional';
      case 'business':
        return 'Business';
      case 'enterprise':
        return 'Enterprise';
      default:
        return plan;
    }
  }

  private validateSecurityContext(context: SecurityContext): boolean {
    return !!(
      context.userId &&
      context.sessionId &&
      Array.isArray(context.roles) &&
      Array.isArray(context.permissions)
    );
  }
}

/**
 * Global business security instance
 */
export const businessSecurity = new BusinessSecurity();

/*
 * secureBusinessLogic, a method decorator wrapping calls in an authorisation check, was removed
 * as unreachable — no caller inside or outside this module. The live entry point is the
 * `businessSecurity` singleton's validateFeatureAccess, which license.ts calls directly and
 * tests/business-security-gate.test.ts covers.
 */
