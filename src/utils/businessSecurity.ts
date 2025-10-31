/**
 * Business Logic Security Utilities
 *
 * Comprehensive protection against business logic vulnerabilities
 * including authorization bypasses, privilege escalation, and data leakage
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

export interface AuthorizationRule {
  resource: string;
  action: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  customValidator?: (context: SecurityContext, resource: any) => boolean;
  tenantIsolation?: boolean;
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
  private authorizationRules = new Map<string, AuthorizationRule>();
  private sensitiveFields = new Set<string>();
  private auditLog: Array<{
    timestamp: Date;
    userId: string;
    action: string;
    resource: string;
    allowed: boolean;
    reason?: string;
  }> = [];

  constructor() {
    this.initializeDefaultRules();
    this.initializeSensitiveFields();
  }

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

    // Log successful access
    this.auditLog.push({
      timestamp: new Date(),
      userId: context.userId,
      action: 'feature_access',
      resource: feature,
      allowed: true,
    });

    return { allowed: true };
  }

  /**
   * Strict tenant isolation validation
   */
  validateTenantIsolation(
    data: any,
    context: SecurityContext,
    tenantField: string = 'tenantId',
  ): { isolated: boolean; reason?: string } {
    // Step 1: Context validation
    if (!context.tenantId) {
      return { isolated: false, reason: 'No tenant context available' };
    }

    // Step 2: Data validation
    if (!data || typeof data !== 'object') {
      return { isolated: false, reason: 'Invalid data object' };
    }

    const dataTenant = data[tenantField];

    // Step 3: Tenant field presence
    if (dataTenant === undefined || dataTenant === null) {
      return { isolated: false, reason: `Missing ${tenantField} in data` };
    }

    // Step 4: Strict tenant matching
    if (String(dataTenant) !== String(context.tenantId)) {
      this.auditLog.push({
        timestamp: new Date(),
        userId: context.userId,
        action: 'tenant_violation',
        resource: 'data_access',
        allowed: false,
        reason: `Tenant mismatch: expected ${context.tenantId}, got ${dataTenant}`,
      });

      return {
        isolated: false,
        reason: `Cross-tenant access denied: ${context.tenantId} -> ${dataTenant}`,
      };
    }

    return { isolated: true };
  }

  /**
   * Comprehensive authorization check
   */
  authorize(
    context: SecurityContext,
    resource: string,
    action: string,
    data?: any,
  ): { authorized: boolean; reason?: string } {
    const ruleKey = `${resource}:${action}`;
    const rule = this.authorizationRules.get(ruleKey);

    if (!rule) {
      // Default deny for undefined rules
      return { authorized: false, reason: `No authorization rule for ${ruleKey}` };
    }

    // Step 1: Role-based check
    if (rule.requiredRoles?.length) {
      const hasRole = rule.requiredRoles.some((role) => context.roles.includes(role));
      if (!hasRole) {
        return {
          authorized: false,
          reason: `Required roles: ${rule.requiredRoles.join(', ')}, user has: ${context.roles.join(', ')}`,
        };
      }
    }

    // Step 2: Permission-based check
    if (rule.requiredPermissions?.length) {
      const hasPermission = rule.requiredPermissions.some((perm) =>
        context.permissions.includes(perm),
      );
      if (!hasPermission) {
        return {
          authorized: false,
          reason: `Required permissions: ${rule.requiredPermissions.join(', ')}`,
        };
      }
    }

    // Step 3: Tenant isolation check
    if (rule.tenantIsolation && data) {
      const isolation = this.validateTenantIsolation(data, context);
      if (!isolation.isolated) {
        return { authorized: false, reason: isolation.reason };
      }
    }

    // Step 4: Custom validation
    if (rule.customValidator) {
      const customResult = rule.customValidator(context, data);
      if (!customResult) {
        return { authorized: false, reason: 'Custom validation failed' };
      }
    }

    // Log successful authorization
    this.auditLog.push({
      timestamp: new Date(),
      userId: context.userId,
      action,
      resource,
      allowed: true,
    });

    return { authorized: true };
  }

  /**
   * Sanitize data to prevent information leakage
   */
  sanitizeData(data: any, context: SecurityContext): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      // Remove sensitive fields based on context
      if (this.isSensitiveField(key, context)) {
        continue; // Skip sensitive field
      }

      // Recursively sanitize nested objects
      if (value && typeof value === 'object') {
        (sanitized as any)[key] = this.sanitizeData(value, context);
      } else {
        (sanitized as any)[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Validate dashboard permissions securely
   */
  validateDashboardAccess(
    dashboard: any,
    context: SecurityContext,
  ): { allowed: boolean; reason?: string } {
    if (!dashboard?.permissions) {
      return { allowed: false, reason: 'Dashboard has no permissions defined' };
    }

    // Admin override
    if (context.isAdmin) {
      return { allowed: true };
    }

    // Check if user has any of the required permissions
    const hasPermission = dashboard.permissions.some(
      (perm: string) => context.permissions.includes(perm) || context.roles.includes(perm),
    );

    if (!hasPermission) {
      return {
        allowed: false,
        reason: `Required permissions: ${dashboard.permissions.join(', ')}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Secure dashboard creation with permission validation
   */
  validateDashboardCreation(
    dashboardConfig: any,
    context: SecurityContext,
  ): { allowed: boolean; reason?: string; sanitizedConfig?: any } {
    // Step 1: Basic validation
    if (!dashboardConfig?.permissions) {
      return { allowed: false, reason: 'Dashboard must specify permissions' };
    }

    // Step 2: Permission escalation check
    const requestedPerms = dashboardConfig.permissions;
    const unauthorizedPerms = requestedPerms.filter(
      (perm: string) => !context.permissions.includes(perm) && !context.roles.includes(perm),
    );

    if (!context.isAdmin && unauthorizedPerms.length > 0) {
      return {
        allowed: false,
        reason: `Cannot assign unauthorized permissions: ${unauthorizedPerms.join(', ')}`,
      };
    }

    // Step 3: Sanitize configuration
    const sanitizedConfig = {
      ...dashboardConfig,
      created_by: context.userId, // Force correct creator
      permissions: context.isAdmin
        ? dashboardConfig.permissions
        : dashboardConfig.permissions.filter(
            (perm: string) => context.permissions.includes(perm) || context.roles.includes(perm),
          ),
    };

    return { allowed: true, sanitizedConfig };
  }

  /**
   * Get audit log for security monitoring
   */
  getAuditLog(filter?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    allowedOnly?: boolean;
  }): Array<{
    timestamp: Date;
    userId: string;
    action: string;
    resource: string;
    allowed: boolean;
    reason?: string;
  }> {
    let filtered = this.auditLog;

    if (filter?.userId) {
      filtered = filtered.filter((entry) => entry.userId === filter.userId);
    }

    if (filter?.action) {
      filtered = filtered.filter((entry) => entry.action === filter.action);
    }

    if (filter?.resource) {
      filtered = filtered.filter((entry) => entry.resource === filter.resource);
    }

    if (filter?.startDate) {
      filtered = filtered.filter((entry) => entry.timestamp >= filter.startDate!);
    }

    if (filter?.endDate) {
      filtered = filtered.filter((entry) => entry.timestamp <= filter.endDate!);
    }

    if (filter?.allowedOnly !== undefined) {
      filtered = filtered.filter((entry) => entry.allowed === filter.allowedOnly);
    }

    return filtered.slice(-1000); // Return last 1000 entries
  }

  // Private helper methods

  private initializeDefaultRules(): void {
    // Dashboard rules
    this.authorizationRules.set('dashboard:create', {
      resource: 'dashboard',
      action: 'create',
      requiredPermissions: ['dashboard_create'],
      customValidator: (context, data) => this.validateDashboardCreation(data, context).allowed,
    });

    this.authorizationRules.set('dashboard:read', {
      resource: 'dashboard',
      action: 'read',
      customValidator: (context, data) => this.validateDashboardAccess(data, context).allowed,
    });

    this.authorizationRules.set('dashboard:update', {
      resource: 'dashboard',
      action: 'update',
      requiredPermissions: ['dashboard_update'],
      customValidator: (context, data) => data.created_by === context.userId || context.isAdmin,
    });

    // Multi-tenant rules
    this.authorizationRules.set('data:read', {
      resource: 'data',
      action: 'read',
      tenantIsolation: true,
    });

    this.authorizationRules.set('data:write', {
      resource: 'data',
      action: 'write',
      tenantIsolation: true,
    });

    // License rules
    this.authorizationRules.set('license:validate', {
      resource: 'license',
      action: 'validate',
      requiredRoles: ['authenticated'],
    });
  }

  private initializeSensitiveFields(): void {
    this.sensitiveFields.add('password');
    this.sensitiveFields.add('secret');
    this.sensitiveFields.add('token');
    this.sensitiveFields.add('api_key');
    this.sensitiveFields.add('license_key');
    this.sensitiveFields.add('webhook_secret');
    this.sensitiveFields.add('private_key');
    this.sensitiveFields.add('encryption_key');
    this.sensitiveFields.add('session_id');
    this.sensitiveFields.add('ssn');
    this.sensitiveFields.add('credit_card');
    this.sensitiveFields.add('bank_account');
  }

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

  private isSensitiveField(fieldName: string, context: SecurityContext): boolean {
    const field = fieldName.toLowerCase();

    // Always sensitive fields
    if (this.sensitiveFields.has(field)) {
      return true;
    }

    // Context-sensitive fields
    if (!context.isAdmin) {
      const adminOnlyFields = ['created_by', 'admin_notes', 'internal_id'];
      if (adminOnlyFields.some((adminField) => field.includes(adminField))) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Global business security instance
 */
export const businessSecurity = new BusinessSecurity();

/**
 * Decorator for securing business logic methods
 */
export function secureBusinessLogic(
  resource: string,
  action: string,
  options?: { tenantIsolation?: boolean },
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (context: SecurityContext, ...args: any[]) {
      const auth = businessSecurity.authorize(
        context,
        resource,
        action,
        options?.tenantIsolation ? args[0] : undefined,
      );

      if (!auth.authorized) {
        throw new BusinessSecurityError(`Unauthorized access: ${auth.reason}`, 'authorization', {
          resource,
          action,
          userId: context.userId,
        });
      }

      return originalMethod.apply(this, [context, ...args]);
    };

    return descriptor;
  };
}
