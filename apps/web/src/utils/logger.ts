import { config } from '@/config';

type LogArgs = Parameters<
  typeof console.log | typeof console.error | typeof console.warn | typeof console.debug
>;

export function log(type: 'log' | 'error' | 'warn' | 'debug' | 'trace' | 'info', ...args: LogArgs) {
  if (config.DEPLOYMENT_ENV !== 'production') {
    // biome-ignore lint/suspicious/noConsole: logger for dev/staging
    console[type](args[0], ...args.slice(1), '\n');
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
