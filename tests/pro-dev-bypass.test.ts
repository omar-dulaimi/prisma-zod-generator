import { existsSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isProDevBypassEnabled } from '../src/license';

/**
 * The local Pro development bypass used to trigger on `NODE_ENV=development` or
 * `PZG_DEV_MODE=true` alone. Because the obfuscated Pro build ships to every
 * installer, that let anyone run paid features for free by setting one env var
 * and requiring an internal module directly — and `NODE_ENV=development` is set
 * by countless dev setups, so it could happen by accident.
 *
 * It now additionally requires a checkout of this repository with the private
 * `src/pro` submodule present, which an npm consumer never has.
 *
 * These assertions are environment-independent: the ones that must hold
 * everywhere do not depend on whether the submodule is checked out (it is
 * absent in plain CI and in forks).
 */
describe('Pro development bypass', () => {
  const saved = { devMode: process.env.PZG_DEV_MODE, nodeEnv: process.env.NODE_ENV };

  beforeEach(() => {
    delete process.env.PZG_DEV_MODE;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    if (saved.devMode === undefined) delete process.env.PZG_DEV_MODE;
    else process.env.PZG_DEV_MODE = saved.devMode;
    if (saved.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved.nodeEnv;
  });

  it('is off when nothing is set', () => {
    expect(isProDevBypassEnabled()).toBe(false);
  });

  it('is off for NODE_ENV=development alone', () => {
    // The regression that mattered: this used to unlock enterprise features.
    process.env.NODE_ENV = 'development';
    expect(isProDevBypassEnabled()).toBe(false);
  });

  it('is off for NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    expect(isProDevBypassEnabled()).toBe(false);
  });

  it('ignores a non-exact PZG_DEV_MODE value', () => {
    for (const value of ['1', 'yes', 'TRUE', '']) {
      process.env.PZG_DEV_MODE = value;
      expect(isProDevBypassEnabled(), `PZG_DEV_MODE=${value}`).toBe(false);
    }
  });

  it('requires the private submodule in addition to the opt-in', () => {
    process.env.PZG_DEV_MODE = 'true';

    // True only where `src/pro/.git` exists — a contributor checkout or the
    // release job, never an npm install. Asserting against the filesystem keeps
    // this correct in both environments.
    const hasProCheckout = existsSync(join(__dirname, '..', 'src', 'pro', '.git'));
    expect(isProDevBypassEnabled()).toBe(hasProCheckout);
  });
});
