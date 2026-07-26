import { describe, expect, it } from 'vitest';
import { businessSecurity } from '../src/utils/businessSecurity';

/**
 * `validateFeatureAccess` is the gate `license.ts` consults before letting a paid feature
 * run, so every one of its deny paths is a place where a bug hands paid features away or
 * refuses a customer who paid. It had no test.
 *
 * It is deny-by-default, which is the right shape: an unrecognised feature name is refused
 * rather than allowed. That matters most for a typo in a new pack's key — the failure is a
 * visible refusal, not a silent unlock.
 */
describe('paid feature access gate', () => {
  /** What license.ts builds: a real userId and sessionId, no roles beyond authenticated. */
  const context = {
    userId: 'system',
    roles: ['authenticated'],
    permissions: [] as string[],
    sessionId: 'unknown',
    isAdmin: false,
  };

  const license = (over: Record<string, unknown> = {}) => ({
    plan: 'enterprise',
    status: 'active',
    validUntil: new Date(Date.now() + 86_400_000).toISOString(),
    ...over,
  });

  it('refuses when there is no licence at all', () => {
    const result = businessSecurity.validateFeatureAccess('policies', null, context);

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/no valid license/i);
  });

  it('refuses an unrecognised feature rather than allowing it', () => {
    // Deny-by-default. If this ever flips, a typo in a pack's key silently unlocks it.
    const result = businessSecurity.validateFeatureAccess(
      'not-a-real-pack',
      license() as never,
      context,
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/unknown feature/i);
  });

  it('allows a feature the plan covers', () => {
    const result = businessSecurity.validateFeatureAccess(
      'policies',
      license({ plan: 'professional' }) as never,
      context,
    );

    expect(result.allowed).toBe(true);
  });

  it('refuses a feature above the plan, naming what is needed and what is held', () => {
    // multi-tenant-kit is enterprise-only; a professional licence must be told which plan it
    // needs, or the refusal is unactionable.
    const result = businessSecurity.validateFeatureAccess(
      'multi-tenant-kit',
      license({ plan: 'professional' }) as never,
      context,
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('multi-tenant-kit');
    expect(result.reason).toMatch(/enterprise/i);
    expect(result.reason).toMatch(/professional/i);
  });

  it('quotes the lowest sufficient plan, not the highest listed one', () => {
    // policies accepts professional, business and enterprise. Telling a starter customer to
    // buy enterprise would be wrong.
    const result = businessSecurity.validateFeatureAccess(
      'policies',
      license({ plan: 'starter' }) as never,
      context,
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/professional/i);
    expect(result.reason).not.toMatch(/enterprise/i);
  });

  it('refuses a licence that is not active', () => {
    const result = businessSecurity.validateFeatureAccess(
      'policies',
      license({ status: 'cancelled' }) as never,
      context,
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/cancelled/);
  });

  it('refuses an expired licence even on the right plan', () => {
    const result = businessSecurity.validateFeatureAccess(
      'policies',
      license({ validUntil: new Date(Date.now() - 86_400_000).toISOString() }) as never,
      context,
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/expired/i);
  });

  it('honours valid_until when present, since the server sends that spelling', () => {
    const expired = businessSecurity.validateFeatureAccess(
      'policies',
      license({
        valid_until: new Date(Date.now() - 86_400_000),
        validUntil: new Date(Date.now() + 86_400_000).toISOString(),
      }) as never,
      context,
    );

    // The snake_case field wins, so a stale camelCase value cannot extend a dead licence.
    expect(expired.allowed).toBe(false);
    expect(expired.reason).toMatch(/expired/i);
  });

  it('refuses an incomplete security context', () => {
    for (const broken of [
      { ...context, userId: '' },
      { ...context, sessionId: '' },
      { ...context, roles: undefined as never },
      { ...context, permissions: undefined as never },
    ]) {
      const result = businessSecurity.validateFeatureAccess('policies', license() as never, broken);
      expect(result.allowed, JSON.stringify(broken)).toBe(false);
      expect(result.reason).toMatch(/security context/i);
    }
  });

  it('gates every pack it knows about behind at least one plan', () => {
    // A pack mapped to an empty plan list would be unreachable for every customer.
    const packs = [
      'policies',
      'server-actions',
      'sdk-publisher',
      'drift-guard',
      'contract-testing-pack',
      'postgres-rls-pack',
      'form-ux',
      'api-docs-pack',
      'multi-tenant-kit',
      'performance-pack',
      'data-factories',
    ];

    for (const pack of packs) {
      const result = businessSecurity.validateFeatureAccess(
        pack,
        license({ plan: 'enterprise' }) as never,
        context,
      );
      expect(result.allowed, `${pack} should be available on enterprise`).toBe(true);
    }
  });
});
