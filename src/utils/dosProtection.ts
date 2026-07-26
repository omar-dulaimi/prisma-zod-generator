/**
 * Resource exhaustion error.
 *
 * This file was a 480-line DoS protection toolkit: a `DoSProtection` class with iteration,
 * recursion, memory, execution-time, regex, string, JSON and file-size guards, a rate
 * limiter, a `dosProtection` singleton, a `@dosProtect` decorator, and safeMap/safeFilter/
 * safeForEach/safeChunker wrappers.
 *
 * None of it was reachable. The singleton had no caller anywhere; the class was instantiated
 * only to create that singleton; the decorator and the safe* wrappers had no callers either.
 * The one live export was this error class, thrown by the Pro data-factories pack when a
 * schema exceeds its model limit — a check the pack performs itself. 36 of the file's 38
 * functions were uncovered, which is what made it worth looking at.
 *
 * Deleting the class also orphaned `utils/concurrency.ts`, whose surviving `RateLimiter` had
 * been kept solely for it; that file is gone too. So the guards described above are not
 * "temporarily untested" — they were never wired in, and nothing was protecting the
 * generator. If limits are wanted, they need enforcing at the points that consume schema
 * input, not reinstating here.
 */
export class ResourceExhaustionError extends Error {
  constructor(
    message: string,
    public readonly resourceType: string,
  ) {
    super(message);
    this.name = 'ResourceExhaustionError';
  }
}
