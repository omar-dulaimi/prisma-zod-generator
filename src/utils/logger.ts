/**
 * Simple logger that hides debug logs unless explicitly enabled.
 *
 * Enable with one of:
 * - DEBUG_PRISMA_ZOD=1|true
 * - DEBUG=1|true
 * - DEBUG including the substring "prisma-zod" (e.g. DEBUG=prisma-zod)
 */
const rawDebug = (process.env.DEBUG_PRISMA_ZOD ?? process.env.DEBUG ?? '').toLowerCase();

function parseEnabled(val: string): boolean {
  if (!val) return false;
  if (val === '1' || val === 'true') return true;
  // Support namespaces like DEBUG=prisma-zod,prisma:* etc.
  return /(^|[,\s:*])(prisma[-_]?zod)([,\s:*]|$)/.test(val);
}

const enabled = parseEnabled(rawDebug);

export const logger = {
  debug: (...args: unknown[]) => {
    if (enabled) console.log(...args);
  },
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  isDebugEnabled: () => enabled,
};

export default logger;
