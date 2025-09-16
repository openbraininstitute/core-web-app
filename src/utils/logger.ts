import { env } from '@/env';

// add logs color to the logs
const logColors = {
  log: '\x1b[32m',
  error: '\x1b[31m',
  warn: '\x1b[33m',
  debug: '\x1b[34m',
  trace: '\x1b[35m',
  info: '\x1b[36m',
};
const resetColor = '\x1b[0m';

export function log(
  type: 'log' | 'error' | 'warn' | 'debug' | 'trace' | 'info',
  ...args: Parameters<
    typeof console.log | typeof console.error | typeof console.warn | typeof console.debug
  >
) {
  if (env.NEXT_PUBLIC_DEPLOYMENT_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console[type](`${logColors[type]}${args[0]}${resetColor}\n`, ...args.slice(1));
  }
}
