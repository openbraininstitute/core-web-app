import { config } from '@/config';

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

type LogArgs = Parameters<
  typeof console.log | typeof console.error | typeof console.warn | typeof console.debug
>;

export function log(type: 'log' | 'error' | 'warn' | 'debug' | 'trace' | 'info', ...args: LogArgs) {
  if (config.DEPLOYMENT_ENV !== 'production') {
    // biome-ignore lint/suspicious/noConsole: Using console for logging is intentional here
    console[type](`${logColors[type]}${args[0]}${resetColor}`, ...args.slice(1), '\n');
  }
}

export function logError(...args: LogArgs) {
  log('error', ...args);
}

export function logWarn(...args: LogArgs) {
  log('warn', ...args);
}

export function logDebug(...args: LogArgs) {
  log('debug', ...args);
}

export function logTrace(...args: LogArgs) {
  log('trace', ...args);
}

export function logInfo(...args: LogArgs) {
  log('info', ...args);
}
